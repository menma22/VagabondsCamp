import { supabase } from './supabase';
import { combineAudioSegments, uploadAudioToStorage } from './audioUpload';

/**
 *  processRecording用のヘルパー: 音声アップロードと会議作成
 */
export async function createMeetingWithAudio(
    userId: string,
    audioSegments: Blob[],
    selectedProjectId: string | null
): Promise<{ meetingId: string; audioPath: string }> {
    // 音声セグメントを結合
    const combinedAudio = await combineAudioSegments(audioSegments);

    // 仮のIDで音声をStorageにアップロード
    const tempId = crypto.randomUUID();
    const uploadResult = await uploadAudioToStorage(userId, tempId, combinedAudio);

    // 会議レコードを作成（processing状態）
    const meetingData: any = {
        user_id: userId,
        title: `新しい会議 - ${new Date().toLocaleDateString('ja-JP')}`,
        audio_url: uploadResult.path,
        audio_size: uploadResult.size,
        transcription_status: 'processing',
    };

    if (selectedProjectId) {
        meetingData.project_id = selectedProjectId;
    }

    const { data: newMeeting, error: createError } = await supabase
        .from('meetings')
        .insert(meetingData)
        .select()
        .single();

    if (createError) throw createError;

    return {
        meetingId: newMeeting.id,
        audioPath: uploadResult.path,
    };
}

/**
 * 会議を完了状態に更新する
 */
export async function completeMeetingProcessing(
    meetingId: string,
    title: string,
    transcript: string,
    formattedMinutes: string,
    todos: any[],
    decisions: any[],
    sharedInfo: any[]
): Promise<void> {
    const { error } = await supabase
        .from('meetings')
        .update({
            title,
            transcript,
            formatted_minutes: formattedMinutes,
            todos,
            decisions,
            shared_information: sharedInfo,
            transcription_status: 'completed',
            transcription_error: null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', meetingId);

    if (error) throw error;
}

/**
 * 会議を失敗状態に更新する
 */
export async function markMeetingAsFailed(
    meetingId: string,
    errorMessage: string
): Promise<void> {
    const { error } = await supabase
        .from('meetings')
        .update({
            transcription_status: 'failed',
            transcription_error: errorMessage,
            updated_at: new Date().toISOString(),
        })
        .eq('id', meetingId);

    if (error) {
        console.error('Error updating meeting status to failed:', error);
    }
}

/**
 * 会議を再処理状態に更新する（再試行前）
 */
export async function markMeetingAsProcessing(
    meetingId: string
): Promise<void> {
    const { error } = await supabase
        .from('meetings')
        .update({
            transcription_status: 'processing',
            transcription_error: null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', meetingId);

    if (error) {
        console.error('Error updating meeting status to processing:', error);
        throw error;
    }
}
