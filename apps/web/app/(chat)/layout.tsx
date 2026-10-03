import { getServerSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { DocumentTitle } from './_components/document-title';
import { PushNotificationsHost } from './_components/push-notifications-host';
import { VoiceProvider } from './_hooks/use-voice';

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session?.data?.user) {
    redirect('/login');
  }

  return (
    <VoiceProvider>
      <DocumentTitle />
      <PushNotificationsHost />
      {children}
    </VoiceProvider>
  );
}
