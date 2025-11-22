import { useState, useEffect, useRef } from 'react';
import { Users, Plus, Trash2, Mic, Square, Loader2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Speaker {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

interface SpeakerManagementProps {
  onClose: () => void;
}

const SPEAKER_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

export function SpeakerManagement({ onClose }: SpeakerManagementProps) {
  const { user } = useAuth();
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSpeakerName, setNewSpeakerName] = useState('');
  const [selectedColor, setSelectedColor] = useState(SPEAKER_COLORS[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingFor, setRecordingFor] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadSpeakers();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const loadSpeakers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('speakers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSpeakers(data || []);
    } catch (error) {
      console.error('Error loading speakers:', error);
      setMessage({ type: 'error', text: '話者の読み込みに失敗しました' });
    } finally {
      setLoading(false);
    }
  };

  const addSpeaker = async () => {
    if (!user || !newSpeakerName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('speakers')
        .insert({
          user_id: user.id,
          name: newSpeakerName.trim(),
          color: selectedColor,
        })
        .select()
        .single();

      if (error) throw error;

      setSpeakers([data, ...speakers]);
      setNewSpeakerName('');
      setSelectedColor(SPEAKER_COLORS[0]);
      setMessage({ type: 'success', text: '話者を追加しました' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error adding speaker:', error);
      setMessage({ type: 'error', text: '話者の追加に失敗しました' });
    }
  };

  const deleteSpeaker = async (speakerId: string) => {
    if (!confirm('この話者を削除しますか？')) return;

    try {
      const { error } = await supabase
        .from('speakers')
        .delete()
        .eq('id', speakerId);

      if (error) throw error;

      setSpeakers(speakers.filter(s => s.id !== speakerId));
      setMessage({ type: 'success', text: '話者を削除しました' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error deleting speaker:', error);
      setMessage({ type: 'error', text: '話者の削除に失敗しました' });
    }
  };

  const startRecording = async (speakerId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
        await registerSpeakerVoice(speakerId, audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingFor(speakerId);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      setMessage({ type: 'error', text: 'マイクへのアクセスに失敗しました' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingFor(null);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const registerSpeakerVoice = async (speakerId: string, audioBlob: Blob) => {
    try {
      setMessage({ type: 'success', text: '音声を登録中...' });

      // Upload audio to Supabase Storage
      const fileName = `${user?.id}/${speakerId}/${Date.now()}.wav`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('speaker-voices')
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('speaker-voices')
        .getPublicUrl(fileName);

      // Call Edge Function to process speaker registration
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-speaker-recognition`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audioUrl: urlData.publicUrl,
            meetingId: '',
            action: 'register',
            speakerId: speakerId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('音声登録に失敗しました');
      }

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: '音声を登録しました！' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error(result.error || '音声登録に失敗しました');
      }
    } catch (error) {
      console.error('Error registering voice:', error);
      setMessage({ type: 'error', text: '音声登録に失敗しました' });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">話者管理</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {message && (
          <div
            className={`px-4 py-3 rounded-lg text-sm mb-4 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-600'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-sm font-medium text-slate-700 mb-3">新しい話者を追加</h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newSpeakerName}
              onChange={(e) => setNewSpeakerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSpeaker()}
              placeholder="話者名（例：山田太郎）"
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
            />
            <button
              onClick={addSpeaker}
              disabled={!newSpeakerName.trim()}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">カラー:</span>
            <div className="flex gap-2">
              {SPEAKER_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-6 h-6 rounded-full transition ${
                    selectedColor === color ? 'ring-2 ring-slate-900 ring-offset-2' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-3">登録済み話者</h3>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : speakers.length === 0 ? (
            <p className="text-slate-500 text-center py-8">まだ話者が登録されていません</p>
          ) : (
            <div className="space-y-3">
              {speakers.map(speaker => (
                <div
                  key={speaker.id}
                  className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: speaker.color }}
                  >
                    {speaker.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{speaker.name}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(speaker.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isRecording && recordingFor === speaker.id ? (
                      <button
                        onClick={stopRecording}
                        className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                      >
                        <Square className="w-4 h-4" />
                        <span className="text-sm">{formatTime(recordingTime)}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => startRecording(speaker.id)}
                        disabled={isRecording}
                        className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        title="音声を登録"
                      >
                        <Mic className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteSpeaker(speaker.id)}
                      className="text-slate-400 hover:text-red-600 transition"
                      title="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            <strong>使い方:</strong> 話者を追加後、マイクボタンで3〜5秒程度の音声サンプルを録音してください。
            録音された音声は話者認識に使用されます。
          </p>
        </div>
      </div>
    </div>
  );
}
