import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { EventForm } from './EventForm';
import { MonthView } from './MonthView';
import { DayView } from './DayView';
import { X, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

interface Meeting {
  id: string;
  title: string;
  created_at: string;
  meeting_date: string;
  project_id?: string;
  project_color?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  color: string;
  event_type: string;
  event_type_name?: string;
  event_type_icon?: string;
}

interface CalendarProps {
  onClose: () => void;
  onSelectMeeting: (meetingId: string) => void;
}

type ViewMode = 'month' | 'day';

export function Calendar({ onClose, onSelectMeeting }: CalendarProps) {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    loadMeetings();
    loadEvents();
  }, [user, currentDate, viewMode]);

  const loadMeetings = async () => {
    if (!user) return;

    try {
      let startDate: Date;
      let endDate: Date;

      if (viewMode === 'month') {
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      } else {
        startDate = new Date(currentDate);
        endDate = new Date(currentDate);
      }

      const { data: meetingsData, error: meetingsError } = await supabase
        .from('meetings')
        .select('id, title, created_at, meeting_date, project_id')
        .eq('user_id', user.id)
        .gte('meeting_date', startDate.toISOString().split('T')[0])
        .lte('meeting_date', endDate.toISOString().split('T')[0])
        .order('meeting_date', { ascending: false });

      if (meetingsError) throw meetingsError;

      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, color')
        .eq('user_id', user.id);

      const projectColorMap = new Map(
        (projectsData || []).map(p => [p.id, p.color])
      );

      const meetingsWithColor = (meetingsData || []).map(meeting => ({
        ...meeting,
        project_color: meeting.project_id ? projectColorMap.get(meeting.project_id) : undefined,
      }));

      setMeetings(meetingsWithColor);
    } catch (error) {
      console.error('Error loading meetings:', error);
    }
  };

  const loadEvents = async () => {
    if (!user) return;

    try {
      let startDate: Date;
      let endDate: Date;

      if (viewMode === 'month') {
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      } else {
        startDate = new Date(currentDate);
        endDate = new Date(currentDate);
      }

      const { data, error } = await supabase
        .from('calendar_events')
        .select(`
          *,
          event_types (
            name,
            icon
          )
        `)
        .eq('user_id', user.id)
        .gte('event_date', startDate.toISOString().split('T')[0])
        .lte('event_date', endDate.toISOString().split('T')[0])
        .order('start_time', { ascending: true });

      if (error) throw error;

      const eventsWithTypes = (data || []).map(event => ({
        ...event,
        event_type_name: event.event_types?.name,
        event_type_icon: event.event_types?.icon,
      }));

      setEvents(eventsWithTypes);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const handleSaveEvent = async (eventData: {
    title: string;
    description: string;
    event_date: string;
    start_time: string;
    end_time: string;
    color: string;
    event_type: string;
  }) => {
    if (!user) return;

    try {
      if (selectedEvent) {
        const { error } = await supabase
          .from('calendar_events')
          .update(eventData)
          .eq('id', selectedEvent.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('calendar_events').insert({
          user_id: user.id,
          ...eventData,
        });

        if (error) throw error;
      }

      setShowEventForm(false);
      setSelectedEvent(null);
      await loadEvents();
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  const handleEventUpdate = async (eventId: string, newStartTime: string, newEndTime: string) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({
          start_time: newStartTime,
          end_time: newEndTime,
        })
        .eq('id', eventId);

      if (error) throw error;
      await loadEvents();
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      await loadEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setCurrentDate(date);
    setViewMode('day');
  };

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  const handlePreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
    setSelectedDate(newDate);
  };

  const handleAddEvent = () => {
    if (viewMode === 'month' && !selectedDate) {
      setSelectedDate(new Date());
    }
    setSelectedEvent(null);
    setShowEventForm(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventForm(true);
  };

  const filteredEvents = viewMode === 'day' && selectedDate
    ? events.filter(e => e.event_date === selectedDate.toISOString().split('T')[0])
    : events;

  const filteredMeetings = viewMode === 'day' && selectedDate
    ? meetings.filter(m => m.meeting_date === selectedDate.toISOString().split('T')[0])
    : meetings;

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white relative">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setCurrentDate(new Date());
              setSelectedDate(new Date());
            }}
            className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md transition border border-slate-300"
          >
            今日
          </button>
          <button
            onClick={viewMode === 'month' ? handlePreviousMonth : handlePreviousDay}
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-700" />
          </button>
          <button
            onClick={viewMode === 'month' ? handleNextMonth : handleNextDay}
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-slate-700" />
          </button>
        </div>

        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2">
          {viewMode === 'month' ? (
            <h2 className="text-xl font-semibold text-slate-900">
              {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
            </h2>
          ) : (
            <h2 className="text-xl font-semibold text-slate-900 flex items-baseline gap-1">
              <span>{currentDate.getFullYear()}年{currentDate.getMonth() + 1}月</span>
              <span className="text-3xl font-bold">{currentDate.getDate()}日</span>
              <span>({['日', '月', '火', '水', '木', '金', '土'][currentDate.getDay()]})</span>
            </h2>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${viewMode === 'month'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              月
            </button>
            <button
              onClick={() => {
                setViewMode('day');
                if (!selectedDate) {
                  setSelectedDate(new Date());
                  setCurrentDate(new Date());
                }
              }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${viewMode === 'day'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              日
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-700" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden flex">
          {viewMode === 'month' ? (
            <MonthView
              currentDate={currentDate}
              selectedDate={selectedDate}
              meetings={meetings}
              events={events}
              onDateSelect={handleDateSelect}
              onPreviousMonth={handlePreviousMonth}
              onNextMonth={handleNextMonth}
              onSelectMeeting={(id) => {
                onSelectMeeting(id);
                onClose();
              }}
              onEventClick={handleEventClick}
            />
          ) : (
            <DayView
              selectedDate={selectedDate || new Date()}
              events={filteredEvents}
              meetings={filteredMeetings}
              onPreviousDay={handlePreviousDay}
              onNextDay={handleNextDay}
              onEventUpdate={handleEventUpdate}
              onEventClick={handleEventClick}
              onEventDelete={handleDeleteEvent}
              onSelectMeeting={(id) => {
                onSelectMeeting(id);
                onClose();
              }}
            />
          )}
        </div>

        <div className="w-80 border-l border-slate-200 bg-white overflow-y-auto flex-shrink-0">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-semibold text-slate-900">
              {selectedDate ? (
                <>{selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月{selectedDate.getDate()}日</>
              ) : (
                <>会議ログ</>
              )}
            </h3>
          </div>
          <div className="p-4 space-y-6">
            {viewMode === 'day' && filteredEvents.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-600 mb-3">予定</h4>
                <div className="space-y-2">
                  {filteredEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className="w-full text-left p-3 rounded-lg border-l-4 hover:bg-slate-50 transition"
                      style={{ borderLeftColor: event.color }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {event.event_type_icon && (
                          <span className="text-sm">{event.event_type_icon}</span>
                        )}
                        <h5 className="font-semibold text-slate-900 text-sm">
                          {event.title}
                        </h5>
                      </div>
                      <p className="text-xs text-slate-600">
                        {event.start_time?.slice(0, 5)} - {event.end_time?.slice(0, 5)}
                      </p>
                      {event.event_type_name && (
                        <p className="text-xs text-slate-500 mt-1">
                          {event.event_type_name}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filteredMeetings.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-600 mb-3">会議ログ</h4>
                <div className="space-y-2">
                  {filteredMeetings.map((meeting) => (
                    <button
                      key={meeting.id}
                      onClick={() => {
                        onSelectMeeting(meeting.id);
                        onClose();
                      }}
                      className="w-full text-left p-3 rounded-lg hover:bg-slate-50 transition border-l-4"
                      style={{
                        borderLeftColor: meeting.project_color || '#64748b'
                      }}
                    >
                      <h5 className="font-semibold text-slate-900 text-sm mb-1">
                        {meeting.title}
                      </h5>
                      <p className="text-xs text-slate-500">
                        {new Date(meeting.created_at).toLocaleTimeString('ja-JP', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={handleAddEvent}
        className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all flex items-center justify-center group z-10"
      >
        <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {showEventForm && (selectedDate || viewMode === 'month') && (
        <EventForm
          date={selectedDate || new Date()}
          onClose={() => {
            setShowEventForm(false);
            setSelectedEvent(null);
          }}
          onSave={handleSaveEvent}
          initialEvent={selectedEvent}
        />
      )}
    </div>
  );
}
