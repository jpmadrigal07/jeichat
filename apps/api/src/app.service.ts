import { Injectable } from '@nestjs/common';

export type SampleResponse = {
  message: string;
  servedAt: string;
};

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
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
