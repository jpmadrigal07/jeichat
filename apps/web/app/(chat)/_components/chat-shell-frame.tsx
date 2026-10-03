import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth-server';
import { ChatShell } from './chat-shell';

export async function ChatShellFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  // Layouts render in parallel, so this can run alongside the parent layout's
  // own redirect. `getServerSession` returns an empty session when the API is
  // unreachable (e.g. still starting under `bun dev`); don't crash on it.
  if (!session?.data?.user) redirect('/login');

  return <ChatShell user={session.data.user}>{children}</ChatShell>;
}
