import { useState } from 'react';
import { CheckCircle2, Circle, Plus, Trash2, ListTodo } from 'lucide-react';

interface ActionItem {
  id: string;
  text: string;
  completed: boolean;
}

interface ActionItemsProps {
  items: ActionItem[];
  onUpdate: (items: ActionItem[]) => void;
}

export function ActionItems({ items, onUpdate }: ActionItemsProps) {
  const [newItemText, setNewItemText] = useState('');

  const addItem = () => {
    if (!newItemText.trim()) return;

    const newItem: ActionItem = {
      id: Date.now().toString(),
      text: newItemText.trim(),
      completed: false,
    };

    onUpdate([...items, newItem]);
    setNewItemText('');
  };

  const toggleItem = (id: string) => {
    onUpdate(
      items.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const deleteItem = (id: string) => {
    onUpdate(items.filter((item) => item.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      addItem();
    }
  };

  const completedCount = items.filter((item) => item.completed).length;
  const totalCount = items.length;

  return (
    <div className="relative bg-gradient-to-br from-cyan-400 via-cyan-300 to-cyan-500 rounded-2xl shadow-lg p-6 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.3),transparent_50%),radial-gradient(circle_at_70%_70%,rgba(255,255,255,0.2),transparent_50%)] pointer-events-none"></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/30 backdrop-blur-sm p-3 rounded-xl">
              <ListTodo className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">TODOリスト</h2>
              <p className="text-sm text-white/80">
                {totalCount > 0 ? `${completedCount} / ${totalCount} 完了` : 'やるべきことを管理'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="新しい項目を追加..."
              className="flex-1 px-4 py-3 bg-white/90 backdrop-blur-sm border-0 rounded-lg focus:ring-2 focus:ring-white/50 outline-none placeholder:text-slate-400 text-slate-900"
            />
            <button
              onClick={addItem}
              className="px-4 py-3 bg-white/30 backdrop-blur-sm text-white rounded-lg hover:bg-white/40 transition flex items-center justify-center"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ListTodo className="w-12 h-12 text-white/40 mx-auto mb-3" />
              <p className="text-white/80">まだTODOがありません</p>
              <p className="text-white/60 text-sm mt-1">
                文字起こし完了後、AIが自動で抽出します
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-3 p-4 bg-white rounded-lg hover:shadow-md transition group ${
                  item.completed ? 'opacity-60' : ''
                }`}
              >
                <button
                  onClick={() => toggleItem(item.id)}
                  className="flex-shrink-0 text-cyan-500 hover:scale-110 transition-transform mt-0.5"
                >
                  {item.completed ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <Circle className="w-6 h-6" />
                  )}
                </button>
                <p
                  className={`flex-1 text-slate-900 font-medium leading-relaxed ${
                    item.completed ? 'line-through' : ''
                  }`}
                >
                  {item.text}
                </p>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="flex-shrink-0 text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))
          )}
        </div>

        {totalCount > 0 && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="flex items-center justify-between text-sm text-white/90">
              <span>進捗状況</span>
              <span className="font-bold">
                {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
              </span>
            </div>
            <div className="mt-2 h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/90 rounded-full transition-all duration-500"
                style={{
                  width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
