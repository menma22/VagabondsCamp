import { useState } from 'react';
import { Info, Plus, Trash2, Edit2, Check, X, Sparkles } from 'lucide-react';

interface SharedInfoItem {
  id: string;
  text: string;
  category?: string;
}

interface SharedInformationProps {
  items: SharedInfoItem[];
  onUpdate: (items: SharedInfoItem[]) => void;
}

export function SharedInformation({ items, onUpdate }: SharedInformationProps) {
  const [newItemText, setNewItemText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const addItem = () => {
    if (!newItemText.trim()) return;

    const newItem: SharedInfoItem = {
      id: Date.now().toString(),
      text: newItemText.trim(),
    };

    onUpdate([...items, newItem]);
    setNewItemText('');
  };

  const startEdit = (item: SharedInfoItem) => {
    setEditingId(item.id);
    setEditText(item.text);
  };

  const saveEdit = (id: string) => {
    if (!editText.trim()) return;

    onUpdate(
      items.map((item) =>
        item.id === id ? { ...item, text: editText.trim() } : item
      )
    );
    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const deleteItem = (id: string) => {
    onUpdate(items.filter((item) => item.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      addItem();
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
    if (e.key === 'Enter') {
      saveEdit(id);
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  return (
    <div className="relative bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 rounded-2xl shadow-lg p-6 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.3),transparent_50%),radial-gradient(circle_at_70%_70%,rgba(255,255,255,0.2),transparent_50%)] pointer-events-none"></div>
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-white/30 backdrop-blur-sm p-3 rounded-xl">
            <Info className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Topic</h2>
            <p className="text-sm text-white/80">会議で共有された情報</p>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="情報を追加..."
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

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 text-white/40 mx-auto mb-3" />
              <p className="text-white/80">まだ情報共有がありません</p>
              <p className="text-white/60 text-sm mt-1">
                文字起こし完了後、AIが自動で抽出します
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-4 bg-white rounded-lg hover:shadow-md transition group"
              >
                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-cyan-500 mt-2"></div>

                {editingId === item.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => handleEditKeyDown(e, item.id)}
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => saveEdit(item.id)}
                      className="text-cyan-600 hover:text-cyan-700 hover:scale-110 transition-transform"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="text-slate-400 hover:text-slate-600 hover:scale-110 transition-transform"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="flex-1 text-slate-900 font-medium leading-relaxed">
                      {item.text}
                    </p>
                    <button
                      onClick={() => startEdit(item)}
                      className="flex-shrink-0 text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="flex-shrink-0 text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
