import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth-server';
import { ChatShell } from './chat-shell';

export async function ChatShellFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session?.data?.user) {
    redirect('/login');
  }

  return <ChatShell user={session.data.user}>{children}</ChatShell>;
}
