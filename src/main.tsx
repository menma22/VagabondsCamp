import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { RecordingProvider } from './contexts/RecordingContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { LanguageProvider } from './contexts/LanguageContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ProjectProvider>
        <RecordingProvider>
          <LanguageProvider>
            <App />
          </LanguageProvider>
        </RecordingProvider>
      </ProjectProvider>
    </AuthProvider>
  </StrictMode>
);
