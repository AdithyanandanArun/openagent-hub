import { Check, LogOut, MessageSquare, Pencil, Plus, Trash2, X } from "lucide-react";
import { FormEvent, useState } from "react";
import clsx from "clsx";
import type { AuthUser } from "../types/auth";
import type { Conversation } from "../types/chat";

interface SidebarProps {
  isOpen: boolean;
  conversations: Conversation[];
  activeConversationId: string | null;
  user: AuthUser;
  onSelect: (conversationId: string) => void;
  onNew: () => Promise<void>;
  onDelete: (conversationId: string) => Promise<void>;
  onRename: (conversationId: string, title: string) => Promise<void>;
  onLogout: () => void;
}

export default function Sidebar({
  isOpen,
  conversations,
  activeConversationId,
  user,
  onSelect,
  onNew,
  onDelete,
  onRename,
  onLogout,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  function beginRename(conversation: Conversation) {
    setEditingId(conversation.id);
    setDraftTitle(conversation.title);
  }

  async function submitRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId || !draftTitle.trim()) return;
    await onRename(editingId, draftTitle.trim());
    setEditingId(null);
  }

  return (
    <aside
      className={clsx(
        "z-20 flex h-dvh shrink-0 flex-col border-r border-white/10 bg-ink-900 transition-all duration-200",
        isOpen ? "w-80" : "w-0 overflow-hidden"
      )}
      aria-label="Conversations"
    >
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-mint-400 text-ink-950">
          <MessageSquare size={20} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user.email}</p>
          <p className="text-xs text-slate-400">Workspace</p>
        </div>
      </div>

      <div className="p-3">
        <button
          type="button"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-mint-400 px-3 text-sm font-semibold text-ink-950 transition hover:bg-mint-300"
          onClick={() => void onNew()}
        >
          <Plus size={18} aria-hidden="true" />
          New chat
        </button>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
        {conversations.map((conversation) => {
          const isActive = conversation.id === activeConversationId;
          const isEditing = conversation.id === editingId;
          return (
            <div
              key={conversation.id}
              className={clsx(
                "group rounded-md border border-transparent",
                isActive ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"
              )}
            >
              {isEditing ? (
                <form className="flex items-center gap-1 p-1" onSubmit={submitRename}>
                  <input
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    className="h-9 min-w-0 flex-1 rounded border border-mint-300/40 bg-ink-950 px-2 text-sm outline-none"
                    autoFocus
                  />
                  <button className="grid h-9 w-9 place-items-center rounded hover:bg-white/10" aria-label="Save title">
                    <Check size={16} />
                  </button>
                  <button
                    type="button"
                    className="grid h-9 w-9 place-items-center rounded hover:bg-white/10"
                    aria-label="Cancel rename"
                    onClick={() => setEditingId(null)}
                  >
                    <X size={16} />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="flex h-11 min-w-0 flex-1 items-center gap-2 px-2 text-left"
                    onClick={() => onSelect(conversation.id)}
                    title={conversation.title}
                  >
                    <MessageSquare size={16} className="shrink-0 text-slate-400" />
                    <span className="truncate text-sm">{conversation.title}</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Rename conversation"
                    title="Rename"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded text-slate-400 opacity-100 transition hover:bg-white/10 hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
                    onClick={() => beginRename(conversation)}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete conversation"
                    title="Delete"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded text-slate-400 opacity-100 transition hover:bg-coral-500/10 hover:text-coral-400 sm:opacity-0 sm:group-hover:opacity-100"
                    onClick={() => {
                      if (window.confirm("Delete this conversation?")) {
                        void onDelete(conversation.id);
                      }
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-md text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
          onClick={onLogout}
        >
          <LogOut size={18} aria-hidden="true" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
