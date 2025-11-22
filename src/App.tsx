import { useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { Home } from './components/Home';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-pulse text-slate-900 text-xl font-semibold">読み込み中...</div>
      </div>
    );
  }

  return user ? <Home /> : <Auth />;
}

export default App;
