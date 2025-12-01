import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRecording } from '../contexts/RecordingContext';
import { supabase } from '../lib/supabase';
import { downloadAudioFromStorage } from '../lib/audioUpload';
import { markMeetingAsProcessing } from '../lib/meetingHelpers';
import { TranscriptionStatusCard } from './TranscriptionStatusCard';
import { AIChat } from './AIChat';
import { ActionItems } from './ActionItems';
import { DecisionItems } from './DecisionItems';
import { SharedInformation } from './SharedInformation';
import {
  ArrowLeft,
  Mic,
  Square,
  Loader2,
  Link as LinkIcon,
  FileText,

  Plus,
  Trash2,
  Folder,
} from 'lucide-react';

interface MeetingPageProps {
  meetingId: string;
  onClose: () => void;
  onRetryTranscription?: (meetingId: string) => Promise<void>;
}

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

interface DecisionItem {
  id: string;
  text: string;
}

interface SharedInfoItem {
  id: string;
  text: string;
  category?: string;
}

interface UrlItem {
  id: string;
  url: string;
  title: string;
}

interface MeetingData {
  title: string;
  transcript: string;
  formatted_minutes: string;
  notes: string;
  todos: TodoItem[];
  decisions: DecisionItem[];
  reference_urls: UrlItem[];
  shared_information: SharedInfoItem[];
  audio_url: string | null;
  audio_size: number | null;
  transcription_status: 'pending' | 'processing' | 'completed' | 'failed';
  transcription_error: string | null;
}

