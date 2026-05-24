import { redirect } from 'next/navigation';
import { AuthPanel } from '@/components/auth-panel';
import { getServerSession } from '@/lib/auth-server';

export default async function Home() {
  const initialSession = await getServerSession();

  if (initialSession?.data?.user) {
    redirect('/w');
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-lg min-w-0 px-1">
        <AuthPanel initialSession={initialSession} />
      </div>
    </main>
  );
}