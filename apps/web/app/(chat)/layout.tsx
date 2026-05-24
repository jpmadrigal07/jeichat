import { getServerSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session?.data?.user) {
    redirect('/');
  }

  return children;
}
