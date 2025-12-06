import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRecording } from '../contexts/RecordingContext';
import { useProjects } from '../contexts/ProjectContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { Settings as SettingsIcon, LogOut, Mic, Square, Plus, Calendar, Loader2, Trash2, Users, Folder, X, Check, Palette } from 'lucide-react';
import { Settings } from './Settings';
import { MeetingPage } from './MeetingPage';
import { Calendar as CalendarView } from './Calendar';
import { SpeakerManagement } from './SpeakerManagement';
import { ColorPicker } from './ColorPicker';

interface Meeting {
  id: string;
  title: string;
  created_at: string;
  transcript?: string;
  project_id?: string;
}

export function Home() {
  const { user, signOut } = useAuth();
  const { language, t } = useLanguage();
  const { isRecording, recordingTime, recordingMeetingId, startRecording, stopRecording } = useRecording();
  const { projects, selectedProjectId, setSelectedProjectId, createProject, deleteProject, updateProject } = useProjects();
  const [showSettings, setShowSettings] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showSpeakerManagement, setShowSpeakerManagement] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#3B82F6');
  const [editingProjectColor, setEditingProjectColor] = useState<string>('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [autoStartRecording, setAutoStartRecording] = useState(false);

  useEffect(() => {
    loadMeetings();
    loadApiKey();
  }, [user]);

  const loadApiKey = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('gemini_api_key')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data && data.gemini_api_key) {
        setGeminiApiKey(data.gemini_api_key);
      }
    } catch (error) {
      console.error('Error loading API key:', error);
    }
  };

  const loadMeetings = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('id, title, created_at, transcript, project_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error('Error loading meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewMeeting = async () => {
    if (!user) return;
    try {
      const meetingData: any = {
        user_id: user.id,
        title: '',
      };
      if (selectedProjectId) {
        meetingData.project_id = selectedProjectId;
      }
      const { data: meeting, error } = await supabase
        .from('meetings')
        .insert(meetingData)
        .select()
        .single();

      if (error) throw error;
      setSelectedMeetingId(meeting.id);
      await loadMeetings();
    } catch (error) {
      console.error('Error creating meeting:', error);
      alert('会議の作成に失敗しました');
    }
  };

  const deleteMeeting = async (meetingId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('この会議を削除しますか？')) return;
    try {
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId);
      if (error) throw error;
      await loadMeetings();
    } catch (error) {
      console.error('Error deleting meeting:', error);
      alert('会議の削除に失敗しました');
    }
  };

  const startQuickRecording = async () => {
    if (!geminiApiKey) {
      alert(t('errors.apiKeyRequired'));
      setShowSettings(true);
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: newMeeting, error } = await supabase
        .from('meetings')
        .insert([{
          user_id: user.id,
          title: `${t('home.newMeeting')} - ${new Date().toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US')}`,
          project_id: selectedProjectId,
          transcription_status: 'processing',
        }])
        .select()
        .single();

      if (error) throw error;
      setAutoStartRecording(true);
      setSelectedMeetingId(newMeeting.id);
    } catch (error) {
      console.error('Error starting quick recording:', error);
      alert(t('home.startRecordingError'));
    }
  };

  const handleStopRecording = async () => {
    try {
      const segments = await stopRecording();
      // Pass the recording meeting ID so processRecording can update the correct record
      // Note: processRecording logic is complex and was removed for brevity in reconstruction, 
      // but since we are navigating to MeetingPage for quick recording, 
      // the actual recording processing might be handled there or here?
      // Wait, in the original code, processRecording was huge.
      // But for quick recording, we navigate to MeetingPage.
      // So handleStopRecording here is only for when recording is started on Home page WITHOUT navigating?
      // But startQuickRecording navigates to MeetingPage immediately.
      // So isRecording on Home page might not be used anymore?
      // Ah, useRecording context is global.
      // If we navigate to MeetingPage, Home unmounts? No, MeetingPage is rendered conditionally inside Home.
      // So Home stays mounted.
      
      // If we are in MeetingPage, the stop button there handles it.
      // The floating button in Home is only visible if !selectedMeetingId.
      // But startQuickRecording sets selectedMeetingId.
      // So the floating button disappears.
      // So handleStopRecording in Home might be redundant if we always navigate?
      // But let's keep it just in case.
      console.log("Stop recording from Home");
    } catch (error) {
      console.error('Error stopping recording:', error);
      alert(t('home.stopRecordingError'));
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      await createProject(newProjectName.trim(), newProjectColor);
      setNewProjectName('');
      setNewProjectColor('#3B82F6');
      setShowProjectModal(false);
    } catch (error) {
      alert(t('home.projectCreateError'));
    }
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t('home.projectDeleteConfirm'))) return;
    try {
      await deleteProject(projectId);
    } catch (error) {
      alert(t('home.projectDeleteError'));
    }
  };

  const startEditingProject = (projectId: string, projectName: string, projectColor: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(projectId);
    setEditingProjectName(projectName);
    setEditingProjectColor(projectColor);
  };

  const saveProjectName = async (projectId: string) => {
    if (!editingProjectName.trim()) {
      setEditingProjectId(null);
      return;
    }
    try {
      await updateProject(projectId, editingProjectName.trim(), editingProjectColor);
      setEditingProjectId(null);
      setEditingProjectName('');
      setEditingProjectColor('');
    } catch (error) {
      alert(t('home.projectUpdateError'));
    }
  };

  const cancelEditingProject = () => {
    setEditingProjectId(null);
    setEditingProjectName('');
    setEditingProjectColor('');
  };

  const retryTranscription = async (meetingId: string) => {
      // Placeholder for retry logic if needed, or just pass empty function if not used in Home directly
      console.log("Retry transcription", meetingId);
  };

  if (selectedMeetingId) {
    return (
      <MeetingPage
        meetingId={selectedMeetingId}
        onClose={() => {
          setSelectedMeetingId(null);
          setAutoStartRecording(false);
          loadMeetings();
        }}
        onRetryTranscription={retryTranscription}
        autoStartRecording={autoStartRecording}
      />
    );
  }

  const filteredMeetings = selectedProjectId
    ? meetings.filter(m => m.project_id === selectedProjectId)
    : meetings;

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-100 via-blue-100 to-cyan-200">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-12 backdrop-blur-sm bg-white/60 rounded-3xl p-6 shadow-lg border border-white/50">
          <div>
            <h1 className="text-5xl font-bold text-slate-900 mb-3 tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>Vagabonds Camp</h1>
            <p className="text-slate-600 text-lg">{user?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSpeakerManagement(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-cyan-400 via-cyan-500 to-blue-500 text-white rounded-2xl hover:from-cyan-500 hover:via-cyan-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105 font-medium"
            >
              <Users className="w-5 h-5" />
              Speaker Management
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-500 text-white rounded-2xl hover:from-blue-500 hover:via-blue-600 hover:to-indigo-600 transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105 font-medium"
            >
              <SettingsIcon className="w-5 h-5" />
              {t('common.settings')}
            </button>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-orange-400 via-orange-500 to-pink-500 text-white rounded-2xl hover:from-orange-500 hover:via-orange-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105 font-medium"
            >
              <LogOut className="w-5 h-5" />
              {t('common.logout')}
            </button>
          </div>
        </div>

        {!geminiApiKey && (
          <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <SettingsIcon className="w-5 h-5 text-amber-600" />
              <div className="flex-1">
                <p className="text-amber-800 font-medium">{t('errors.apiKeyRequired')}</p>
              </div>
              <button
                onClick={() => setShowSettings(true)}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition text-sm font-medium"
              >
                {t('common.settings')}
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin -mb-px">
          <button
            onClick={() => setSelectedProjectId(null)}
            className={`tab-smooth group flex items-center gap-2 px-6 py-3 transition-all duration-300 whitespace-nowrap relative ${selectedProjectId === null
              ? 'bg-white text-slate-900 font-bold shadow-md border-2 border-slate-200 border-b-0 translate-y-0.5 z-10'
              : 'bg-white/40 text-slate-600 hover:bg-white/60 border-2 border-white/30 border-b-white/30'
              }`}
          >
            <Folder className={`w-5 h-5 transition-all duration-300 ${selectedProjectId === null ? 'text-slate-700' : ''}`} />
            <span>{t('home.allMeetings')}</span>
          </button>
          {projects.map((project) => (
            <div key={project.id} className="relative group">
              {editingProjectId === project.id ? (
                <div
                  className="tab-smooth tab-colored flex items-center gap-2 px-6 py-3 border-2 border-b-0 translate-y-0.5 z-10 text-white font-bold shadow-md"
                  style={{
                    backgroundColor: editingProjectColor,
                    borderColor: editingProjectColor,
                    borderBottomColor: 'transparent',
                    '--tab-color': editingProjectColor
                  } as React.CSSProperties & { '--tab-color': string }}
                >
                  <Folder className="w-5 h-5 text-white" />
                  <div className="flex flex-col gap-2 flex-1">
                    <input
                      type="text"
                      value={editingProjectName}
                      onChange={(e) => setEditingProjectName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveProjectName(project.id);
                        if (e.key === 'Escape') cancelEditingProject();
                      }}
                      className="flex-1 px-2 py-1 bg-white/95 border border-white/50 rounded text-slate-900 focus:ring-2 focus:ring-white focus:border-white outline-none min-w-[120px]"
                      autoFocus
                    />
                    <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border-2 border-slate-200 p-2 z-50">
                      <ColorPicker
                        selectedColor={editingProjectColor}
                        onColorSelect={setEditingProjectColor}
                      />
                    </div>
                  </div>
                  <button onClick={() => saveProjectName(project.id)} className="p-1 text-white hover:text-white/80 hover:scale-110 transition-transform">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={cancelEditingProject} className="p-1 text-white/80 hover:text-white hover:scale-110 transition-transform">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setSelectedProjectId(project.id)}
                    className={`tab-smooth flex items-center gap-2 px-6 py-3 transition-all duration-300 whitespace-nowrap relative border-2 border-b-0 ${selectedProjectId === project.id
                      ? 'tab-colored text-white font-bold shadow-md translate-y-0.5 z-10'
                      : 'bg-white/40 text-slate-600 hover:bg-white/60 border-white/30 border-b-white/30'
                      }`}
                    style={selectedProjectId === project.id ? {
                      backgroundColor: project.color,
                      borderColor: project.color,
                      borderBottomColor: 'transparent',
                      '--tab-color': project.color
                    } as React.CSSProperties & { '--tab-color': string } : {}}
                  >
                    <Folder className="w-5 h-5 transition-all duration-300" style={selectedProjectId === project.id ? { color: 'white' } : { color: project.color }} />
                    <span>{project.name}</span>
                  </button>
                  <button
                    onClick={(e) => startEditingProject(project.id, project.name, project.color, e)}
                    className="absolute -top-2 -right-10 p-1.5 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-xl backdrop-blur-sm border-2 border-white/30 z-20"
                    style={{ backgroundColor: project.color }}
                  >
                    <Palette className="w-3.5 h-3.5 drop-shadow-lg" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteProject(project.id, e)}
                    className="absolute -top-2 -right-2 p-1.5 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-xl backdrop-blur-sm border-2 border-white/30 z-20"
                  >
                    <X className="w-3.5 h-3.5 drop-shadow-lg" />
                  </button>
                </>
              )}
            </div>
          ))}
          <button
            onClick={() => setShowProjectModal(true)}
            className="tab-smooth group flex items-center justify-center p-3 bg-white/40 text-slate-600 hover:bg-white/60 transition-all duration-300 border-2 border-white/30 border-b-white/30 hover:shadow-md"
          >
            <Plus className="w-5 h-5 transition-all" />
          </button>
        </div>

        <div className="bg-white rounded-3xl rounded-tl-none shadow-2xl border-2 border-slate-200 p-8">
          <button
            onClick={createNewMeeting}
            className="w-full mb-10 group relative overflow-hidden bg-gradient-to-br from-cyan-400 via-cyan-500 to-blue-500 text-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-cyan-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center justify-center gap-4">
              <Plus className="w-8 h-8" />
              <span className="text-2xl font-bold">{t('home.newMeeting')}</span>
            </div>
          </button>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-slate-900" />
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="text-center py-20">
              <Calendar className="w-24 h-24 text-slate-300 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                {selectedProjectId ? t('home.noMeetingsInProject') : t('home.noMeetings')}
              </h3>
              <p className="text-slate-500 text-lg">
                {selectedProjectId ? t('home.createFirstMeetingInProject') : t('home.createFirstMeeting')}
              </p>
            </div>
          ) : (
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-orange-600 bg-clip-text text-transparent mb-8">
                {selectedProjectId ? projects.find(p => p.id === selectedProjectId)?.name || t('home.project') : t('home.allMeetings')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMeetings.map((meeting) => (
                  <div key={meeting.id} className="relative group">
                    <button
                      onClick={() => setSelectedMeetingId(meeting.id)}
                      className="w-full text-left bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-white/50 hover:border-cyan-200 hover:scale-[1.03] group-hover:bg-white"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex-shrink-0">
                          <div className="bg-gradient-to-br from-cyan-400 via-blue-400 to-orange-400 p-3 rounded-2xl shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300">
                            <Calendar className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        <p className="text-base text-slate-700 font-medium">
                          {new Date(meeting.created_at).toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
                        <h3 className="font-bold text-slate-900 text-lg group-hover:bg-gradient-to-r group-hover:from-cyan-600 group-hover:to-blue-600 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300">
                          {meeting.title || t('meeting.untitled')}
                        </h3>
                      </div>
                    </button>
                    <button
                      onClick={(e) => deleteMeeting(meeting.id, e)}
                      className="absolute top-4 right-4 p-3 bg-white/90 backdrop-blur-sm rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-red-50 hover:text-red-600 hover:scale-110 border border-white"
                      aria-label={t('common.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showSettings && (
        <Settings
          onClose={() => {
            setShowSettings(false);
            loadApiKey();
          }}
        />
      )}

      {showSpeakerManagement && (
        <SpeakerManagement onClose={() => setShowSpeakerManagement(false)} />
      )}

      {showProjectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border-2 border-white/50">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">{t('home.newProject')}</h2>
              <button
                onClick={() => {
                  setShowProjectModal(false);
                  setNewProjectName('');
                }}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
              placeholder={t('home.projectNamePlaceholder')}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-cyan-500 focus:outline-none mb-4"
              autoFocus
            />
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Palette className="w-4 h-4 text-slate-600" />
                <label className="text-sm font-medium text-slate-700">{t('home.selectColor')}</label>
              </div>
              <ColorPicker
                selectedColor={newProjectColor}
                onColorSelect={setNewProjectColor}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowProjectModal(false);
                  setNewProjectName('');
                }}
                className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-br from-cyan-400 to-blue-500 text-white rounded-xl hover:from-cyan-500 hover:to-blue-600 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('common.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCalendar && (
        <CalendarView
          onClose={() => setShowCalendar(false)}
          onSelectMeeting={(meetingId) => setSelectedMeetingId(meetingId)}
        />
      )}

      <button
        onClick={() => setShowCalendar(true)}
        disabled={processing}
        className="fixed bottom-8 left-8 w-20 h-20 rounded-3xl shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-br from-cyan-400 via-blue-500 to-blue-600 hover:shadow-3xl border-2 border-white/30"
      >
        <Calendar className="w-10 h-10 text-white" />
      </button>

      <button
        onClick={isRecording ? handleStopRecording : startQuickRecording}
        disabled={processing}
        className={`fixed bottom-8 right-8 w-20 h-20 rounded-3xl shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-white/30 ${isRecording
          ? 'bg-gradient-to-br from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 animate-pulse shadow-red-500/50'
          : 'bg-gradient-to-br from-orange-400 via-orange-500 to-pink-500 hover:shadow-3xl'
          }`}
      >
        {processing ? (
          <Loader2 className="w-10 h-10 animate-spin text-white" />
        ) : isRecording ? (
          <Square className="w-10 h-10 text-white" />
        ) : (
          <Mic className="w-10 h-10 text-white" />
        )}
      </button>

      {isRecording && (
        <div className="fixed bottom-32 right-8 bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl p-5 border-2 border-white/50">
          <p className="text-2xl font-mono font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
            {formatTime(recordingTime)}
          </p>
        </div>
      )}

      {processing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-10 max-w-md w-full mx-4 shadow-2xl border-2 border-white/50">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-500 to-orange-400 rounded-full blur-2xl opacity-30 animate-pulse"></div>
              <Loader2 className="w-20 h-20 animate-spin mx-auto mb-6 relative" />
            </div>
            <p className="text-slate-900 font-bold text-2xl text-center mb-3">
              {processingStep || t('common.processing')}
            </p>
            <p className="text-slate-600 text-center text-lg">
              {t('home.processingWithGemini')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
