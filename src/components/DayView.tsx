import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TimelineCalendar } from './TimelineCalendar';

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

interface DayViewProps {
  selectedDate: Date;
  events: CalendarEvent[];
  meetings: Meeting[];
  onPreviousDay: () => void;
  onNextDay: () => void;
  onEventUpdate: (eventId: string, newStartTime: string, newEndTime: string) => void;
  onEventClick: (event: CalendarEvent) => void;
  onEventDelete: (eventId: string) => void;
  onSelectMeeting: (meetingId: string) => void;
}

export function DayView({
  selectedDate,
  events,
  meetings,
  onPreviousDay,
  onNextDay,
  onEventUpdate,
  onEventClick,
  onEventDelete,
  onSelectMeeting,
}: DayViewProps) {
  const isToday = () => {
    const today = new Date();
    return (
      today.getDate() === selectedDate.getDate() &&
      today.getMonth() === selectedDate.getMonth() &&
      today.getFullYear() === selectedDate.getFullYear()
    );
  };

  const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][selectedDate.getDay()];

  return (
    <div className="flex-1 overflow-hidden">
      <TimelineCalendar
        selectedDate={selectedDate}
        events={events}
        onEventUpdate={onEventUpdate}
        onEventClick={onEventClick}
        onEventDelete={onEventDelete}
      />
    </div>
  );
}
