import { useState, useEffect } from 'react';
import { Key, X, Loader2, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setGeminiApiKey(data.gemini_api_key);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      const { data: existing } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_settings')
          .update({
            gemini_api_key: geminiApiKey,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_settings').insert({
          user_id: user.id,
          gemini_api_key: geminiApiKey,
        });

        if (error) throw error;
      }

      setMessage({ type: 'success', text: t('settings.saveSuccess') });
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: t('settings.saveError') });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-lg">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-900" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2 rounded-lg">
              <Key className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{t('settings.title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="language" className="block text-sm font-medium text-slate-700 mb-1">
              {t('settings.languageLabel')}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLanguage('ja')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition ${language === 'ja'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
              >
                <span className="text-lg">🇯🇵</span>
                日本語
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition ${language === 'en'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
              >
                <span className="text-lg">🇺🇸</span>
                English
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="gemini" className="block text-sm font-medium text-slate-700 mb-1">
              {t('settings.apiKeyLabel')}
            </label>
            <input
              id="gemini"
              type="text"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder={t('settings.apiKeyPlaceholder')}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
            />
            <p className="text-xs text-slate-500 mt-1">
              <a
                href="https://makersuite.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-700 hover:underline"
              >
                Google AI Studio
              </a>
              {language === 'ja' ? 'からキーを取得' : ' - Get API Key'}
            </p>
          </div>

          {message && (
            <div
              className={`px-4 py-3 rounded-lg text-sm ${message.type === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-600'
                }`}
            >
              {message.text}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                t('common.save')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
