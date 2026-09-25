import { getServerSession } from '@/lib/auth-server';
import { ChatShell } from './chat-shell';

export async function ChatShellFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  return <ChatShell user={session!.data!.user}>{children}</ChatShell>;
}
