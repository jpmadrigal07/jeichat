import { Controller, Get } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { AppService, type SampleResponse } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @AllowAnonymous()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('sample')
  @AllowAnonymous()
  getSample(): SampleResponse {
    return this.appService.getSample();
  }

  @Get('demo/slow')
  @AllowAnonymous()
  getSlow(): Promise<{ ok: true }> {
    return this.appService.getSlow();
  }
}
