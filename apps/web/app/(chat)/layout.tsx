import { getServerSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { WorkspaceSidebar } from './_components/workspace-sidebar';
import { ChannelSidebar } from './_components/channel-sidebar';

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session?.data?.user) {
    redirect('/');
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <WorkspaceSidebar user={session.data.user} />
      <ChannelSidebar />
      <main className="flex flex-1 flex-col min-w-0">{children}</main>
    </div>
  );
}
