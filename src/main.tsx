import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { RecordingProvider } from './contexts/RecordingContext';
import { ProjectProvider } from './contexts/ProjectContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ProjectProvider>
        <RecordingProvider>
          <App />
        </RecordingProvider>
      </ProjectProvider>
    </AuthProvider>
  </StrictMode>
);
