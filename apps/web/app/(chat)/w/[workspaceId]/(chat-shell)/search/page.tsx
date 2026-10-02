import { getServerSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { SearchPageView } from './_components/search-page-view';

export default async function SearchPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const session = await getServerSession();
  if (!session?.data?.user) redirect('/login');

  const { workspaceId } = await params;
  return <SearchPageView workspaceId={workspaceId} />;
}
