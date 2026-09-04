import { redirect } from 'next/navigation';
import { AuthPanel, type AuthMode } from '@/components/auth-panel';
import { ThemeModeButton } from '@/components/theme-toggle';
import { getServerSession } from '@/lib/auth-server';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string | string[] }>;
}) {
  const initialSession = await getServerSession();

  if (initialSession?.data?.user) {
    redirect('/w');
  }

  const query = await searchParams;
  const raw = Array.isArray(query.mode) ? query.mode[0] : query.mode;
  const mode: AuthMode = raw === 'sign-up' ? 'sign-up' : 'sign-in';

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute right-4 top-4">
        <ThemeModeButton />
      </div>
      <AuthPanel mode={mode} initialSession={initialSession} />
    </main>
  );
}
