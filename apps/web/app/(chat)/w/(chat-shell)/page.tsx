import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth-server';
import { headers } from 'next/headers';

export default async function WorkspaceIndexPage() {
  const session = await getServerSession();
  if (!session?.data?.user) redirect('/');

  const h = await headers();
  const cookie = h.get('cookie') ?? '';

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/workspaces`, {
      headers: { Cookie: cookie },
      cache: 'no-store',
    });
    if (res.ok) {
      const workspaces = await res.json();
      if (workspaces.length > 0) {
        redirect(`/w/${workspaces[0].id}/c/general`);
      }
    }
  } catch {
    // Fall through to empty state
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Welcome to JeiChat</h2>
        <p className="text-sm text-muted-foreground">
          Create a workspace to get started.
        </p>
      </div>
    </div>
  );
}
