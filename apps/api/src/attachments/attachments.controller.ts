import { finished } from 'node:stream/promises';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Request, Response } from 'express';
import type { auth } from '../auth/auth';
import { pipeStorageObject } from '../storage/storage.service';
import { AttachmentsService } from './attachments.service';
import { validatePresignUploadDto } from './dto/presign-upload.dto';

@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Post('presign')
  presign(@Session() session: UserSession<typeof auth>, @Body() body: unknown) {
    const dto = validatePresignUploadDto(body);
    return this.attachments.presignUpload(session.user.id, dto);
  }

  @Get(':id/download-url')
  download(
    @Session() session: UserSession<typeof auth>,
    @Param('id') id: string,
  ) {
    return this.attachments.getDownloadUrl(session.user.id, id);
  }

  @Get(':id')
  async file(
    @Session() session: UserSession<typeof auth>,
    @Param('id') id: string,
    @Query('download') download: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const rangeHeader = req.headers.range;
    const range = Array.isArray(rangeHeader) ? rangeHeader[0] : rangeHeader;
    const { object, contentDisposition } = await this.attachments.streamFile(
      session.user.id,
      id,
      {
        download: download === '1' || download === 'true',
        range,
      },
    );

    pipeStorageObject(res, object, {
      cacheControl: 'private, max-age=86400, immutable',
      contentDisposition,
    });
    try {
      await finished(res);
    } catch {
      // Client disconnected before the stream finished.
    }
  }
}
