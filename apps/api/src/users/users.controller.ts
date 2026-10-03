import { finished } from 'node:stream/promises';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import { AllowAnonymous, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Response } from 'express';
import type { auth } from '../auth/auth';
import { pipeStorageObject } from '../storage/storage.service';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Patch('me')
  updateMe(
    @Session() session: UserSession<typeof auth>,
    @Body() body: { name?: string },
  ) {
    if (typeof body?.name !== 'string') {
      throw new BadRequestException('Name is required');
    }
    return this.users.updateName(session.user.id, body.name);
  }

  @Post('me/avatar/presign')
  presignAvatar(
    @Session() session: UserSession<typeof auth>,
    @Body()
    body: { filename?: string; contentType?: string; sizeBytes?: number },
  ) {
    if (
      typeof body?.filename !== 'string' ||
      typeof body.contentType !== 'string' ||
      typeof body.sizeBytes !== 'number'
    ) {
      throw new BadRequestException('Invalid request body');
    }
    return this.users.presignAvatar(session.user.id, {
      filename: body.filename,
      contentType: body.contentType,
      sizeBytes: body.sizeBytes,
    });
  }

  @Post('me/avatar')
  completeAvatar(
    @Session() session: UserSession<typeof auth>,
    @Body() body: { key?: string },
  ) {
    if (typeof body?.key !== 'string' || !body.key.trim()) {
      throw new BadRequestException('key is required');
    }
    return this.users.completeAvatar(session.user.id, body.key.trim());
  }

  @Get(':userId/avatar/:file')
  @AllowAnonymous()
  async avatar(
    @Param('userId') userId: string,
    @Param('file') file: string,
    @Res() res: Response,
  ) {
    const object = await this.users.getAvatarObject(userId, file);
    pipeStorageObject(res, object, {
      cacheControl: 'public, max-age=86400, immutable',
    });
    try {
      await finished(res);
    } catch {
      // Client disconnected before the stream finished.
    }
  }
}
