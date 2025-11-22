import { useState, useEffect, useRef } from 'react';

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

interface TimelineCalendarProps {
  selectedDate: Date;
  events: CalendarEvent[];
  onEventUpdate: (eventId: string, newStartTime: string, newEndTime: string) => void;
  onEventClick: (event: CalendarEvent) => void;
  onEventDelete: (eventId: string) => void;
}

export function TimelineCalendar({
  selectedDate,
  events,
  onEventUpdate,
  onEventClick,
  onEventDelete,
}: TimelineCalendarProps) {
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [dragStartY, setDragStartY] = useState(0);
  const [resizing, setResizing] = useState<{ eventId: string; type: 'start' | 'end' } | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const HOUR_HEIGHT = 60;

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const getEventPosition = (startTime: string, endTime: string) => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const duration = endMinutes - startMinutes;

    const top = (startMinutes / 60) * HOUR_HEIGHT;
    const height = (duration / 60) * HOUR_HEIGHT;

    return { top, height };
  };

  const yToMinutes = (y: number): number => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const relativeY = Math.max(0, Math.min(y - rect.top, HOUR_HEIGHT * 24));
    return Math.round((relativeY / HOUR_HEIGHT) * 60);
  };

  const handleMouseDown = (event: CalendarEvent, e: React.MouseEvent) => {
    if (resizing) return;
    e.stopPropagation();
    e.preventDefault();
    setDraggedEvent(event);
    setDragStartY(e.clientY);
  };

  const handleResizeStart = (event: CalendarEvent, type: 'start' | 'end', e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setResizing({ eventId: event.id, type });
    setDraggedEvent(event);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!draggedEvent) return;

    if (resizing) {
      const minutes = yToMinutes(e.clientY);
      const startMinutes = timeToMinutes(draggedEvent.start_time);
      const endMinutes = timeToMinutes(draggedEvent.end_time);

      if (resizing.type === 'start') {
        const newStartMinutes = Math.min(minutes, endMinutes - 15);
        const newStartTime = minutesToTime(Math.max(0, newStartMinutes));
        setDraggedEvent({ ...draggedEvent, start_time: newStartTime });
      } else {
        const newEndMinutes = Math.max(minutes, startMinutes + 15);
        const newEndTime = minutesToTime(Math.min(1440, newEndMinutes));
        setDraggedEvent({ ...draggedEvent, end_time: newEndTime });
      }
    } else {
      const deltaY = e.clientY - dragStartY;
      const deltaMinutes = Math.round((deltaY / HOUR_HEIGHT) * 60);

      const startMinutes = timeToMinutes(draggedEvent.start_time);
      const endMinutes = timeToMinutes(draggedEvent.end_time);
      const duration = endMinutes - startMinutes;

      const newStartMinutes = Math.max(0, Math.min(1440 - duration, startMinutes + deltaMinutes));
      const newEndMinutes = newStartMinutes + duration;

      const newStartTime = minutesToTime(newStartMinutes);
      const newEndTime = minutesToTime(newEndMinutes);

      setDraggedEvent({ ...draggedEvent, start_time: newStartTime, end_time: newEndTime });
      setDragStartY(e.clientY);
    }
  };

  const handleMouseUp = () => {
    if (draggedEvent && draggedEvent.id) {
      onEventUpdate(draggedEvent.id, draggedEvent.start_time, draggedEvent.end_time);
    }
    setDraggedEvent(null);
    setResizing(null);
  };

  useEffect(() => {
    if (draggedEvent || resizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedEvent, resizing, dragStartY]);

  const displayEvents = draggedEvent
    ? events.map(e => e.id === draggedEvent.id ? draggedEvent : e)
    : events;

  const sortedEvents = [...displayEvents].sort((a, b) => {
    const aStart = timeToMinutes(a.start_time);
    const bStart = timeToMinutes(b.start_time);
    return aStart - bStart;
  });

  const getEventColumns = () => {
    const columns: CalendarEvent[][] = [];

    sortedEvents.forEach(event => {
      const eventStart = timeToMinutes(event.start_time);
      const eventEnd = timeToMinutes(event.end_time);

      let placed = false;
      for (let col of columns) {
        const hasOverlap = col.some(e => {
          const eStart = timeToMinutes(e.start_time);
          const eEnd = timeToMinutes(e.end_time);
          return eventStart < eEnd && eventEnd > eStart;
        });

        if (!hasOverlap) {
          col.push(event);
          placed = true;
          break;
        }
      }

      if (!placed) {
        columns.push([event]);
      }
    });

    return columns;
  };

  const eventColumns = getEventColumns();
  const totalColumns = eventColumns.length;

  return (
    <div className="relative h-full overflow-y-auto bg-white" ref={timelineRef}>
      <div className="relative" style={{ height: `${HOUR_HEIGHT * 24}px` }}>
        {hours.map((hour) => (
          <div
            key={hour}
            className="absolute w-full border-b border-slate-200"
            style={{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
          >
            <div className="absolute -top-3 left-2 px-2 bg-white text-xs font-medium text-slate-500 z-20">
              {String(hour).padStart(2, '0')}:00
            </div>
            <div
              className="absolute w-full border-b border-slate-100"
              style={{ top: `${HOUR_HEIGHT / 2}px` }}
            />
          </div>
        ))}

        <div className="absolute left-16 right-0 top-0 bottom-0">
          {eventColumns.map((column, colIndex) =>
            column.map((event) => {
              const { top, height } = getEventPosition(event.start_time, event.end_time);
              const isDragging = draggedEvent?.id === event.id;
              const width = `calc((100% - 8px) / ${totalColumns})`;
              const left = `calc(${colIndex} * (100% - 8px) / ${totalColumns} + 4px)`;

              return (
                <div
                  key={event.id}
                  className={`absolute rounded-lg shadow-sm hover:shadow-lg transition-all cursor-move group border border-white/20 ${
                    isDragging ? 'opacity-80 scale-[1.02] z-50 shadow-2xl' : 'z-10'
                  }`}
                  style={{
                    top: `${top}px`,
                    height: `${Math.max(height, 30)}px`,
                    width,
                    left,
                    backgroundColor: event.color,
                  }}
                  onMouseDown={(e) => handleMouseDown(event, e)}
                  onClick={() => !isDragging && !resizing && onEventClick(event)}
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-white/40 transition rounded-t-lg"
                    onMouseDown={(e) => handleResizeStart(event, 'start', e)}
                  />

                  <div className="px-2 py-1 h-full flex flex-col overflow-hidden">
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          {event.event_type_icon && (
                            <span className="text-xs flex-shrink-0">{event.event_type_icon}</span>
                          )}
                          <h4 className="font-semibold text-white text-xs truncate leading-tight">
                            {event.title}
                          </h4>
                        </div>
                        <p className="text-[10px] text-white/90 font-medium mt-0.5">
                          {event.start_time?.slice(0, 5)} - {event.end_time?.slice(0, 5)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventDelete(event.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-white/80 hover:text-white transition flex-shrink-0"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    {height > 50 && event.event_type_name && (
                      <p className="text-[10px] text-white/80 mt-1 truncate">
                        {event.event_type_name}
                      </p>
                    )}
                  </div>

                  <div
                    className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-white/40 transition rounded-b-lg"
                    onMouseDown={(e) => handleResizeStart(event, 'end', e)}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
