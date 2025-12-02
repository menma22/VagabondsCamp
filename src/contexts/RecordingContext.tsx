import { createContext, useContext, useRef, useState, ReactNode } from 'react';

interface RecordingContextType {
  isRecording: boolean;
  recordingTime: number;
  recordingMeetingId: string | null;
  startRecording: (meetingId: string, onAutoStop?: () => void) => Promise<void>;
  stopRecording: () => Promise<Blob[]>;
  getRecordingState: () => { isRecording: boolean; recordingTime: number; meetingId: string | null };
}

const RecordingContext = createContext<RecordingContextType | undefined>(undefined);

export function RecordingProvider({ children }: { children: ReactNode }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingMeetingId, setRecordingMeetingId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const segmentsRef = useRef<Blob[]>([]);
  const segmentTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
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

  const startRecording = async (meetingId: string, onAutoStop?: () => void) => {
    if (isRecording) {
      throw new Error('すでに録音中です');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      segmentsRef.current = [];
      autoStopCallbackRef.current = onAutoStop || null;
      lastSoundTimeRef.current = Date.now();

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
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
      }, 5 * 60 * 1000);

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
