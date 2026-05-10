import { redirect } from 'next/navigation';
import { AuthPanel } from '@/components/auth-panel';
import { getServerSession } from '@/lib/auth-server';

export default async function Home() {
  const initialSession = await getServerSession();

  if (initialSession?.data?.user) {
    redirect('/w');
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <AuthPanel initialSession={initialSession} />
    </div>
  );
}