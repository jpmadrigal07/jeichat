import {
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AllowAnonymous, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Request, Response } from 'express';
import type { auth } from '../../auth/auth';
import { GithubIntegrationService } from './github.service';
import { verifyGithubInstallState, verifyGithubWebhookSignature } from './github-crypto';

type RawBodyRequest = Request & { rawBody?: Buffer };

const GITHUB_INSTALL_STATE_COOKIE = 'github_install_state';

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [key, ...valueParts] = part.trim().split('=');
    if (key === name) {
      return decodeURIComponent(valueParts.join('='));
    }
  }
  return undefined;
}

@Controller('integrations/github')
export class GithubIntegrationController {
  constructor(private readonly github: GithubIntegrationService) {}

  @Get('status')
  @AllowAnonymous()
  getStatus() {
    return { configured: this.github.isConfigured() };
  }

  @Get('begin')
  @AllowAnonymous()
  async beginInstall(
    @Query('state') stateToken: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const token = stateToken?.trim();
    if (!token) {
      return res.status(400).type('text/plain').send('Missing connect state');
    }
    try {
      verifyGithubInstallState(token);
    } catch {
      return res
        .status(400)
        .type('text/plain')
        .send(
          'Invalid or expired connect link. In JeiChat run `@github connect owner repo` again or use Channel settings → GitHub.',
        );
    }
    const secure =
      req.secure ||
      req.headers['x-forwarded-proto'] === 'https' ||
      process.env.NODE_ENV === 'production';
    res.cookie(GITHUB_INSTALL_STATE_COOKIE, token, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/integrations/github',
    });
    return res.redirect(this.github.getInstallRedirectUrl(token));
  }

  @Get('install')
  async startInstall(
    @Query('workspaceId') workspaceId: string,
    @Query('channelId') channelId: string,
    @Query('owner') owner: string,
    @Query('repo') repo: string,
    @Session() session: UserSession<typeof auth>,
    @Res() res: Response,
  ) {
    const { beginUrl } = await this.github.startInstall(
      workspaceId,
      channelId,
      session.user.id,
      owner,
      repo,
    );
    return res.redirect(beginUrl);
  }

  @Get('callback')
  @AllowAnonymous()
  async callback(
    @Req() req: Request,
    @Query('installation_id') installationIdRaw: string,
    @Query('state') stateQuery: string | undefined,
    @Res() res: Response,
  ) {
    const installationId = Number(installationIdRaw);
    const state =
      stateQuery?.trim() ||
      readCookie(req, GITHUB_INSTALL_STATE_COOKIE)?.trim();
    if (!Number.isFinite(installationId) || !state) {
      return res
        .status(400)
        .type('text/plain')
        .send(
          'Missing connect state. In JeiChat run `@github connect owner repo` (or Channel settings → GitHub → Connect), open that link, then finish on GitHub. Saving the GitHub installation page alone does not link the channel.',
        );
    }
    res.clearCookie(GITHUB_INSTALL_STATE_COOKIE, {
      path: '/integrations/github',
    });
    try {
      const result = await this.github.completeInstall(installationId, state);
      return res.redirect(result.redirect);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'GitHub connect failed';
      return res.status(400).send(message);
    }
  }

  @Post('workspaces/:workspaceId/channels/:channelId/connect')
  async createConnectLink(
    @Param('workspaceId') workspaceId: string,
    @Param('channelId') channelId: string,
    @Query('owner') owner: string,
    @Query('repo') repo: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    const { beginUrl } = await this.github.startInstall(
      workspaceId,
      channelId,
      session.user.id,
      owner,
      repo,
    );
    return { beginUrl };
  }

  @Get('workspaces/:workspaceId/links')
  listWorkspaceLinks(
    @Param('workspaceId') workspaceId: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.github.listWorkspaceLinks(workspaceId, session.user.id);
  }

  @Get('workspaces/:workspaceId/channels/:channelId/link')
  getChannelLink(
    @Param('workspaceId') workspaceId: string,
    @Param('channelId') channelId: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.github.getChannelLink(workspaceId, channelId, session.user.id);
  }

  @Delete('workspaces/:workspaceId/channels/:channelId/link')
  disconnect(
    @Param('workspaceId') workspaceId: string,
    @Param('channelId') channelId: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.github.disconnectChannel(
      workspaceId,
      channelId,
      session.user.id,
    );
  }

  @Get('tickets/:ticketChannelId/pull-requests')
  listTicketPrs(
    @Param('ticketChannelId') ticketChannelId: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.github.listTicketPullRequests(
      ticketChannelId,
      session.user.id,
    );
  }

  @Post('webhook')
  @AllowAnonymous()
  @HttpCode(200)
  async webhook(
    @Req() req: RawBodyRequest,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Headers('x-github-event') event: string | undefined,
    @Headers('x-github-delivery') deliveryId: string | undefined,
  ) {
    const raw = req.rawBody;
    if (!raw || !verifyGithubWebhookSignature(raw, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
    const payload = JSON.parse(raw.toString('utf8')) as unknown;
    if (event) {
      await this.github.handleWebhookEvent(event, payload, deliveryId);
    }
    return { ok: true };
  }
}
