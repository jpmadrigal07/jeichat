import { redirect } from 'next/navigation';

export default async function WorkspaceSettingsIndexPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  redirect(`/w/${workspaceId}/settings/info`);
}
