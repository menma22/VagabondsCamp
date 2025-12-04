import { useAuth } from './contexts/AuthContext';
import { useLanguage } from './contexts/LanguageContext';
import { Auth } from './components/Auth';
import { Home } from './components/Home';

function App() {
  const { user, loading } = useAuth();
  const { language, t } = useLanguage();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-pulse text-slate-900 text-xl font-semibold">{t('common.loading')}</div>
      </div>
    );
  }

  return <div key={language}>{user ? <Home /> : <Auth />}</div>;
}

export default App;
