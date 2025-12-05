import { createContext, useContext, useRef, useState, ReactNode } from 'react';

// 録音モードの型定義
export type RecordingMode = 'microphone' | 'system' | 'both';

interface RecordingContextType {
  isRecording: boolean;
  recordingTime: number;
  recordingMeetingId: string | null;
  recordingMode: RecordingMode;
  startRecording: (meetingId: string, mode?: RecordingMode, onAutoStop?: () => void) => Promise<void>;
  stopRecording: () => Promise<Blob[]>;
  getRecordingState: () => { isRecording: boolean; recordingTime: number; meetingId: string | null };
}

const RecordingContext = createContext<RecordingContextType | undefined>(undefined);

export function RecordingProvider({ children }: { children: ReactNode }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingMeetingId, setRecordingMeetingId] = useState<string | null>(null);
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('microphone');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const segmentsRef = useRef<Blob[]>([]);
  const segmentTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSoundTimeRef = useRef<number>(Date.now());
  const autoStopCallbackRef = useRef<(() => void) | null>(null);

  const saveCurrentSegment = () => {
    if (chunksRef.current.length > 0) {
      const segmentBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      segmentsRef.current.push(segmentBlob);
      chunksRef.current = [];
    }
  };

  const startNewSegment = async () => {
    if (!mediaRecorderRef.current || !streamRef.current) return;

    saveCurrentSegment();
    mediaRecorderRef.current.stop();
    await new Promise(resolve => setTimeout(resolve, 100));

    const newRecorder = new MediaRecorder(streamRef.current);
    mediaRecorderRef.current = newRecorder;

    newRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    // 1秒ごとにデータを収集（timeslice）
    newRecorder.start(1000);
  };

  const checkAudioLevel = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const threshold = 5;

    if (average > threshold) {
      lastSoundTimeRef.current = Date.now();
    } else {
      const silenceDuration = Date.now() - lastSoundTimeRef.current;
      const maxSilence = 10 * 60 * 1000;

      if (silenceDuration > maxSilence) {
        console.log('10分間無音が続いたため、録音を自動停止します');
        if (autoStopCallbackRef.current) {
          autoStopCallbackRef.current();
        }
      }
    }
  };

  const startRecording = async (
    meetingId: string,
    mode: RecordingMode = 'both',
    onAutoStop?: () => void
  ) => {
    if (isRecording) {
      throw new Error('すでに録音中です');
    }

    try {
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const destination = audioContext.createMediaStreamDestination();

      // マイク入力を取得（microphoneまたはbothモード）
      if (mode === 'microphone' || mode === 'both') {
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        const micSource = audioContext.createMediaStreamSource(micStream);
        micSource.connect(destination);

        // マイクストリームを保持（後でstopするため）
        if (mode === 'microphone') {
          streamRef.current = micStream;
        } else {
          // bothモードの場合、マイクストリームも保持
          displayStreamRef.current = micStream;
        }
      }

      // システム音声を取得（systemまたはbothモード）
      if (mode === 'system' || mode === 'both') {
        try {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: { width: 1, height: 1 }, // ビデオは最小サイズ
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false
            }
          });

          const audioTracks = displayStream.getAudioTracks();

          if (audioTracks.length > 0) {
            const systemAudioStream = new MediaStream([audioTracks[0]]);
            const systemSource = audioContext.createMediaStreamSource(systemAudioStream);
            systemSource.connect(destination);
            console.log('システム音声を取得しました');
          } else {
            console.warn('システム音声が選択されていません');
            // ビデオトラックを停止
            displayStream.getVideoTracks().forEach(track => track.stop());
            throw new Error('SYSTEM_AUDIO_MISSING');
          }

          // ビデオトラックを停止（不要なので）
          displayStream.getVideoTracks().forEach(track => track.stop());

          // displayStreamを保持
          if (mode === 'system') {
            streamRef.current = displayStream;
          } else {
            // bothモードの場合、両方を合わせる
            if (displayStreamRef.current) {
              // マイクとシステム音声を統合したストリームを作成
              const combinedTracks = [
                ...displayStreamRef.current.getAudioTracks(),
                ...displayStream.getAudioTracks()
              ];
              displayStreamRef.current = new MediaStream(combinedTracks);
            }
          }
        } catch (error) {
          console.error('画面共有がキャンセルされました:', error);
          // マイクモードにフォールバック（bothモードの場合）
          if (mode === 'both') {
            console.log('マイクのみで録音を続行します');
          } else {
            throw error;
          }
        }
      }

      // ミックスされた音声ストリーム
      const mixedStream = destination.stream;
      streamRef.current = mixedStream;

      const mediaRecorder = new MediaRecorder(mixedStream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      segmentsRef.current = [];
      autoStopCallbackRef.current = onAutoStop || null;
      lastSoundTimeRef.current = Date.now();
      setRecordingMode(mode);

      // 音声レベル解析用
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(mixedStream);
      source.connect(analyser);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      setRecordingMeetingId(meetingId);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      segmentTimerRef.current = setInterval(() => {
        startNewSegment();
      }, 30 * 60 * 1000);

      silenceTimerRef.current = setInterval(() => {
        checkAudioLevel();
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  };

  const stopRecording = async (): Promise<Blob[]> => {
    if (!mediaRecorderRef.current || !isRecording) {
      throw new Error('録音が開始されていません');
    }

    return new Promise((resolve) => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = () => {
          console.log(`Recording stopped. Chunks collected: ${chunksRef.current.length}`);

          // 停止後に最後のchunksを保存
          if (chunksRef.current.length > 0) {
            const finalSegment = new Blob(chunksRef.current, { type: 'audio/webm' });
            segmentsRef.current.push(finalSegment);
            console.log(`Final segment created, size: ${(finalSegment.size / (1024 * 1024)).toFixed(2)} MB`);
          }

          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }

          if (displayStreamRef.current) {
            displayStreamRef.current.getTracks().forEach((track) => track.stop());
            displayStreamRef.current = null;
          }

          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }

          if (segmentTimerRef.current) {
            clearInterval(segmentTimerRef.current);
            segmentTimerRef.current = null;
          }

          if (silenceTimerRef.current) {
            clearInterval(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }

          if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
          }

          analyserRef.current = null;
          autoStopCallbackRef.current = null;

          const segments = [...segmentsRef.current];
          console.log(`Total segments to process: ${segments.length}`);
          segments.forEach((seg, idx) => {
            console.log(`Segment ${idx + 1}: ${(seg.size / (1024 * 1024)).toFixed(2)} MB`);
          });

          segmentsRef.current = [];
          chunksRef.current = [];

          setIsRecording(false);
          setRecordingTime(0);
          setRecordingMeetingId(null);

          resolve(segments);
        };

        mediaRecorderRef.current.stop();
      }
    });
  };

  const getRecordingState = () => ({
    isRecording,
    recordingTime,
    meetingId: recordingMeetingId,
  });

  return (
    <RecordingContext.Provider
      value={{
        isRecording,
        recordingTime,
        recordingMeetingId,
        recordingMode,
        startRecording,
        stopRecording,
        getRecordingState,
      }}
    >
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecording() {
  const context = useContext(RecordingContext);
  if (context === undefined) {
    throw new Error('useRecording must be used within a RecordingProvider');
  }
  return context;
}
