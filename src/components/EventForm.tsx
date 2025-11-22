import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { X, Calendar as CalendarIcon, Clock, Tag, Type, Plus } from 'lucide-react';

interface EventFormProps {
  date: Date;
  onClose: () => void;
  onSave: (event: {
    title: string;
    description: string;
    event_date: string;
    start_time: string;
    end_time: string;
    color: string;
    event_type: string;
  }) => void;
  initialEvent?: {
    id: string;
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    color: string;
    event_type: string;
  } | null;
}

interface EventType {
  id: string;
  name: string;
  icon: string;
  is_custom: boolean;
}

const EVENT_COLORS = [
  { name: '青', value: '#3b82f6' },
  { name: '緑', value: '#10b981' },
  { name: '紫', value: '#8b5cf6' },
  { name: '赤', value: '#ef4444' },
  { name: 'オレンジ', value: '#f97316' },
  { name: 'ピンク', value: '#ec4899' },
  { name: 'シアン', value: '#06b6d4' },
  { name: '黄色', value: '#eab308' },
];

export function EventForm({ date, onClose, onSave, initialEvent }: EventFormProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(initialEvent?.title || '');
  const [description, setDescription] = useState(initialEvent?.description || '');
  const [startTime, setStartTime] = useState(initialEvent?.start_time || '09:00');
  const [endTime, setEndTime] = useState(initialEvent?.end_time || '10:00');
  const [color, setColor] = useState(initialEvent?.color || '#3b82f6');
  const [eventType, setEventType] = useState(initialEvent?.event_type || '');
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [showCreateType, setShowCreateType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeIcon, setNewTypeIcon] = useState('📝');

  const commonIcons = ['💼', '✅', '🎉', '⏰', '🔔', '📝', '📅', '🎯', '💡', '🏃', '🎓', '🏠', '🍽️', '✈️', '🎵', '🎨'];

  useEffect(() => {
    loadEventTypes();
  }, [user]);

  const loadEventTypes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('event_types')
        .select('*')
        .order('is_custom', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setEventTypes(data || []);

      if (!eventType && data && data.length > 0) {
        setEventType(data[0].id);
      }
    } catch (error) {
      console.error('Error loading event types:', error);
    }
  };

  const handleCreateEventType = async () => {
    if (!user || !newTypeName.trim()) return;

    try {
      const { error } = await supabase.from('event_types').insert({
        user_id: user.id,
        name: newTypeName.trim(),
        icon: newTypeIcon,
        is_custom: true,
      });

      if (error) throw error;

      setNewTypeName('');
      setNewTypeIcon('📝');
      setShowCreateType(false);
      await loadEventTypes();
    } catch (error) {
      console.error('Error creating event type:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const eventDate = `${year}-${month}-${day}`;

    onSave({
      title: title.trim(),
      description: description.trim(),
      event_date: eventDate,
      start_time: startTime,
      end_time: endTime,
      color,
      event_type: eventType,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">
              {initialEvent ? '予定を編集' : '新しい予定'}
            </h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition p-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-2">
              <Type className="w-4 h-4 text-blue-600" />
              タイトル
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="予定のタイトルを入力"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-2">
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              日付
            </label>
            <div className="px-4 py-3 bg-slate-100 rounded-lg text-slate-900 font-medium">
              {date.getFullYear()}年{date.getMonth() + 1}月{date.getDate()}日
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-2">
                <Clock className="w-4 h-4 text-blue-600" />
                開始時刻
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-2">
                <Clock className="w-4 h-4 text-blue-600" />
                終了時刻
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-3">
              <Tag className="w-4 h-4 text-blue-600" />
              イベントタイプ
            </label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {eventTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setEventType(type.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    eventType === type.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span className="mr-1">{type.icon}</span>
                  {type.name}
                </button>
              ))}
            </div>

            {!showCreateType ? (
              <button
                type="button"
                onClick={() => setShowCreateType(true)}
                className="w-full px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                新しいタイプを作成
              </button>
            ) : (
              <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                <div>
                  <input
                    type="text"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    placeholder="タイプ名を入力"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-2">アイコンを選択</p>
                  <div className="grid grid-cols-8 gap-2">
                    {commonIcons.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setNewTypeIcon(icon)}
                        className={`p-2 text-xl rounded-lg transition ${
                          newTypeIcon === icon
                            ? 'bg-blue-600 scale-110'
                            : 'bg-white hover:bg-slate-100'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateType(false);
                      setNewTypeName('');
                      setNewTypeIcon('📝');
                    }}
                    className="flex-1 px-3 py-2 bg-white text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 transition"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateEventType}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                  >
                    作成
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-3">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }}></div>
              カラー
            </label>
            <div className="flex flex-wrap gap-3">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-10 h-10 rounded-full transition-all ${
                    color === c.value
                      ? 'ring-4 ring-offset-2 ring-slate-400 scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-900 mb-2 block">
              詳細説明（任意）
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="予定の詳細を入力"
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-cyan-700 transition shadow-lg"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
