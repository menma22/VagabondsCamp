
import { useLanguage } from '../contexts/LanguageContext';

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

interface MonthViewProps {
  currentDate: Date;
  selectedDate: Date | null;
  meetings: Meeting[];
  events: CalendarEvent[];
  onDateSelect: (date: Date) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onSelectMeeting: (meetingId: string) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export function MonthView({
  currentDate,
  selectedDate,
  meetings,
  events,
  onDateSelect,
  onPreviousMonth: _onPreviousMonth,
  onNextMonth: _onNextMonth,
  onSelectMeeting,
  onEventClick,
}: MonthViewProps) {
  const { t } = useLanguage();
  const weekDays = t('monthView.weekDays') as string[];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    return { daysInMonth, startingDayOfWeek, prevMonthLastDay };
  };

  const getItemsForDate = (day: number, month: number, year: number) => {
    const dateStr = new Date(year, month, day)
      .toISOString()
      .split('T')[0];
    const dayMeetings = meetings.filter((meeting) => meeting.meeting_date === dateStr);
    const dayEvents = events.filter((event) => event.event_date === dateStr);
    return { meetings: dayMeetings, events: dayEvents };
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentDate.getMonth() &&
      today.getFullYear() === currentDate.getFullYear()
    );
  };

  const isSelectedDate = (day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentDate.getMonth() &&
      selectedDate.getFullYear() === currentDate.getFullYear()
    );
  };

  const { daysInMonth, startingDayOfWeek, prevMonthLastDay } = getDaysInMonth(currentDate);
  const totalCells = 42; // 6週×7日 = 42セル

  const days = [];

  // 前月の日付を表示
  const prevMonth = currentDate.getMonth() === 0 ? 11 : currentDate.getMonth() - 1;
  const prevMonthYear = currentDate.getMonth() === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();

  for (let i = 0; i < startingDayOfWeek; i++) {
    const day = prevMonthLastDay - startingDayOfWeek + i + 1;
    const { meetings: dayMeetings, events: dayEvents } = getItemsForDate(day, prevMonth, prevMonthYear);

    days.push(
      <button
        key={`prev-${i}`}
        onClick={() => onDateSelect(new Date(prevMonthYear, prevMonth, day))}
        className="p-2 text-left border-r border-b border-slate-300 transition-all flex flex-col overflow-hidden hover:bg-blue-50/50 bg-slate-50/50"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-slate-400">{day}</span>
        </div>
        {(dayMeetings.length > 0 || dayEvents.length > 0) && (
          <div className="space-y-0.5 flex-1 overflow-hidden">
            {dayEvents.slice(0, 2).map((event) => (
              <button
                key={event.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick(event);
                }}
                className="w-full text-left px-1.5 py-0.5 rounded text-xs truncate font-medium hover:opacity-80 transition"
                style={{ backgroundColor: event.color, color: 'white' }}
              >
                {event.title}
              </button>
            ))}
          </div>
        )}
      </button>
    );
  }

  // 当月の日付を表示
  for (let day = 1; day <= daysInMonth; day++) {
    const { meetings: dayMeetings, events: dayEvents } = getItemsForDate(day, currentDate.getMonth(), currentDate.getFullYear());
    const today = isToday(day);
    const selected = isSelectedDate(day);

    days.push(
      <button
        key={day}
        onClick={() => onDateSelect(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
        className={`p-2 text-left border-r border-b border-slate-300 transition-all flex flex-col overflow-hidden hover:bg-blue-50/50 ${selected ? 'bg-blue-100 ring-2 ring-inset ring-blue-500' : today ? 'bg-blue-50' : 'bg-white'
          }`}
      >
        <div className="px-1 mb-1.5 flex-shrink-0">
          <span className={`text-sm font-semibold ${today ? 'bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center inline-flex' : 'text-slate-900'
            }`}>
            {day}
          </span>
        </div>
        <div className="space-y-1 flex-1 overflow-hidden">
          {dayEvents.slice(0, 3).map((event) => (
            <div
              key={event.id}
              onClick={(e) => {
                e.stopPropagation();
                onEventClick(event);
              }}
              className="text-[11px] px-1.5 py-1 rounded-md text-white truncate hover:opacity-90 transition flex items-center gap-1 shadow-sm font-medium"
              style={{ backgroundColor: event.color }}
            >
              {event.event_type_icon && <span className="text-[11px]">{event.event_type_icon}</span>}
              <span className="truncate">{event.start_time?.slice(0, 5)} {event.title}</span>
            </div>
          ))}
          {dayMeetings.slice(0, 1).map((meeting) => (
            <div
              key={meeting.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectMeeting(meeting.id);
              }}
              className="text-[11px] px-1.5 py-1 rounded-md text-white truncate hover:opacity-90 transition shadow-sm font-medium"
              style={{
                backgroundColor: meeting.project_color || '#64748b'
              }}
            >
              {meeting.title}
            </div>
          ))}
          {(dayEvents.length + dayMeetings.length) > 4 && (
            <div className="text-[10px] text-slate-600 px-1.5 font-medium">
              +{dayEvents.length + dayMeetings.length - 4}{t('monthView.items')}
            </div>
          )}
        </div>
      </button>
    );
  }

  // 次の月の日付を表示（42セルになるまで）
  const remainingCells = totalCells - days.length;
  const nextMonth = currentDate.getMonth() === 11 ? 0 : currentDate.getMonth() + 1;
  const nextMonthYear = currentDate.getMonth() === 11 ? currentDate.getFullYear() + 1 : currentDate.getFullYear();

  for (let day = 1; day <= remainingCells; day++) {
    const { meetings: dayMeetings, events: dayEvents } = getItemsForDate(day, nextMonth, nextMonthYear);

    days.push(
      <button
        key={`next-${day}`}
        onClick={() => onDateSelect(new Date(nextMonthYear, nextMonth, day))}
        className="p-2 text-left border-r border-b border-slate-300 transition-all flex flex-col overflow-hidden hover:bg-blue-50/50 bg-slate-50/50"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-slate-400">{day}</span>
        </div>
        {(dayMeetings.length > 0 || dayEvents.length > 0) && (
          <div className="space-y-0.5 flex-1 overflow-hidden">
            {dayEvents.slice(0, 2).map((event) => (
              <button
                key={event.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick(event);
                }}
                className="w-full text-left px-1.5 py-0.5 rounded text-xs truncate font-medium hover:opacity-80 transition"
                style={{ backgroundColor: event.color, color: 'white' }}
              >
                {event.title}
              </button>
            ))}
          </div>
        )}
      </button>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="grid grid-cols-7 border-b border-slate-300 flex-shrink-0 bg-slate-50">
        {weekDays.map((day: string, index: number) => (
          <div
            key={day}
            className={`py-2.5 text-center text-xs font-semibold uppercase ${index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-slate-700'
              }`}
          >
            {day}
          </div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7 grid-rows-6 border-l border-t border-slate-300">{days}</div>
    </div>
  );
}
