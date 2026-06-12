/**
 * FEATURE 4: Chat Page
 * ============================================================
 * Drop this file at: app/chat/page.tsx
 *
 * AGENT INSTRUCTIONS:
 *   - This is a Next.js App Router page.
 *   - It reads an optional `?c=<conversationId>` query param to
 *     pre-load a conversation (useful for deep-linking).
 *   - Add a link to /chat in your app's main navigation.
 *   - Auth protection: wrap this route in your auth middleware
 *     or use Next.js middleware.ts to redirect unauthenticated users.
 *
 * Navigation integration example (for your existing layout/nav):
 *   <Link href="/chat">Chat</Link>
 * ============================================================
 */

import { Suspense } from 'react';
import { ChatInterface } from '@/components/ChatInterface'; // adjust alias

// AGENT: if you have an auth check utility, add it here:
// import { requireAuth } from '@/lib/auth';
// export default async function ChatPage() {
//   await requireAuth(); // redirects to /auth/login if not authed
//   ...

interface ChatPageProps {
  searchParams: { c?: string };
}

export default function ChatPage({ searchParams }: ChatPageProps) {
  return (
    <Suspense fallback={<ChatLoadingSkeleton />}>
      <ChatInterface initialConversationId={searchParams.c} />
    </Suspense>
  );
}

function ChatLoadingSkeleton() {
  return (
    <div className="flex h-screen bg-white animate-pulse">
      <div className="w-64 bg-gray-100 border-r border-gray-200" />
      <div className="flex-1 flex flex-col">
        <div className="h-14 bg-gray-50 border-b border-gray-200" />
        <div className="flex-1 p-4 flex flex-col gap-3">
          <div className="self-end w-48 h-8 bg-gray-100 rounded-2xl" />
          <div className="self-start w-72 h-16 bg-gray-100 rounded-2xl" />
          <div className="self-end w-32 h-8 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Chat — LLM Worker',
};
