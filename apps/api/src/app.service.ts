import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DrizzleService } from './database/drizzle.service';

export type SampleResponse = {
  message: string;
  servedAt: string;
};

export type HealthResponse = {
  ok: true;
  revision: string | null;
};

@Injectable()
export class AppService {
  constructor(private readonly drizzle: DrizzleService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getHealth(): Promise<HealthResponse> {
    try {
      await this.drizzle.ping();
    } catch {
      throw new ServiceUnavailableException('database unavailable');
    }
    return { ok: true, revision: this.getRevision() };
  }

  /** Coolify `SOURCE_COMMIT`, Railway git SHA, or `GIT_SHA` build arg. */
  private getRevision(): string | null {
    const revision =
      process.env.SOURCE_COMMIT?.trim() ||
      process.env.RAILWAY_GIT_COMMIT_SHA?.trim() ||
      process.env.GIT_SHA?.trim();
    return revision || null;
  }

  getSample(): SampleResponse {
    return {
      message: 'Sample API response',
      servedAt: new Date().toISOString(),
    };
  }

  /** Used by the web app to demo `AbortSignal` + Axios cancel (long delay). */
  async getSlow(): Promise<{ ok: true }> {
    await new Promise((resolve) => setTimeout(resolve, 25_000));
    return { ok: true };
  }
}
