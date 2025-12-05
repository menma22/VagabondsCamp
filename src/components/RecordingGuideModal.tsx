import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Monitor, CheckSquare, MousePointerClick, X } from 'lucide-react';

interface RecordingGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function RecordingGuideModal({ isOpen, onClose, onConfirm }: RecordingGuideModalProps) {
    const { t } = useLanguage();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-saltwater/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border-2 border-lagoon/20 animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-saltwater p-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Monitor className="w-8 h-8" />
                        {t('recordingGuide.title') || 'システム音声の録音方法'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-8">
                    <p className="text-lg text-saltwater font-medium text-center">
                        {t('recordingGuide.description') || 'ZoomやTeamsの音声を録音するには、以下の手順で設定してください。'}
                    </p>

                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Step 1 */}
                        <div className="bg-whitewash rounded-xl p-6 border-2 border-lagoon/20 flex flex-col items-center text-center relative group hover:border-lagoon transition-colors">
                            <div className="absolute -top-4 bg-lagoon text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg shadow-lg">1</div>
                            <Monitor className="w-12 h-12 text-lagoon mb-4 group-hover:scale-110 transition-transform" />
                            <h3 className="font-bold text-saltwater mb-2">{t('recordingGuide.step1Title') || '「画面全体」を選択'}</h3>
                            <p className="text-sm text-lagoon">{t('recordingGuide.step1Desc') || 'ポップアップ上部のタブから「画面全体」を選びます'}</p>
                        </div>

                        {/* Step 2 */}
                        <div className="bg-whitewash rounded-xl p-6 border-2 border-raspberry/20 flex flex-col items-center text-center relative group hover:border-raspberry transition-colors">
                            <div className="absolute -top-4 bg-raspberry text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg shadow-lg">2</div>
                            <div className="relative mb-4 group-hover:scale-110 transition-transform">
                                <CheckSquare className="w-12 h-12 text-raspberry" />
                                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                                    <MousePointerClick className="w-6 h-6 text-saltwater" />
                                </div>
                            </div>
                            <h3 className="font-bold text-raspberry mb-2">{t('recordingGuide.step2Title') || '音声を共有'}</h3>
                            <p className="text-sm text-raspberry/80 font-bold">{t('recordingGuide.step2Desc') || '左下の「システムオーディオも共有」に必ずチェックを入れてください'}</p>
                        </div>

                        {/* Step 3 */}
                        <div className="bg-whitewash rounded-xl p-6 border-2 border-lagoon/20 flex flex-col items-center text-center relative group hover:border-lagoon transition-colors">
                            <div className="absolute -top-4 bg-lagoon text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg shadow-lg">3</div>
                            <div className="w-12 h-12 bg-saltwater rounded-lg flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform">
                                <span className="text-white font-bold text-xs">共有</span>
                            </div>
                            <h3 className="font-bold text-saltwater mb-2">{t('recordingGuide.step3Title') || '共有を開始'}</h3>
                            <p className="text-sm text-lagoon">{t('recordingGuide.step3Desc') || '最後に青い「共有」ボタンをクリックします'}</p>
                        </div>
                    </div>

                    <div className="bg-lagoon/10 rounded-xl p-4 border border-lagoon/20 flex gap-3 items-start">
                        <div className="bg-lagoon p-1.5 rounded-full mt-0.5">
                            <span className="text-white font-bold text-xs">i</span>
                        </div>
                        <p className="text-sm text-saltwater/80 leading-relaxed">
                            {t('recordingGuide.note') || '※ この操作はブラウザのセキュリティ仕様により毎回必要です。チェックを入れ忘れると相手の声が録音されません。'}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-whitewash border-t border-lagoon/10 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 text-lagoon font-bold hover:bg-lagoon/10 rounded-xl transition-colors"
                    >
                        {t('common.cancel') || 'キャンセル'}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-8 py-3 bg-saltwater text-white font-bold rounded-xl shadow-lg hover:bg-saltwater/90 hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                    >
                        <Monitor className="w-5 h-5" />
                        {t('recordingGuide.start') || '設定画面を開く'}
                    </button>
                </div>
            </div>
        </div>
    );
}
