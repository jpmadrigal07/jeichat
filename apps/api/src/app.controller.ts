import { Controller, Get } from '@nestjs/common';
import { AppService, type SampleResponse } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('sample')
  getSample(): SampleResponse {
    return this.appService.getSample();
  }
}
