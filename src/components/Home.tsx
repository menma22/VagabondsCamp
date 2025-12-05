import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRecording } from '../contexts/RecordingContext';
import { useProjects } from '../contexts/ProjectContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { Settings as SettingsIcon, LogOut, Mic, Square, Plus, Calendar, Loader2, Trash2, Users, Folder, X, Check, Palette } from 'lucide-react';
import { Settings } from './Settings';
import { MeetingPage } from './MeetingPage';
import { Calendar as CalendarView } from './Calendar';
import { SpeakerManagement } from './SpeakerManagement';
import { ColorPicker } from './ColorPicker';

interface Meeting {
  id: string;
  title: string;
  created_at: string;
  transcript?: string;
  project_id?: string;
}

export function Home() {
  const { user, signOut } = useAuth();
  const { language, t } = useLanguage();
  const { isRecording, recordingTime, recordingMeetingId, startRecording, stopRecording } = useRecording();
  const { projects, selectedProjectId, setSelectedProjectId, createProject, deleteProject, updateProject } = useProjects();
  const [showSettings, setShowSettings] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showSpeakerManagement, setShowSpeakerManagement] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#3B82F6');
  const [editingProjectColor, setEditingProjectColor] = useState<string>('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [autoStartRecording, setAutoStartRecording] = useState(false);

  useEffect(() => {
    loadMeetings();
    loadApiKey();
  }, [user]);

  const loadApiKey = async () => {
    if (!user) {
      console.log('No user, cannot load API key');
      return;
    }

    try {
      console.log('Loading API key for user:', user.id);
      const { data, error } = await supabase
        .from('user_settings')
        .select('gemini_api_key')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Supabase error loading API key:', error);
        throw error;
      }

      if (data && data.gemini_api_key) {
        console.log('API key loaded successfully, length:', data.gemini_api_key.length);
        console.log('API key starts with:', data.gemini_api_key.substring(0, 10));
        setGeminiApiKey(data.gemini_api_key);
      } else {
        console.warn('No API key found in database');
      }
    } catch (error) {
      console.error('Error loading API key:', error);
    }
  };

  const loadMeetings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('id, title, created_at, transcript, project_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error('Error loading meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewMeeting = async () => {
    if (!user) return;

    try {
      const meetingData: any = {
        user_id: user.id,
        title: '',
      };

      if (selectedProjectId) {
        meetingData.project_id = selectedProjectId;
      }

      const { data: meeting, error } = await supabase
        .from('meetings')
        .insert(meetingData)
        .select()
        .single();

      if (error) throw error;
      setSelectedMeetingId(meeting.id);
      await loadMeetings();
    } catch (error) {
      console.error('Error creating meeting:', error);
      alert('会議の作成に失敗しました');
    }
  };

  const deleteMeeting = async (meetingId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('この会議を削除しますか？')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId);

      if (error) throw error;
      await loadMeetings();
    } catch (error) {
      console.error('Error deleting meeting:', error);
      alert('会議の削除に失敗しました');
    }
  };

  const startQuickRecording = async () => {
    if (!geminiApiKey) {
      alert(t('errors.apiKeyRequired'));
      setShowSettings(true);
      return;
    }

    try {
      const meetingData: any = {
        user_id: user?.id,
        title: `${t('home.newMeeting')} - ${new Date().toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US')}`,
      };

      if (selectedProjectId) {
        meetingData.project_id = selectedProjectId;
      }

      const { data: newMeeting, error } = await supabase
        .from('meetings')
        .insert(meetingData)
        .select()
        .single();

      if (error) throw error;

      setAutoStartRecording(true);
      setSelectedMeetingId(newMeeting.id);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert(t('home.startRecordingError'));
    }
  };

  const handleStopRecording = async () => {
    try {
      const segments = await stopRecording();
      // Pass the recording meeting ID so processRecording can update the correct record
      await processRecording(segments, recordingMeetingId || undefined);
    } catch (error) {
      console.error('Error stopping recording:', error);
      alert(t('home.stopRecordingError'));
    }
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const transcribeSegmentWithRetry = async (segmentBlob: Blob, segmentIndex: number, retryCount = 0): Promise<string> => {
    const maxRetries = 3;
    const baseDelay = 15000;

    try {
      const segmentSizeMB = segmentBlob.size / (1024 * 1024);
      console.log(`Transcribing segment ${segmentIndex + 1}, size: ${segmentSizeMB.toFixed(2)} MB, attempt ${retryCount + 1}`);

      if (segmentSizeMB > 20) {
        throw new Error(t('errors.segmentTooLarge', { index: segmentIndex + 1, size: segmentSizeMB.toFixed(2) }));
      }

      const reader = new FileReader();
      const base64Audio = await new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.split(',')[1]);
        };
        reader.readAsDataURL(segmentBlob);
      });

      console.log(`API call for segment ${segmentIndex + 1} - API key length: ${geminiApiKey.length}`);
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
      console.log(`API URL (without key): https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=...`);

      const transcriptionResponse = await fetch(apiUrl,
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
                  text: t('prompts.transcription')
                }
              ]
            }]
          })
        }
      );

      console.log(`Transcription response status: ${transcriptionResponse.status}`);

      if (!transcriptionResponse.ok) {
        const errorData = await transcriptionResponse.json().catch(() => null);
        const errorMsg = errorData?.error?.message || transcriptionResponse.statusText;
        const statusCode = transcriptionResponse.status;

        console.error(`API Error - Status: ${statusCode}, Message: ${errorMsg}`);
        console.error(`Full error data:`, JSON.stringify(errorData, null, 2));

        if (statusCode === 429 || statusCode === 503 || errorMsg.includes('overloaded') || errorMsg.includes('quota') || errorMsg.includes('rate limit') || errorMsg.includes('Resource has been exhausted') || errorMsg.includes('unavailable')) {
          if (retryCount < maxRetries) {
            const delay = baseDelay * Math.pow(2, retryCount);
            console.log(`Rate limit hit, retrying in ${delay / 1000} seconds... (attempt ${retryCount + 1}/${maxRetries})`);
            setProcessingStep(`レート制限により${delay / 1000}秒待機中... (${retryCount + 1}/${maxRetries})`);
            await sleep(delay);
            return transcribeSegmentWithRetry(segmentBlob, segmentIndex, retryCount + 1);
          } else {
            if (statusCode === 503) {
              throw new Error(t('errors.apiOverloaded'));
            } else {
              throw new Error(t('errors.rateLimit'));
            }
          }
        }

        throw new Error(t('errors.transcriptionFailed', { index: segmentIndex + 1, error: errorMsg }));
      }

      const transcriptionData = await transcriptionResponse.json();
      const text = transcriptionData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log(`Segment ${segmentIndex + 1} transcribed, length: ${text.length} characters`);
      return text;
    } catch (error) {
      console.error(`Transcription error for segment ${segmentIndex + 1}:`, error);
      if (retryCount < maxRetries && error instanceof Error &&
        (error.message.includes('overloaded') || error.message.includes('quota') || error.message.includes('rate limit') || error.message.includes('Resource has been exhausted'))) {
        const delay = baseDelay * Math.pow(2, retryCount);
        console.log(`Network/Rate error, retrying in ${delay / 1000} seconds...`);
        setProcessingStep(`エラー発生、${delay / 1000}秒後に再試行... (${retryCount + 1}/${maxRetries})`);
        await sleep(delay);
        return transcribeSegmentWithRetry(segmentBlob, segmentIndex, retryCount + 1);
      }
      throw error;
    }
  };

  const processRecording = async (segments: Blob[], meetingId?: string) => {
    setProcessing(true);

    let audioUrl: string | null = null;
    let audioSize: number | null = null;
    let tempMeetingId: string | null = meetingId || null;

    try {
      console.log('=== Starting processRecording ===');
      console.log('Current API key:', geminiApiKey ? `Set (length: ${geminiApiKey.length})` : 'NOT SET');
      console.log('API key starts with:', geminiApiKey ? geminiApiKey.substring(0, 10) : 'N/A');

      if (!geminiApiKey || geminiApiKey.trim() === '') {
        console.error('API key is missing or empty!');
        throw new Error(t('errors.apiKeyMissing'));
      }

      if (segments.length === 0) {
        throw new Error(t('errors.recordingEmpty'));
      }

      console.log(`Processing ${segments.length} segment(s)`);

      // Always save audio to Supabase Storage
      setProcessingStep(t('common.saving'));
      const audioUrls: string[] = [];
      const timestamp = Date.now();
      audioSize = 0;

      for (let i = 0; i < segments.length; i++) {
        const segmentBlob = segments[i];
        const audioFileName = `${user!.id}/${timestamp}_part${i + 1}.webm`;
        audioSize += segmentBlob.size;

        const { error: uploadError } = await supabase.storage
          .from('meeting-audio')
          .upload(audioFileName, segmentBlob);

        if (uploadError) {
          console.error(`Failed to upload segment ${i + 1}:`, uploadError);
          throw new Error(t('errors.uploadSegmentFailed', { index: i + 1, error: uploadError.message }));
        }
        audioUrls.push(audioFileName);
      }

      console.log('All segments saved successfully:', audioUrls);
      audioUrl = audioUrls.length === 1 ? audioUrls[0] : JSON.stringify(audioUrls);

      // Create or update meeting record with audio
      if (!meetingId) {
        // Create new meeting record
        // @ts-ignore
        const { data: tempMeeting, error: tempError } = await supabase
          .from('meetings')
          .insert({
            user_id: user!.id,
            title: `処理中 - ${new Date().toLocaleDateString('ja-JP')}`,
            transcript: '',
            formatted_minutes: '',
            audio_url: audioUrl,
            audio_size: audioSize,
            transcription_status: 'processing',
            project_id: selectedProjectId || undefined,
          })
          .select()
          .single();

        if (tempError) throw tempError;
        tempMeetingId = tempMeeting.id;
        setSelectedMeetingId(tempMeetingId);
        await loadMeetings();
      } else {
        // Update existing meeting record with audio info
        tempMeetingId = meetingId;
        console.log('Updating existing meeting with audio info:', meetingId);
        console.log('Audio URL:', audioUrl, 'Size:', audioSize);

        // @ts-ignore
        const { error: updateError } = await supabase
          .from('meetings')
          .update({
            audio_url: audioUrl,
            audio_size: audioSize,
            transcription_status: 'processing',
          })
          .eq('id', meetingId);

        if (updateError) {
          console.error('Failed to update meeting with audio info:', updateError);
          throw new Error(t('errors.updateMeetingFailed', { error: updateError.message }));
        }
        console.log('Meeting record updated with audio info:', meetingId);
        await loadMeetings();
      }

      let combinedTranscript = '';

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const segmentSizeMB = segment.size / (1024 * 1024);

        if (segment.size === 0) {
          console.warn(`Segment ${i + 1} is empty, skipping...`);
          continue;
        }

        // Gemini API rate limit: 15 requests per minute = 4 seconds minimum per request
        // Using 10 seconds to avoid service overload (503 errors)
        const waitTime = 10000;
        console.log(`Waiting ${waitTime / 1000} seconds before API call (rate limit: 15/min, avoiding 503)...`);
        setProcessingStep(`${t('common.processing')} (${i + 1}/${segments.length})`);
        await sleep(waitTime);

        setProcessingStep(`${t('common.processing')} (${t('meeting.part')} ${i + 1}/${segments.length})...`);
        console.log(`Processing segment ${i + 1}, size: ${segmentSizeMB.toFixed(2)} MB`);

        const segmentTranscript = await transcribeSegmentWithRetry(segment, i);

        if (segmentTranscript) {
          combinedTranscript += (i > 0 ? '\n\n' : '') + segmentTranscript;
        }
      }

      const transcript = combinedTranscript.trim();

      if (!transcript) {
        throw new Error(t('errors.transcriptionEmpty'));
      }

      // Wait before calling formatting API to respect rate limits and avoid 503 errors
      console.log('Waiting 10 seconds before formatting API call...');
      setProcessingStep(t('common.processing'));
      await sleep(10000);

      setProcessingStep(t('common.processing'));

      let formattingResponse;
      let formattingRetries = 0;
      const maxFormattingRetries = 3;

      while (formattingRetries < maxFormattingRetries) {
        try {
          formattingResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  parts: [{
                    text: t('prompts.minutes', { transcript })
                  }]
                }]
              })
            }
          );

          if (formattingResponse.ok) {
            break;
          }

          const errorData = await formattingResponse.json().catch(() => null);
          const errorMsg = errorData?.error?.message || formattingResponse.statusText;

          if (errorMsg.includes('overloaded') || errorMsg.includes('quota') || errorMsg.includes('rate limit')) {
            formattingRetries++;
            if (formattingRetries < maxFormattingRetries) {
              const delay = 10000 * Math.pow(2, formattingRetries - 1);
              console.log(`Formatting API overloaded, retrying in ${delay / 1000} seconds...`);
              setProcessingStep(`${t('common.processing')} (${formattingRetries}/${maxFormattingRetries})`);
              await sleep(delay);
              continue;
            }
          }

          throw new Error(t('errors.minutesGenerationFailed'));
        } catch (error) {
          if (formattingRetries < maxFormattingRetries - 1 && error instanceof Error &&
            (error.message.includes('overloaded') || error.message.includes('quota') || error.message.includes('rate limit'))) {
            formattingRetries++;
            const delay = 10000 * Math.pow(2, formattingRetries - 1);
            console.log(`Formatting error, retrying in ${delay / 1000} seconds...`);
            setProcessingStep(`${t('common.processing')} (${formattingRetries}/${maxFormattingRetries})`);
            await sleep(delay);
            continue;
          }
          throw error;
        }
      }

      if (!formattingResponse || !formattingResponse.ok) {
        throw new Error(t('errors.minutesGenerationFailed'));
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

      setProcessingStep(t('common.processing'));

      let title = `Meeting - ${new Date().toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US')}`;
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
            language: language,
          }),
        }
      );

      if (titleResponse.ok) {
        const titleData = await titleResponse.json();
        title = titleData.title || title;
      }

      setProcessingStep(t('common.saving'));

      const initialTodos = extractedTodos.map(todo => ({
        id: crypto.randomUUID(),
        text: todo,
        completed: false,
      }));

      const initialDecisions = extractedDecisions.map(decision => ({
        id: crypto.randomUUID(),
        text: decision,
      }));

      const initialSharedInfo = extractedSharedInfo.map(info => ({
        id: crypto.randomUUID(),
        text: info,
      }));

      // Update the temporary meeting with transcription results
      if (tempMeetingId) {
        const { error: updateError } = await supabase
          .from('meetings')
          .update({
            title,
            transcript,
            formatted_minutes: formattedMinutes,
            todos: initialTodos,
            decisions: initialDecisions,
            shared_information: initialSharedInfo,
            transcription_status: 'completed',
            transcription_error: null,
          })
          .eq('id', tempMeetingId);

        if (updateError) throw updateError;

        setSelectedMeetingId(tempMeetingId);
        await loadMeetings();
      }
    } catch (error) {
      console.error('Error processing recording:', error);
      const errorMessage = error instanceof Error ? error.message : t('errors.processingFailed');

      // Update meeting record with error status if we have a temp meeting
      if (tempMeetingId) {
        await supabase
          .from('meetings')
          .update({
            transcription_status: 'failed',
            transcription_error: errorMessage,
          })
          .eq('id', tempMeetingId);
        await loadMeetings();
      }

      alert(`エラー: ${errorMessage}`);
    } finally {
      setProcessing(false);
      setProcessingStep('');
    }
  };

  const retryTranscription = async (meetingId: string) => {
    try {
      const { data: meeting, error: fetchError } = await supabase
        .from('meetings')
        .select('audio_url')
        .eq('id', meetingId)
        .single();

      if (fetchError || !meeting?.audio_url) {
        throw new Error(t('home.noAudio'));
      }

      setProcessing(true);
      setProcessingStep(t('home.downloadingAudio'));

      let urls: string[] = [];
      try {
        if (meeting.audio_url.startsWith('[')) {
          urls = JSON.parse(meeting.audio_url);
        } else {
          urls = [meeting.audio_url];
        }
      } catch (e) {
        urls = [meeting.audio_url];
      }

      const segments: Blob[] = [];
      for (const url of urls) {
        const { data: audioData, error: downloadError } = await supabase.storage
          .from('meeting-audio')
          .download(url);

        if (downloadError || !audioData) {
          throw new Error(t('home.downloadAudioError'));
        }
        segments.push(audioData);
      }

      await processRecording(segments, meetingId);
    } catch (error) {
      console.error('Error retrying transcription:', error);
      const errorMessage = error instanceof Error ? error.message : t('home.retryError');
      alert(`Error: ${errorMessage}`);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (selectedMeetingId) {
    return (
      <MeetingPage
        meetingId={selectedMeetingId}
        onClose={() => {
          setSelectedMeetingId(null);
          setAutoStartRecording(false);
          loadMeetings();
        }}
        onRetryTranscription={retryTranscription}
        autoStartRecording={autoStartRecording}
      />
    );
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      await createProject(newProjectName.trim(), newProjectColor);
      setNewProjectName('');
      setNewProjectColor('#3B82F6');
      setShowProjectModal(false);
    } catch (error) {
      alert(t('home.projectCreateError'));
    }
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm(t('home.projectDeleteConfirm'))) {
      return;
    }

    try {
      await deleteProject(projectId);
    } catch (error) {
      alert(t('home.projectDeleteError'));
    }
  };

  const startEditingProject = (projectId: string, projectName: string, projectColor: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(projectId);
    setEditingProjectName(projectName);
    setEditingProjectColor(projectColor);
  };

  const saveProjectName = async (projectId: string) => {
    if (!editingProjectName.trim()) {
      setEditingProjectId(null);
      return;
    }

    try {
      await updateProject(projectId, editingProjectName.trim(), editingProjectColor);
      setEditingProjectId(null);
      setEditingProjectName('');
      setEditingProjectColor('');
    } catch (error) {
      alert(t('home.projectUpdateError'));
    }
  };

  const cancelEditingProject = () => {
    setEditingProjectId(null);
    setEditingProjectName('');
    setEditingProjectColor('');
  };

  const filteredMeetings = selectedProjectId
    ? meetings.filter(m => m.project_id === selectedProjectId)
    : meetings;

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-100 via-blue-100 to-cyan-200">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-12 backdrop-blur-sm bg-white/60 rounded-3xl p-6 shadow-lg border border-white/50">
          <div>
            <h1 className="text-5xl font-bold text-slate-900 mb-3 tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>Vagabonds Camp</h1>
            <p className="text-slate-600 text-lg">{user?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSpeakerManagement(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-cyan-400 via-cyan-500 to-blue-500 text-white rounded-2xl hover:from-cyan-500 hover:via-cyan-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105 font-medium"
            >
              <Users className="w-5 h-5" />
              話者管理
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-500 text-white rounded-2xl hover:from-blue-500 hover:via-blue-600 hover:to-indigo-600 transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105 font-medium"
            >
              <SettingsIcon className="w-5 h-5" />
              設定
            </button>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-orange-400 via-orange-500 to-pink-500 text-white rounded-2xl hover:from-orange-500 hover:via-orange-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105 font-medium"
            >
              <LogOut className="w-5 h-5" />
              ログアウト
            </button>
          </div>
        </div>

        {!geminiApiKey && (
          <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <SettingsIcon className="w-5 h-5 text-amber-600" />
              <div className="flex-1">
                <p className="text-amber-800 font-medium">Gemini APIキーが設定されていません</p>
                <p className="text-amber-700 text-sm">録音機能を使用するには、設定画面からAPIキーを登録してください。</p>
              </div>
              <button
                onClick={() => setShowSettings(true)}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition text-sm font-medium"
              >
                設定する
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin -mb-px">
          <button
            onClick={() => setSelectedProjectId(null)}
            className={`tab-smooth group flex items-center gap-2 px-6 py-3 transition-all duration-300 whitespace-nowrap relative ${selectedProjectId === null
              ? 'bg-white text-slate-900 font-bold shadow-md border-2 border-slate-200 border-b-0 translate-y-0.5 z-10'
              : 'bg-white/40 text-slate-600 hover:bg-white/60 border-2 border-white/30 border-b-white/30'
              }`}
          >
            <Folder className={`w-5 h-5 transition-all duration-300 ${selectedProjectId === null
              ? 'text-slate-700'
              : ''
              }`} />
            <span>すべての会議</span>
          </button>
          {projects.map((project) => (
            <div key={project.id} className="relative group">
              {editingProjectId === project.id ? (
                <div
                  className="tab-smooth tab-colored flex items-center gap-2 px-6 py-3 border-2 border-b-0 translate-y-0.5 z-10 text-white font-bold shadow-md"
                  style={{
                    backgroundColor: editingProjectColor,
                    borderColor: editingProjectColor,
                    borderBottomColor: 'transparent',
                    '--tab-color': editingProjectColor
                  } as React.CSSProperties & { '--tab-color': string }}
                >
                  <Folder className="w-5 h-5 text-white" />
                  <div className="flex flex-col gap-2 flex-1">
                    <input
                      type="text"
                      value={editingProjectName}
                      onChange={(e) => setEditingProjectName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveProjectName(project.id);
                        if (e.key === 'Escape') cancelEditingProject();
                      }}
                      className="flex-1 px-2 py-1 bg-white/95 border border-white/50 rounded text-slate-900 focus:ring-2 focus:ring-white focus:border-white outline-none min-w-[120px]"
                      autoFocus
                    />
                    <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border-2 border-slate-200 p-2 z-50">
                      <ColorPicker
                        selectedColor={editingProjectColor}
                        onColorSelect={setEditingProjectColor}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => saveProjectName(project.id)}
                    className="p-1 text-white hover:text-white/80 hover:scale-110 transition-transform"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={cancelEditingProject}
                    className="p-1 text-white/80 hover:text-white hover:scale-110 transition-transform"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setSelectedProjectId(project.id)}
                    className={`tab-smooth flex items-center gap-2 px-6 py-3 transition-all duration-300 whitespace-nowrap relative border-2 border-b-0 ${selectedProjectId === project.id
                      ? 'tab-colored text-white font-bold shadow-md translate-y-0.5 z-10'
                      : 'bg-white/40 text-slate-600 hover:bg-white/60 border-white/30 border-b-white/30'
                      }`}
                    style={selectedProjectId === project.id ? {
                      backgroundColor: project.color,
                      borderColor: project.color,
                      borderBottomColor: 'transparent',
                      '--tab-color': project.color
                    } as React.CSSProperties & { '--tab-color': string } : {}}
                  >
                    <Folder
                      className="w-5 h-5 transition-all duration-300"
                      style={selectedProjectId === project.id ? { color: 'white' } : { color: project.color }}
                    />
                    <span>{project.name}</span>
                  </button>
                  <button
                    onClick={(e) => startEditingProject(project.id, project.name, project.color, e)}
                    className="absolute -top-2 -right-10 p-1.5 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-xl backdrop-blur-sm border-2 border-white/30 z-20"
                    style={{ backgroundColor: project.color }}
                    aria-label={t('common.edit')}
                  >
                    <Palette className="w-3.5 h-3.5 drop-shadow-lg" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteProject(project.id, e)}
                    className="absolute -top-2 -right-2 p-1.5 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-xl backdrop-blur-sm border-2 border-white/30 z-20"
                    aria-label={t('common.delete')}
                  >
                    <X className="w-3.5 h-3.5 drop-shadow-lg" />
                  </button>
                </>
              )}
            </div>
          ))}
          <button
            onClick={() => setShowProjectModal(true)}
            className="tab-smooth group flex items-center justify-center p-3 bg-white/40 text-slate-600 hover:bg-white/60 transition-all duration-300 border-2 border-white/30 border-b-white/30 hover:shadow-md"
          >
            <Plus className="w-5 h-5 transition-all" />
          </button>
        </div>

        <div className="bg-white rounded-3xl rounded-tl-none shadow-2xl border-2 border-slate-200 p-8">
          <button
            onClick={createNewMeeting}
            className="w-full mb-10 group relative overflow-hidden bg-gradient-to-br from-cyan-400 via-cyan-500 to-blue-500 text-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-cyan-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center justify-center gap-4">
              <Plus className="w-8 h-8" />
              <span className="text-2xl font-bold">{t('home.createNewMeeting')}</span>
            </div>
          </button>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-slate-900" />
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="text-center py-20">
              <Calendar className="w-24 h-24 text-slate-300 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                {selectedProjectId ? t('home.noMeetingsInProject') : t('home.noMeetings')}
              </h3>
              <p className="text-slate-500 text-lg">
                {selectedProjectId ? t('home.createFirstMeetingInProject') : t('home.createFirstMeeting')}
              </p>
            </div>
          ) : (
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-orange-600 bg-clip-text text-transparent mb-8">
                {selectedProjectId ? projects.find(p => p.id === selectedProjectId)?.name || t('home.project') : t('home.allMeetings')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMeetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="relative group"
                  >
                    <button
                      onClick={() => setSelectedMeetingId(meeting.id)}
                      className="w-full text-left bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-white/50 hover:border-cyan-200 hover:scale-[1.03] group-hover:bg-white"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex-shrink-0">
                          <div className="bg-gradient-to-br from-cyan-400 via-blue-400 to-orange-400 p-3 rounded-2xl shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300">
                            <Calendar className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        <p className="text-base text-slate-700 font-medium">
                          {new Date(meeting.created_at).toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
                        <h3 className="font-bold text-slate-900 text-lg group-hover:bg-gradient-to-r group-hover:from-cyan-600 group-hover:to-blue-600 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300">
                          {meeting.title || t('meeting.untitled')}
                        </h3>
                      </div>
                    </button>
                    <button
                      onClick={(e) => deleteMeeting(meeting.id, e)}
                      className="absolute top-4 right-4 p-3 bg-white/90 backdrop-blur-sm rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-red-50 hover:text-red-600 hover:scale-110 border border-white"
                      aria-label={t('common.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showSettings && (
        <Settings
          onClose={() => {
            setShowSettings(false);
            loadApiKey();
          }}
        />
      )}

      {showSpeakerManagement && (
        <SpeakerManagement onClose={() => setShowSpeakerManagement(false)} />
      )}

      {showProjectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border-2 border-white/50">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">{t('home.newProject')}</h2>
              <button
                onClick={() => {
                  setShowProjectModal(false);
                  setNewProjectName('');
                }}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
              placeholder={t('home.projectNamePlaceholder')}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-cyan-500 focus:outline-none mb-4"
              autoFocus
            />
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Palette className="w-4 h-4 text-slate-600" />
                <label className="text-sm font-medium text-slate-700">{t('home.selectColor')}</label>
              </div>
              <ColorPicker
                selectedColor={newProjectColor}
                onColorSelect={setNewProjectColor}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowProjectModal(false);
                  setNewProjectName('');
                }}
                className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-br from-cyan-400 to-blue-500 text-white rounded-xl hover:from-cyan-500 hover:to-blue-600 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('common.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCalendar && (
        <CalendarView
          onClose={() => setShowCalendar(false)}
          onSelectMeeting={(meetingId) => setSelectedMeetingId(meetingId)}
        />
      )}

      <button
        onClick={() => setShowCalendar(true)}
        disabled={processing}
        className="fixed bottom-8 left-8 w-20 h-20 rounded-3xl shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-br from-cyan-400 via-blue-500 to-blue-600 hover:shadow-3xl border-2 border-white/30"
      >
        <Calendar className="w-10 h-10 text-white" />
      </button>

      <button
        onClick={isRecording ? handleStopRecording : startQuickRecording}
        disabled={processing}
        className={`fixed bottom-8 right-8 w-20 h-20 rounded-3xl shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-white/30 ${isRecording
          ? 'bg-gradient-to-br from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 animate-pulse shadow-red-500/50'
          : 'bg-gradient-to-br from-orange-400 via-orange-500 to-pink-500 hover:shadow-3xl'
          }`}
      >
        {processing ? (
          <Loader2 className="w-10 h-10 animate-spin text-white" />
        ) : isRecording ? (
          <Square className="w-10 h-10 text-white" />
        ) : (
          <Mic className="w-10 h-10 text-white" />
        )}
      </button>

      {isRecording && (
        <div className="fixed bottom-32 right-8 bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl p-5 border-2 border-white/50">
          <p className="text-2xl font-mono font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
            {formatTime(recordingTime)}
          </p>
        </div>
      )}

      {processing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-10 max-w-md w-full mx-4 shadow-2xl border-2 border-white/50">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-500 to-orange-400 rounded-full blur-2xl opacity-30 animate-pulse"></div>
              <Loader2 className="w-20 h-20 animate-spin mx-auto mb-6 relative" style={{ stroke: 'url(#gradient)' }} />
              <svg width="0" height="0">
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#22d3ee' }} />
                    <stop offset="50%" style={{ stopColor: '#3b82f6' }} />
                    <stop offset="100%" style={{ stopColor: '#fb923c' }} />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <p className="text-slate-900 font-bold text-2xl text-center mb-3">
              {processingStep || t('common.processing')}
            </p>
            <p className="text-slate-600 text-center text-lg">
              {t('home.processingWithGemini')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
