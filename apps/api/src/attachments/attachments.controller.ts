import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { auth } from '../auth/auth';
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
}
