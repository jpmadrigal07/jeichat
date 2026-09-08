import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth-server';
import { AuthPage } from '@/app/_components/auth-page';

export default async function LoginPage() {
  const session = await getServerSession();
  if (session?.data?.user) redirect('/w');

  return <AuthPage mode="sign-in" initialSession={session} />;
}
