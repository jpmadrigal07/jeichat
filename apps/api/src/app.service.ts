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
}
