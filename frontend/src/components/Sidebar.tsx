import { useState } from 'react';
import { Plus, MessageSquare, Trash2, Edit2, Check, X, Search } from 'lucide-react';
import clsx from 'clsx';
import { Conversation } from '../services/chat';

interface Props {
  conversations: Conversation[];
  currentId?: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  username: string;
  onLogout: () => void;
}

function groupByDate(convs: Conversation[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const lastWeek = today - 7 * 86400000;

  const groups: { label: string; items: Conversation[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Last 7 days', items: [] },
    { label: 'Older', items: [] },
  ];

  for (const c of convs) {
    const t = new Date(c.updated_at).getTime();
    if (t >= today) groups[0].items.push(c);
    else if (t >= yesterday) groups[1].items.push(c);
    else if (t >= lastWeek) groups[2].items.push(c);
    else groups[3].items.push(c);
  }

  return groups.filter((g) => g.items.length > 0);
}

export function Sidebar({ conversations, currentId, onSelect, onNew, onDelete, onRename, username, onLogout }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [search, setSearch] = useState('');

  const startEdit = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(title);
  };

  const confirmEdit = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) onRename(id, editTitle.trim());
    setEditingId(null);
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const filtered = search.trim()
    ? conversations.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))
    : conversations;
  const groups = groupByDate(filtered);

  return (
    <div className="w-64 bg-zinc-950 flex flex-col h-full border-r border-zinc-800 flex-shrink-0">
      <div className="p-3 border-b border-zinc-800">
        <span className="text-sm font-semibold text-zinc-300 px-2">OpenAgent Hub</span>
      </div>

      <div className="p-2 flex flex-col gap-1.5">
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-sm transition-colors"
        >
          <Plus size={15} />
          New Chat
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 focus-within:border-zinc-600 transition-colors">
          <Search size={12} className="text-zinc-500 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="flex-1 bg-transparent text-xs text-zinc-300 placeholder-zinc-600 outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {groups.length === 0 ? (
          <p className="text-zinc-600 text-xs text-center py-8">No conversations yet</p>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="mb-3">
              <p className="text-zinc-600 text-xs px-2 py-1 font-medium uppercase tracking-wide">
                {group.label}
              </p>
              {group.items.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => onSelect(conv.id)}
                  className={clsx(
                    'group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-colors',
                    currentId === conv.id
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  )}
                >
                  <MessageSquare size={13} className="flex-shrink-0" />

                  {editingId === conv.id ? (
                    <div className="flex-1 flex items-center gap-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmEdit(conv.id, e as unknown as React.MouseEvent);
                          if (e.key === 'Escape') cancelEdit(e as unknown as React.MouseEvent);
                        }}
                        className="flex-1 min-w-0 bg-zinc-700 rounded px-1.5 py-0.5 text-xs text-white outline-none"
                      />
                      <button onClick={(e) => confirmEdit(conv.id, e)} className="text-emerald-400 hover:text-emerald-300 flex-shrink-0">
                        <Check size={12} />
                      </button>
                      <button onClick={cancelEdit} className="text-red-400 hover:text-red-300 flex-shrink-0">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 truncate text-xs">{conv.title}</span>
                      <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
                        <button
                          onClick={(e) => startEdit(conv.id, conv.title, e)}
                          className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300"
                        >
                          <Edit2 size={11} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
                          className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-red-400"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <div className="p-3 border-t border-zinc-800 flex items-center justify-between">
        <span className="text-xs text-zinc-400 truncate mr-2">{username}</span>
        <button onClick={onLogout} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0">
          Sign out
        </button>
      </div>
    </div>
  );
}
