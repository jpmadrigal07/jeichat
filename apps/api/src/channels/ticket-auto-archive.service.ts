import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ChannelsService } from './channels.service';

/** Hourly sweep for Done tickets that have passed the workspace archive delay. */
@Injectable()
export class TicketAutoArchiveService {
  private readonly logger = new Logger(TicketAutoArchiveService.name);

  constructor(private readonly channelsService: ChannelsService) {}

  @Cron('0 * * * *')
  async sweep(): Promise<void> {
    const count = await this.channelsService.archiveStaleDoneTickets();
    if (count === 0) return;
    this.logger.log(`Auto-archived ${count} Done ticket(s)`);
  }
}