export function MeetingPage({ meetingId, onClose, onRetryTranscription }: MeetingPageProps) {
  const { user } = useAuth();
  const { isRecording, recordingTime, recordingMeetingId, startRecording, stopRecording } = useRecording();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [meeting, setMeeting] = useState<MeetingData>({
    title: '',
    transcript: '',
    formatted_minutes: '',
    notes: '',
    todos: [],
    decisions: [],
    reference_urls: [],
    shared_information: [],
    audio_url: null,
    audio_size: null,
    transcription_status: 'completed',
    transcription_error: null,
  });
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newUrlTitle, setNewUrlTitle] = useState('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isRecordingThisMeeting = isRecording && recordingMeetingId === meetingId;

  useEffect(() => {
    loadMeeting();
    loadApiKey();

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [meetingId]);

  useEffect(() => {
    if (!loading && meeting.title !== undefined) {
      debouncedSave();
    }
  }, [meeting.todos, meeting.decisions, meeting.shared_information, meeting.reference_urls, meeting.notes, meeting.title]);

  const loadApiKey = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('user_settings')
        .select('gemini_api_key')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setGeminiApiKey(data.gemini_api_key);
      }
    } catch (error) {
      console.error('Error loading API key:', error);
    }
  };

  const loadMeeting = async () => {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', meetingId)
        .single();

      if (error) throw error;

      console.log('Loaded meeting data:', data);
      console.log('Audio URL:', data.audio_url);

      setMeeting({
        title: data.title || '',
        transcript: data.transcript || '',
        formatted_minutes: data.formatted_minutes || '',
        notes: data.notes || '',
        todos: data.todos || [],
        decisions: data.decisions || [],
        reference_urls: data.reference_urls || [],
        shared_information: data.shared_information || [],
        audio_url: data.audio_url || null,
        audio_size: data.audio_size || null,
        transcription_status: data.transcription_status || 'completed',
        transcription_error: data.transcription_error || null,
      });
    } catch (error) {
      console.error('Error loading meeting:', error);
    } finally {
      setLoading(false);
    }
  };

  const debouncedSave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      await saveMeeting();
    }, 1000);
  };

  const saveMeeting = async (updates?: Partial<MeetingData>) => {
    setSaving(true);
    try {
      const dataToSave = updates ? { ...meeting, ...updates } : meeting;
      const { error } = await supabase
        .from('meetings')
        .update({
          title: dataToSave.title,
          notes: dataToSave.notes,
          todos: dataToSave.todos,
          decisions: dataToSave.decisions,
          shared_information: dataToSave.shared_information,
          reference_urls: dataToSave.reference_urls,
          updated_at: new Date().toISOString(),
        })
        .eq('id', meetingId);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving meeting:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateTitle = (title: string) => {
    setMeeting({ ...meeting, title });
  };

  const updateTodos = (todos: TodoItem[]) => {
    setMeeting({ ...meeting, todos });
  };

  const updateDecisions = (decisions: DecisionItem[]) => {
    setMeeting({ ...meeting, decisions });
  };

  const updateSharedInformation = (shared_information: SharedInfoItem[]) => {
    setMeeting({ ...meeting, shared_information });
  };

  const addUrl = () => {
    if (!newUrl.trim()) return;

    const urlItem: UrlItem = {
      id: Date.now().toString(),
      url: newUrl,
      title: newUrlTitle || newUrl,
    };

    setMeeting({ ...meeting, reference_urls: [...meeting.reference_urls, urlItem] });
    setNewUrl('');
    setNewUrlTitle('');
  };

  const deleteUrl = (id: string) => {
    const updatedUrls = meeting.reference_urls.filter((url) => url.id !== id);
    setMeeting({ ...meeting, reference_urls: updatedUrls });
  };

  const handleStartRecording = async () => {
    if (!geminiApiKey) {
      alert('Gemini APIキーを設定してください');
      return;
    }

    try {
      await startRecording(meetingId);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('録音の開始に失敗しました');
    }
  };

  const handleStopRecording = async () => {
    try {
      const segments = await stopRecording();
      await processRecording(segments);
    } catch (error) {
      console.error('Error stopping recording:', error);
      alert('録音の停止に失敗しました');
    }
  };

  const transcribeSegment = async (segmentBlob: Blob, segmentIndex: number): Promise<string> => {
    const segmentSizeMB = segmentBlob.size / (1024 * 1024);
    console.log(`Transcribing segment ${segmentIndex + 1}, size: ${segmentSizeMB.toFixed(2)} MB`);

    // Gemini APIの制限チェック（20MB程度が安全）
    if (segmentSizeMB > 20) {
      throw new Error(`セグメント${segmentIndex + 1}のサイズが大きすぎます（${segmentSizeMB.toFixed(2)} MB）。録音を短い時間で区切ってください。`);
    }

    const reader = new FileReader();
    const base64Audio = await new Promise<string>((resolve) => {
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]);
      };
      reader.readAsDataURL(segmentBlob);
    });

    const transcriptionResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: 'audio/webm',
                  data: base64Audio
                }
              },
              {
                text: 'この音声ファイルを日本語で文字起こししてください。話された内容をそのまま正確にテキスト化してください。'
              }
            ]
          }]
        })
      }
    );

    if (!transcriptionResponse.ok) {
      const errorData = await transcriptionResponse.json().catch(() => null);
      console.error('Transcription error:', errorData);
      const errorMsg = errorData?.error?.message || transcriptionResponse.statusText;
      throw new Error(`セグメント${segmentIndex + 1}の文字起こしに失敗しました: ${errorMsg}`);
    }

    const transcriptionData = await transcriptionResponse.json();
    const text = transcriptionData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log(`Segment ${segmentIndex + 1} transcribed, length: ${text.length} characters`);
    return text;
  };

  const processRecording = async (segments: Blob[]) => {
    setProcessing(true);

    try {
      if (!geminiApiKey || geminiApiKey.trim() === '') {
        throw new Error('Gemini APIキーが設定されていません。設定画面からAPIキーを登録してください。');
      }

      if (segments.length === 0) {
        throw new Error('録音データが空です。マイクの権限を確認してください。');
      }

      console.log(`Processing ${segments.length} segment(s)`);

      // Save audio to Supabase Storage
      setProcessingStep('音声ファイルを保存中...');
      const audioBlob = new Blob(segments, { type: 'audio/webm' });
      const audioSize = audioBlob.size;
      const audioFileName = `${user!.id}/${Date.now()}.webm`;

      console.log('Uploading audio to Storage:', audioFileName, 'Size:', (audioSize / (1024 * 1024)).toFixed(2), 'MB');

      const { error: uploadError } = await supabase.storage
        .from('meeting-audio')
        .upload(audioFileName, audioBlob);

      if (uploadError) {
        console.error('Failed to upload audio:', uploadError);
        throw new Error(`音声のアップロードに失敗しました: ${uploadError.message}`);
      }

      console.log('Audio saved successfully:', audioFileName);

      // Update meeting record with audio info
      const { error: updateError } = await supabase
        .from('meetings')
        .update({
          audio_url: audioFileName,
          audio_size: audioSize,
          transcription_status: 'processing',
        })
        .eq('id', meetingId);

      if (updateError) {
        console.error('Failed to update meeting with audio info:', updateError);
        throw new Error(`会議レコードの更新に失敗しました: ${updateError.message}`);
      }

      console.log('Meeting record updated with audio info');

      // Update local state to reflect the changes
      setMeeting({
        ...meeting,
        audio_url: audioFileName,
        audio_size: audioSize,
        transcription_status: 'processing',
      });



      let combinedTranscript = '';

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const segmentSizeMB = segment.size / (1024 * 1024);

        if (segment.size === 0) {
          console.warn(`Segment ${i + 1} is empty, skipping...`);
          continue;
        }

        setProcessingStep(`セグメント ${i + 1}/${segments.length} を文字起こし中...`);
        console.log(`Processing segment ${i + 1}, size: ${segmentSizeMB.toFixed(2)} MB`);

        const segmentTranscript = await transcribeSegment(segment, i);

        if (segmentTranscript) {
          combinedTranscript += (i > 0 ? '\n\n' : '') + segmentTranscript;
        }
      }

      const transcript = combinedTranscript.trim();

      if (!transcript) {
        throw new Error('文字起こし結果が空です。音声が録音されていない可能性があります。');
      }

      setProcessingStep('議事録を作成中...');

      const formattingResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `以下の文字起こしを構造的に整理され、全ての内容をキャッチアップした、その会話内容に最も最適な議事録に変換してください。

必須フォーマット：
1. 目次（見出しへのリンク付き）
2. 内容（複数の見出しで構造化）

マークダウン形式で以下の構造に従ってください、目次と概要は必須項目です。その他の項目は適切なものを自分で考えてください：

## 目次
- [概要](#概要)必須項目
-
-


## 概要
（ここに概要を記載）

##

##

注意事項：
- 会話内容はすべて漏らさず記載してください
- 見出しは必ず ## （h2）を使用してください
- 目次のリンクは必ず # で始まる見出しIDと一致させてください


次に、以下の3つの情報をJSON形式で抽出してください：

1. 決定事項（会議で決まったこと、合意された事項、結論）
2. TODOリスト（今後やるべきタスク、アクションアイテム）
3. 重要な情報共有（新しい知識や事実、問題や課題、参考になる情報）

議事録の後に、以下のフォーマットで出力してください：

---DECISIONS---
["決定事項1", "決定事項2", "決定事項3"]
---END_DECISIONS---

---TODO_LIST---
["タスク1", "タスク2", "タスク3"]
---END_TODO_LIST---

---SHARED_INFO---
["情報1", "情報2", "情報3"]
---END_SHARED_INFO---

注意事項：
-重要な情報共有にはTODOと同じ内容は含めないでください。

文字起こし：

${transcript}`,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!formattingResponse.ok) {
        throw new Error('議事録の生成に失敗しました');
      }

      const formattingData = await formattingResponse.json();
      let formattedMinutes = formattingData.candidates?.[0]?.content?.parts?.[0]?.text || '';

      const decisionsMatch = formattedMinutes.match(/---DECISIONS---(.*?)---END_DECISIONS---/s);
      let extractedDecisions: string[] = [];

      if (decisionsMatch) {
        try {
          extractedDecisions = JSON.parse(decisionsMatch[1].trim());
          formattedMinutes = formattedMinutes.replace(/---DECISIONS---(.*?)---END_DECISIONS---/s, '').trim();
        } catch (e) {
          console.error('Failed to parse decisions:', e);
        }
      }

      const todoMatch = formattedMinutes.match(/---TODO_LIST---(.*?)---END_TODO_LIST---/s);
      let extractedTodos: string[] = [];

      if (todoMatch) {
        try {
          extractedTodos = JSON.parse(todoMatch[1].trim());
          formattedMinutes = formattedMinutes.replace(/---TODO_LIST---(.*?)---END_TODO_LIST---/s, '').trim();
        } catch (e) {
          console.error('Failed to parse TODOs:', e);
        }
      }

      const sharedInfoMatch = formattedMinutes.match(/---SHARED_INFO---(.*?)---END_SHARED_INFO---/s);
      let extractedSharedInfo: string[] = [];

      if (sharedInfoMatch) {
        try {
          extractedSharedInfo = JSON.parse(sharedInfoMatch[1].trim());
          formattedMinutes = formattedMinutes.replace(/---SHARED_INFO---(.*?)---END_SHARED_INFO---/s, '').trim();
        } catch (e) {
          console.error('Failed to parse shared information:', e);
        }
      }

      setProcessingStep('タイトル生成中...');

      let title = meeting.title || `会議 - ${new Date().toLocaleDateString('ja-JP')}`;
      const titleResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-meeting-title`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: formattedMinutes,
            apiKey: geminiApiKey,
          }),
        }
      );

      if (titleResponse.ok) {
        const titleData = await titleResponse.json();
        title = titleData.title || title;
      }

      setProcessingStep('保存中...');

      const { error } = await supabase
        .from('meetings')
        .update({
          title,
          transcript,
          formatted_minutes: formattedMinutes,
          transcription_status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', meetingId);

      if (error) throw error;

      const newDecisions: DecisionItem[] = extractedDecisions.map(decision => ({
        id: crypto.randomUUID(),
        text: decision,
      }));

      const newTodos: TodoItem[] = extractedTodos.map(todo => ({
        id: crypto.randomUUID(),
        text: todo,
        completed: false,
      }));

      const newSharedInfo: SharedInfoItem[] = extractedSharedInfo.map(info => ({
        id: crypto.randomUUID(),
        text: info,
      }));

      setMeeting({
        ...meeting,
        title,
        transcript,
        formatted_minutes: formattedMinutes,
        decisions: [...meeting.decisions, ...newDecisions],
        todos: [...meeting.todos, ...newTodos],
        shared_information: [...meeting.shared_information, ...newSharedInfo],
        transcription_status: 'completed',
        // Preserve audio_url and audio_size from earlier upload
      });

      if (newDecisions.length > 0 || newTodos.length > 0 || newSharedInfo.length > 0) {
        await saveMeeting({
          decisions: [...meeting.decisions, ...newDecisions],
          todos: [...meeting.todos, ...newTodos],
          shared_information: [...meeting.shared_information, ...newSharedInfo]
        });
      }
    } catch (error) {
      console.error('Error processing recording:', error);
      const errorMessage = error instanceof Error ? error.message : '録音の処理に失敗しました。APIキーを確認してください。';
      alert(`エラー: ${errorMessage}`);
    } finally {
      setProcessing(false);
      setProcessingStep('');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-slate-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm border border-slate-200 hover:shadow-md"
          >
            <ArrowLeft className="w-5 h-5" />
            戻る
          </button>
          <input
            type="text"
            value={meeting.title}
            onChange={(e) => updateTitle(e.target.value)}
            className="flex-1 text-3xl font-bold text-slate-900 bg-transparent border-b-2 border-transparent hover:border-slate-300 focus:border-slate-900 outline-none transition px-2 py-1"
            placeholder="会議のタイトル"
          />
          {saving && (
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              保存中...
            </div>
          )}
        </div>

        {meeting.audio_url && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${meeting.transcription_status === 'completed' ? 'bg-green-100' :
                  meeting.transcription_status === 'failed' ? 'bg-red-100' :
                    'bg-blue-100'
                  }`}>
                  <Mic className={`w-5 h-5 ${meeting.transcription_status === 'completed' ? 'text-green-600' :
                    meeting.transcription_status === 'failed' ? 'text-red-600' :
                      'text-blue-600'
                    }`} />
                </div>
                <div>
                  <div className="font-medium text-slate-900">
                    音声データ: {meeting.audio_size ? `${(meeting.audio_size / (1024 * 1024)).toFixed(2)} MB` : '不明'}
                  </div>
                  <div className={`text-sm ${meeting.transcription_status === 'completed' ? 'text-green-600' :
                    meeting.transcription_status === 'failed' ? 'text-red-600' :
                      'text-blue-600'
                    }`}>
                    {meeting.transcription_status === 'completed' && '文字起こし完了'}
                    {meeting.transcription_status === 'failed' && `文字起こし失敗: ${meeting.transcription_error || '不明なエラー'}`}
                    {meeting.transcription_status === 'processing' && '処理中...'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    try {
                      const { data } = supabase.storage
                        .from('meeting-audio')
                        .getPublicUrl(meeting.audio_url!);

                      const response = await fetch(data.publicUrl);
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `meeting-audio-${meetingId}.webm`;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                    } catch (error) {
                      console.error('Download failed:', error);
                      alert('音声ファイルのダウンロードに失敗しました');
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  ダウンロード
                </button>
                {meeting.transcription_status === 'failed' && onRetryTranscription && (
                  <button
                    onClick={() => onRetryTranscription(meetingId)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <Loader2 className="w-4 h-4" />
                    再試行
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <ActionItems items={meeting.todos} onUpdate={updateTodos} />

          <div className="relative bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500 rounded-2xl shadow-lg p-6 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.3),transparent_50%),radial-gradient(circle_at_70%_70%,rgba(255,255,255,0.2),transparent_50%)] pointer-events-none"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-white/30 backdrop-blur-sm p-3 rounded-xl">
                  <LinkIcon className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">参考URL</h2>
              </div>

              <div className="space-y-2 mb-4">
                <input
                  type="text"
                  value={newUrlTitle}
                  onChange={(e) => setNewUrlTitle(e.target.value)}
                  placeholder="タイトル（任意）"
                  className="w-full px-4 py-2 bg-white/90 backdrop-blur-sm border-0 rounded-lg focus:ring-2 focus:ring-white/50 outline-none placeholder:text-slate-400"
                />
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addUrl()}
                    placeholder="https://..."
                    className="flex-1 px-4 py-2 bg-white/90 backdrop-blur-sm border-0 rounded-lg focus:ring-2 focus:ring-white/50 outline-none placeholder:text-slate-400"
                  />
                  <button
                    onClick={addUrl}
                    className="px-4 py-2 bg-white/30 backdrop-blur-sm text-white rounded-lg hover:bg-white/40 transition"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {meeting.reference_urls.length === 0 ? (
                  <p className="text-white/80 text-center py-8">まだURLがありません</p>
                ) : (
                  meeting.reference_urls.map((urlItem) => (
                    <div
                      key={urlItem.id}
                      className="flex items-center gap-3 p-3 bg-white/30 backdrop-blur-sm rounded-lg hover:bg-white/40 transition"
                    >
                      <LinkIcon className="w-4 h-4 text-white/70 flex-shrink-0" />
                      <a
                        href={urlItem.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-white font-medium hover:text-white/80 truncate"
                      >
                        {urlItem.title}
                      </a>
                      <button
                        onClick={() => deleteUrl(urlItem.id)}
                        className="text-white/70 hover:text-white transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <DecisionItems items={meeting.decisions} onUpdate={updateDecisions} />
        </div>



        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Left Column: Recording UI */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-slate-900 p-2 rounded-lg">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">録音</h2>
            </div>

            <div className="flex flex-col items-center justify-center py-8 bg-slate-50 rounded-xl h-[300px]">
              {isRecordingThisMeeting ? (
                <>
                  <div className="relative mb-4">
                    <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                      <Mic className="w-10 h-10 text-white" />
                    </div>
                  </div>
                  <div className="text-3xl font-mono font-bold text-slate-900 mb-4">
                    {formatTime(recordingTime)}
                  </div>
                  <button
                    onClick={handleStopRecording}
                    className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
                  >
                    <Square className="w-5 h-5" />
                    録音を停止
                  </button>
                </>
              ) : processing ? (
                <>
                  <Loader2 className="w-12 h-12 animate-spin text-slate-900 mb-4" />
                  <p className="text-slate-700 font-medium">{processingStep || '処理中...'}</p>
                </>
              ) : isRecording ? (
                <>
                  <div className="w-20 h-20 bg-amber-500 rounded-full flex items-center justify-center mb-4">
                    <Mic className="w-10 h-10 text-white" />
                  </div>
                  <p className="text-slate-700 font-medium mb-4">別の会議を録音中です</p>
                  <button
                    disabled
                    className="flex items-center gap-2 px-6 py-3 bg-slate-400 text-white rounded-lg font-medium cursor-not-allowed"
                  >
                    <Mic className="w-5 h-5" />
                    録音中
                  </button>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-4">
                    <Mic className="w-10 h-10 text-white" />
                  </div>
                  <button
                    onClick={handleStartRecording}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition"
                  >
                    <Mic className="w-5 h-5" />
                    録音を開始
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right Column: Audio File List */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-500 p-2 rounded-lg">
                <Folder className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">音声データ</h2>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 h-[300px] overflow-y-auto custom-scrollbar">
              {/* Debug Info */}
              <div className="mb-4 p-2 bg-gray-200 text-xs rounded font-mono text-slate-600">
                Debug: Audio URL = {meeting.audio_url ? meeting.audio_url : 'NULL'}
                <br />
                Status = {meeting.transcription_status}
              </div>

              {meeting.audio_url ? (
                <div className="space-y-4">
                  <TranscriptionStatusCard
                    status={meeting.transcription_status}
                    audioUrl={meeting.audio_url}
                    audioSize={meeting.audio_size}
                    error={meeting.transcription_error}
                    onRetry={async () => {
                      if (!confirm('この会議の文字起こしを再試行しますか？')) {
                        return;
                      }

                      try {
                        // Mark meeting as processing
                        await markMeetingAsProcessing(meetingId);

                        // Reload meeting data to show processing status
                        await loadMeeting();

                        alert('再試行を開始しました。処理が完了するまでお待ちください。\n\n注意: 現在、再試行機能は手動で音声を再アップロードして処理する必要があります。完全な自動再試行機能は今後のアップデートで追加されます。');
                      } catch (error) {
                        console.error('Error retrying transcription:', error);
                        alert('再試行の開始に失敗しました');
                      }
                    }}
                    onDownload={async () => {
                      try {
                        const audioBlob = await downloadAudioFromStorage(meeting.audio_url!);
                        const url = URL.createObjectURL(audioBlob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `meeting_audio_${meetingId}.webm`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      } catch (error) {
                        console.error('Error downloading audio:', error);
                        alert('音声のダウンロードに失敗しました');
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Mic className="w-12 h-12 mb-3 opacity-20" />
                  <p>録音データはありません</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <SharedInformation items={meeting.shared_information} onUpdate={updateSharedInformation} />
        </div>

        {meeting.formatted_minutes && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-slate-900 p-2 rounded-lg">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">議事録</h2>
            </div>

            <div className="prose prose-slate max-w-none">
              <div className="text-slate-700 text-lg leading-relaxed space-y-4">
                {meeting.formatted_minutes.split('\n').map((line, index) => {
                  const renderTextWithBoldAndLinks = (text: string) => {
                    // マークダウンリンク [テキスト](#id) を処理
                    const linkPattern = /\[([^\]]+)\]\(#([^)]+)\)/g;
                    const parts: (string | JSX.Element)[] = [];
                    let lastIndex = 0;
                    let match;

                    while ((match = linkPattern.exec(text)) !== null) {
                      // リンクの前のテキスト
                      if (match.index > lastIndex) {
                        const beforeText = text.slice(lastIndex, match.index);
                        parts.push(...renderBold(beforeText));
                      }

                      // リンク要素
                      const linkText = match[1];
                      const linkId = match[2];
                      parts.push(
                        <a
                          key={`link-${match.index}`}
                          href={`#${linkId}`}
                          className="text-slate-900 hover:text-slate-600 font-medium underline decoration-slate-300 hover:decoration-slate-500 transition"
                          onClick={(e) => {
                            e.preventDefault();
                            const element = document.getElementById(linkId);
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                          }}
                        >
                          {linkText}
                        </a>
                      );

                      lastIndex = match.index + match[0].length;
                    }

                    // 残りのテキスト
                    if (lastIndex < text.length) {
                      parts.push(...renderBold(text.slice(lastIndex)));
                    }

                    return parts.length > 0 ? parts : renderBold(text);
                  };

                  const renderBold = (text: string) => {
                    const parts = text.split(/(\*\*.*?\*\*)/g);
                    return parts.map((part, i) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={`bold-${i}`}>{part.slice(2, -2)}</strong>;
                      }
                      return part;
                    });
                  };

                  if (line.trim().startsWith('#')) {
                    const headingLevel = line.match(/^#+/)?.[0].length || 1;
                    const text = line.replace(/^#+\s*/, '');
                    const headingId = text.trim();

                    if (headingLevel === 1) {
                      return (
                        <h1 key={index} id={headingId} className="text-3xl font-bold text-slate-900 mb-4 mt-6 scroll-mt-24">
                          {renderBold(text)}
                        </h1>
                      );
                    } else if (headingLevel === 2) {
                      return (
                        <h2 key={index} id={headingId} className="text-2xl font-bold text-slate-900 mb-3 mt-5 scroll-mt-24">
                          {renderBold(text)}
                        </h2>
                      );
                    } else if (headingLevel === 3) {
                      return (
                        <h3 key={index} id={headingId} className="text-xl font-bold text-slate-900 mb-2 mt-4 scroll-mt-24">
                          {renderBold(text)}
                        </h3>
                      );
                    } else {
                      return (
                        <h4 key={index} id={headingId} className="text-lg font-bold text-slate-900 mb-2 mt-3 scroll-mt-24">
                          {renderBold(text)}
                        </h4>
                      );
                    }
                  }

                  if (line.trim() === '') {
                    return <div key={index} className="h-2" />;
                  }

                  return (
                    <p key={index} className="text-slate-700">
                      {renderTextWithBoldAndLinks(line)}
                    </p>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {meeting.transcript && (
          <AIChat transcript={meeting.transcript} geminiApiKey={geminiApiKey} />
        )}
      </div>
    </div>
  );
}
