import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth-server';
import { AccountSettings } from './_components/account-settings';

export default async function SettingsPage() {
  const session = await getServerSession();
  const user = session?.data?.user;
  if (!user) redirect('/');

  return <AccountSettings user={user} />;
}
