import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// .env.developmentから環境変数を読み込む
const envFile = fs.readFileSync('.env.development', 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
    }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('環境変数が見つかりません');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
    console.log('=== Supabase接続確認 ===\n');
    console.log('URL:', supabaseUrl);
    console.log('');

    // まず、テーブルの存在確認とカラム情報を取得（RLSを回避）
    console.log('=== スキーマ確認（audio関連カラム） ===\n');

    // meetingsテーブルのすべてのカラムを確認
    const { data: allMeetings, error: allError } = await supabase
        .from('meetings')
        .select('*')
        .limit(1);

    if (allError) {
        console.error('エラー:', allError.message);

        if (allError.message.includes('audio_url') || allError.message.includes('does not exist')) {
            console.error('\n⚠️  audio_url カラムがデータベースに存在しません！');
            console.error('\nマイグレーションを適用する必要があります:');
            console.error('1. Supabase Dashboard (https://supabase.com) を開く');
            console.error('2. プロジェクトを選択');
            console.error('3. 左メニューから「SQL Editor」を選択');
            console.error('4. migration_instructions.md のSQLを実行');
            console.error('\n詳細は migration_instructions.md を参照してください。');
        }
        return;
    }

    if (allMeetings && allMeetings.length > 0) {
        console.log('✅ meetingsテーブルにアクセスできました');
        console.log('利用可能なカラム:', Object.keys(allMeetings[0]).join(', '));
        console.log('');

        // audio関連のカラムがあるか確認
        const hasAudioUrl = 'audio_url' in allMeetings[0];
        const hasAudioSize = 'audio_size' in allMeetings[0];
        const hasTranscriptionStatus = 'transcription_status' in allMeetings[0];
        const hasTranscriptionError = 'transcription_error' in allMeetings[0];

        console.log('=== カラムチェック ===');
        console.log(`audio_url: ${hasAudioUrl ? '✅ あり' : '❌ なし'}`);
        console.log(`audio_size: ${hasAudioSize ? '✅ あり' : '❌ なし'}`);
        console.log(`transcription_status: ${hasTranscriptionStatus ? '✅ あり' : '❌ なし'}`);
        console.log(`transcription_error: ${hasTranscriptionError ? '✅ あり' : '❌ なし'}`);
        console.log('');

        if (!hasAudioUrl) {
            console.log('⚠️  audio_url カラムがありません。マイグレーションを適用してください。');
            console.log('migration_instructions.md を参照してください。');
            return;
        }
    }

    // 最新の会議データを取得
    console.log('=== 最新の会議データ ===\n');
    const { data: meetings, error } = await supabase
        .from('meetings')
        .select('id, title, audio_url, audio_size, transcription_status, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('データ取得エラー:', error.message);
        return;
    }

    if (!meetings || meetings.length === 0) {
        console.log('❌ 会議データが見つかりません。');
        console.log('');
        console.log('考えられる原因:');
        console.log('1. まだ会議を作成していない');
        console.log('2. RLSポリシーでデータがフィルタリングされている');
        console.log('3. 別のユーザーで作成されたデータ');
        return;
    }

    console.log(`会議データ: ${meetings.length}件\n`);
    meetings.forEach((meeting, index) => {
        console.log(`--- 会議 ${index + 1} ---`);
        console.log(`ID: ${meeting.id}`);
        console.log(`タイトル: ${meeting.title}`);
        console.log(`audio_url: ${meeting.audio_url || '❌ NULL'}`);
        console.log(`audio_size: ${meeting.audio_size !== null ? meeting.audio_size + ' bytes' : '❌ NULL'}`);
        console.log(`transcription_status: ${meeting.transcription_status || '❌ NULL'}`);
        console.log(`作成日時: ${meeting.created_at}`);
        console.log('');
    });

    // サマリー
    const withAudio = meetings.filter(m => m.audio_url).length;
    const withoutAudio = meetings.length - withAudio;

    console.log('=== サマリー ===');
    console.log(`audio_url あり: ${withAudio}件`);
    console.log(`audio_url なし: ${withoutAudio}件`);

    if (withoutAudio === meetings.length && meetings.length > 0) {
        console.log('\n⚠️  すべての会議にaudio_urlがありません。');
        console.log('\n考えられる原因:');
        console.log('1. 音声録音機能が実装される前に作成されたデータ');
        console.log('2. 音声アップロード処理が失敗している');
        console.log('3. コードで audio_url を設定していない');
    } else if (withAudio > 0) {
        console.log('\n✅ 一部の会議に音声データがあります！');
    }
}

checkDatabase().catch(console.error);
