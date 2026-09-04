import { Controller, Get, Param, Query } from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { auth } from '../auth/auth';
import { SearchService } from './search.service';

@Controller('workspaces/:workspaceId/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @Param('workspaceId') workspaceId: string,
    @Query('q') q: string | undefined,
    @Query('limit') limit: string | undefined,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.searchService.search(
      workspaceId,
      session.user.id,
      q ?? '',
      limit ? parseInt(limit, 10) : undefined,
    );
  }
}
