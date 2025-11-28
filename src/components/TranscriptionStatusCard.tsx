import { CheckCircle, XCircle, Loader2, Clock, Download, RefreshCw } from 'lucide-react';
import { formatFileSize } from '../lib/audioUpload';

interface TranscriptionStatusCardProps {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    audioUrl: string | null;
    audioSize: number | null;
    error: string | null;
    onRetry?: () => void;
    onDownload?: () => void;
}

export function TranscriptionStatusCard({
    status,
    audioUrl,
    audioSize,
    error,
    onRetry,
    onDownload,
}: TranscriptionStatusCardProps) {
    // 音声データがない場合は何も表示しない
    if (!audioUrl) {
        return null;
    }

    const getStatusConfig = () => {
        switch (status) {
            case 'completed':
                return {
                    icon: CheckCircle,
                    color: 'from-green-400 via-green-500 to-emerald-500',
                    textColor: 'text-white',
                    iconColor: 'text-white',
                    bgOpacity: 'bg-white/30',
                    title: '✅ 文字起こし完了',
                    message: '音声データは正常に処理されました',
                };
            case 'failed':
                return {
                    icon: XCircle,
                    color: 'from-red-400 via-red-500 to-rose-500',
                    textColor: 'text-white',
                    iconColor: 'text-white',
                    bgOpacity: 'bg-white/30',
                    title: '❌ 文字起こし失敗',
                    message: error || '不明なエラーが発生しました',
                };
            case 'processing':
                return {
                    icon: Loader2,
                    color: 'from-blue-400 via-blue-500 to-indigo-500',
                    textColor: 'text-white',
                    iconColor: 'text-white',
                    bgOpacity: 'bg-white/30',
                    title: '🔵 処理中...',
                    message: '音声データを文字起こし中です',
                };
            case 'pending':
                return {
                    icon: Clock,
                    color: 'from-gray-400 via-gray-500 to-slate-500',
                    textColor: 'text-white',
                    iconColor: 'text-white',
                    bgOpacity: 'bg-white/30',
                    title: '⏳ 保留中',
                    message: '処理待機中です',
                };
        }
    };

    const config = getStatusConfig();
    const Icon = config.icon;

    return (
        <div className={`relative bg-gradient-to-br ${config.color} rounded-2xl shadow-lg p-6 overflow-hidden mb-6`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.3),transparent_50%),radial-gradient(circle_at_70%_70%,rgba(255,255,255,0.2),transparent_50%)] pointer-events-none"></div>

            <div className="relative z-10">
                <div className="flex items-start gap-4">
                    <div className={`${config.bgOpacity} backdrop-blur-sm p-3 rounded-xl`}>
                        <Icon
                            className={`w-8 h-8 ${config.iconColor} ${status === 'processing' ? 'animate-spin' : ''}`}
                        />
                    </div>

                    <div className="flex-1">
                        <h3 className={`text-xl font-bold ${config.textColor} mb-2`}>
                            {config.title}
                        </h3>
                        <p className={`${config.textColor} opacity-90 mb-3`}>
                            {config.message}
                        </p>

                        {audioSize && (
                            <p className={`${config.textColor} opacity-75 text-sm mb-3`}>
                                ファイルサイズ: {formatFileSize(audioSize)}
                            </p>
                        )}

                        <div className="flex gap-2">
                            {status === 'failed' && onRetry && (
                                <button
                                    onClick={onRetry}
                                    className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm text-red-600 rounded-lg hover:bg-white transition font-medium"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    再試行
                                </button>
                            )}

                            {(status === 'completed' || status === 'failed') && onDownload && (
                                <button
                                    onClick={onDownload}
                                    className="flex items-center gap-2 px-4 py-2 bg-white/30 backdrop-blur-sm text-white rounded-lg hover:bg-white/40 transition"
                                >
                                    <Download className="w-4 h-4" />
                                    音声をダウンロード
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
