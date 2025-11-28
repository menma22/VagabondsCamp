import { supabase } from './supabase';

/**
 * 複数の音声セグメントを1つのBlobに結合する
 */
export async function combineAudioSegments(segments: Blob[]): Promise<Blob> {
    // WebMファイルの場合、単純に結合できないため、
    // すべてのセグメントを配列として保持し、新しいBlobを作成
    return new Blob(segments, { type: 'audio/webm' });
}

/**
 * 音声データをSupabase Storageにアップロードする
 * @param userId ユーザーID
 * @param meetingId 会議ID
 * @param audioBlob 音声データ
 * @returns アップロードされたファイルのパスとサイズ
 */
export async function uploadAudioToStorage(
    userId: string,
    meetingId: string,
    audioBlob: Blob
): Promise<{ path: string; size: number }> {
    const timestamp = Date.now();
    const fileName = `${meetingId}_${timestamp}.webm`;
    const filePath = `${userId}/${fileName}`;

    console.log(`Uploading audio to: ${filePath}, size: ${audioBlob.size} bytes`);

    const { data, error } = await supabase.storage
        .from('meeting-audio')
        .upload(filePath, audioBlob, {
            contentType: 'audio/webm',
            upsert: false,
        });

    if (error) {
        console.error('Error uploading audio:', error);
        throw new Error(`音声ファイルのアップロードに失敗しました: ${error.message}`);
    }

    console.log('Audio uploaded successfully:', data.path);

    return {
        path: data.path,
        size: audioBlob.size,
    };
}

/**
 * Supabase Storageから音声データをダウンロードする
 * @param audioUrl 音声ファイルのパス
 * @returns 音声データのBlob
 */
export async function downloadAudioFromStorage(audioUrl: string): Promise<Blob> {
    console.log(`Downloading audio from: ${audioUrl}`);

    const { data, error } = await supabase.storage
        .from('meeting-audio')
        .download(audioUrl);

    if (error) {
        console.error('Error downloading audio:', error);
        throw new Error(`音声ファイルのダウンロードに失敗しました: ${error.message}`);
    }

    console.log('Audio downloaded successfully, size:', data.size);
    return data;
}

/**
 * ファイルサイズを人間が読める形式にフォーマットする
 * @param bytes バイト数
 * @returns フォーマットされた文字列（例: "2.5 MB"）
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
