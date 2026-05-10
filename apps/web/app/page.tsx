import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AuthPanel } from '@/components/auth-panel';
import { HttpBehaviorDemos } from '@/components/http-behavior-demos';
import { SampleRequestCard } from '@/components/sample-request-card';

export default function Home() {
  return (
    <div className="flex flex-col gap-6 p-8">
      <AuthPanel />

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

      <SampleRequestCard />

      <HttpBehaviorDemos />
    </div>
  );
}