import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { fetchSample } from '@/lib/sample';

export default async function Home() {
  const sample = await fetchSample();

  return (
    <div className="flex flex-col gap-6 p-8">
      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle>Project Overview</CardTitle>
          <CardDescription>
            Track progress and recent activity for your Next.js app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          Your design system is ready. Start building your next component.
        </CardContent>
      </Card>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Sample API request</CardTitle>
          <CardDescription>
            Server-rendered call to <code className="text-xs">GET /sample</code>{' '}
            via <code className="text-xs">@/lib/api</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {sample.ok ? (
            <>
              <p>
                <span className="text-muted-foreground">message:</span>{' '}
                {sample.data.message}
              </p>
              <p>
                <span className="text-muted-foreground">servedAt:</span>{' '}
                <code className="text-xs">{sample.data.servedAt}</code>
              </p>
            </>
          ) : (
            <p className="text-destructive">
              {sample.error} — start the API (e.g.{' '}
              <code className="text-xs">bun run dev</code> from the repo root)
              and set <code className="text-xs">NEXT_PUBLIC_API_URL</code> in{' '}
              <code className="text-xs">.env</code>.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}