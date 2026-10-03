import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle.service';
import {
  channelGithubRepos,
  channels,
  githubInstallations,
  githubPrLinks,
} from '../../database/schema';
import { ChannelsService } from '../../channels/channels.service';
import { WorkspacePermissionsService } from '../../workspaces/workspace-permissions.service';
import { WorkspacesService } from '../../workspaces/workspaces.service';
import {
  fetchInstallationAccount,
  repositoryAccessible,
} from './github-app.client';
import {
  signGithubInstallState,
  verifyGithubInstallState,
  type GithubInstallState,
} from './github-crypto';
import {
  extractTicketNumbers,
  resolvePullRequestAutomation,
  resolvePushAutomation,
  shouldApplyPushStatusAutomation,
} from './github-ticket-id';
import { ticketPrefixOf } from '../../channels/ticket-fields';
import { PERMISSIONS } from '../../workspaces/permissions';

const PROCESSED_DELIVERY_TTL_MS = 15 * 60 * 1000;

type PullRequestPayload = {
  action: string;
  pull_request: {
    number: number;
    title: string;
    html_url: string;
    draft: boolean;
    merged: boolean;
    state: string;
    head: { ref: string };
  };
  repository: {
    name: string;
    owner: { login: string };
  };
  installation?: { id: number };
};

type PushPayload = {
  ref: string;
  commits?: { message: string }[];
  repository: {
    name: string;
    owner: { login: string };
  };
  installation?: { id: number };
};

type InstallationPayload = {
  action: string;
  installation: {
    id: number;
    account: { login: string; type: string } | null;
  };
};

@Injectable()
export class GithubIntegrationService {
  private readonly logger = new Logger(GithubIntegrationService.name);
  private readonly processedDeliveries = new Map<string, number>();

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly channelsService: ChannelsService,
    private readonly workspacesService: WorkspacesService,
    private readonly workspacePermissionsService: WorkspacePermissionsService,
  ) {}

  isConfigured(): boolean {
    if (process.env.GITHUB_INTEGRATION_ENABLED === 'false') return false;
    return Boolean(
      process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY,
    );
  }

  assertConfigured() {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('GitHub integration is not configured');
    }
  }

  private appSlug(): string {
    const raw = process.env.GITHUB_APP_SLUG?.trim() || 'jeichat';
    const fromSettings = raw.match(
      /github\.com\/settings\/apps\/([^/?#]+)/i,
    )?.[1];
    if (fromSettings) return fromSettings;
    const fromApps = raw.match(/github\.com\/apps\/([^/?#]+)/i)?.[1];
    if (fromApps) return fromApps;
    return raw.replace(/^\/+|\/+$/g, '');
  }

  private webOrigin(): string {
    return (process.env.WEB_ORIGIN ?? 'http://localhost:3001').split(',')[0]!.trim();
  }

  private apiPublicUrl(): string {
    const explicit = process.env.GITHUB_PUBLIC_API_URL?.trim();
    if (explicit) return explicit.replace(/\/+$/, '');
    const port = process.env.PORT ?? '3002';
    return `http://localhost:${port}`;
  }

  private pruneDeliveries() {
    const cutoff = Date.now() - PROCESSED_DELIVERY_TTL_MS;
    for (const [id, at] of this.processedDeliveries) {
      if (at < cutoff) this.processedDeliveries.delete(id);
    }
  }

  private markDelivery(deliveryId: string | undefined): boolean {
    if (!deliveryId) return true;
    this.pruneDeliveries();
    if (this.processedDeliveries.has(deliveryId)) return false;
    this.processedDeliveries.set(deliveryId, Date.now());
    return true;
  }

  private async assertBoardChannel(
    workspaceId: string,
    channelId: string,
  ) {
    const [channel] = await this.drizzle.db
      .select()
      .from(channels)
      .where(
        and(eq(channels.id, channelId), eq(channels.workspaceId, workspaceId)),
      );
    if (!channel) throw new NotFoundException('Channel not found');
    if (channel.parentId) {
      throw new BadRequestException(
        'GitHub can only be linked to a ticket board channel',
      );
    }
    if (channel.channelType === 'dm') {
      throw new BadRequestException('Direct messages cannot link GitHub');
    }
    if (!channel.ticketKey?.trim()) {
      throw new BadRequestException(
        'Set a ticket key on this channel before connecting GitHub',
      );
    }
    return channel;
  }

  buildInstallState(input: Omit<GithubInstallState, 'nonce' | 'exp'>) {
    const payload: GithubInstallState = {
      ...input,
      owner: input.owner.trim(),
      repo: input.repo.trim().replace(/\.git$/i, ''),
      nonce: crypto.randomUUID(),
      exp: Date.now() + 15 * 60 * 1000,
    };
    return signGithubInstallState(payload);
  }

  getInstallRedirectUrl(state: string): string {
    return `https://github.com/apps/${this.appSlug()}/installations/new?state=${encodeURIComponent(state)}`;
  }

  async startInstall(
    workspaceId: string,
    channelId: string,
    userId: string,
    owner: string,
    repo: string,
  ) {
    this.assertConfigured();
    await this.workspacesService.verifyMembership(workspaceId, userId);
    await this.workspacePermissionsService.assertWorkspaceAdministrator(
      workspaceId,
      userId,
    );
    await this.assertBoardChannel(workspaceId, channelId);
    if (!owner.trim() || !repo.trim()) {
      throw new BadRequestException('owner and repo are required');
    }

    const ownerTrimmed = owner.trim();
    const repoTrimmed = repo.trim().replace(/\.git$/i, '');
    const stateToken = this.buildInstallState({
      workspaceId,
      channelId,
      userId,
      owner: ownerTrimmed,
      repo: repoTrimmed,
    });
    return {
      url: this.getInstallRedirectUrl(stateToken),
      stateToken,
      beginUrl: `${this.apiPublicUrl()}/integrations/github/begin?state=${encodeURIComponent(stateToken)}`,
    };
  }

  async completeInstall(installationId: number, stateToken: string) {
    this.assertConfigured();
    const state = verifyGithubInstallState(stateToken);
    await this.workspacePermissionsService.assertWorkspaceAdministrator(
      state.workspaceId,
      state.userId,
    );
    const board = await this.assertBoardChannel(
      state.workspaceId,
      state.channelId,
    );

    const account = await fetchInstallationAccount(installationId);
    const owner = state.owner.trim();
    const repo = state.repo.trim();
    const accessible = await repositoryAccessible(installationId, owner, repo);
    if (!accessible) {
      throw new BadRequestException(
        `GitHub app cannot access ${owner}/${repo}. Add the repository to the app installation.`,
      );
    }

    const [repoTaken] = await this.drizzle.db
      .select({ channelId: channelGithubRepos.channelId })
      .from(channelGithubRepos)
      .where(
        and(
          eq(channelGithubRepos.workspaceId, state.workspaceId),
          eq(channelGithubRepos.owner, owner),
          eq(channelGithubRepos.repo, repo),
        ),
      );
    if (repoTaken && repoTaken.channelId !== state.channelId) {
      throw new BadRequestException(
        'That repository is already linked to another channel in this workspace',
      );
    }

    const ticketKey = ticketPrefixOf(board);
    const now = new Date();
    const installationRowId = crypto.randomUUID();

    await this.drizzle.db.transaction(async (tx) => {
      await tx
        .insert(githubInstallations)
        .values({
          id: installationRowId,
          workspaceId: state.workspaceId,
          installationId,
          accountLogin: account.login,
          accountType: account.type,
          installedByUserId: state.userId,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: githubInstallations.workspaceId,
          set: {
            installationId,
            accountLogin: account.login,
            accountType: account.type,
            installedByUserId: state.userId,
            updatedAt: now,
          },
        });

      await tx
        .insert(channelGithubRepos)
        .values({
          id: crypto.randomUUID(),
          workspaceId: state.workspaceId,
          channelId: state.channelId,
          installationId,
          owner,
          repo,
          connectedByUserId: state.userId,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: channelGithubRepos.channelId,
          set: {
            installationId,
            owner,
            repo,
            connectedByUserId: state.userId,
            updatedAt: now,
          },
        });
    });

    await this.channelsService.recordAndPublishChannelEvents(
      state.channelId,
      null,
      [
        {
          type: 'github_repo_linked',
          actorId: state.userId,
          fromValue: null,
          toValue: { owner, repo, ticketKey },
          createdAt: now,
        },
      ],
    );

    const redirect = `${this.webOrigin()}/w/${state.workspaceId}/c/${state.channelId}/settings/github?connected=1`;
    return { redirect, owner, repo };
  }

  async disconnectChannel(
    workspaceId: string,
    channelId: string,
    userId: string,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, userId);
    await this.workspacePermissionsService.assertWorkspaceAdministrator(
      workspaceId,
      userId,
    );
    await this.assertBoardChannel(workspaceId, channelId);

    const [removed] = await this.drizzle.db
      .delete(channelGithubRepos)
      .where(
        and(
          eq(channelGithubRepos.workspaceId, workspaceId),
          eq(channelGithubRepos.channelId, channelId),
        ),
      )
      .returning();

    if (removed) {
      await this.channelsService.recordAndPublishChannelEvents(channelId, null, [
        {
          type: 'github_repo_unlinked',
          actorId: userId,
          fromValue: { owner: removed.owner, repo: removed.repo },
          toValue: null,
        },
      ]);
    }

    return { disconnected: Boolean(removed) };
  }

  async getChannelLink(workspaceId: string, channelId: string, userId: string) {
    await this.workspacesService.verifyMembership(workspaceId, userId);
    await this.workspacePermissionsService.assertChannelPermission(
      workspaceId,
      channelId,
      userId,
      PERMISSIONS.VIEW_CHANNEL,
    );

    const [link] = await this.drizzle.db
      .select()
      .from(channelGithubRepos)
      .where(
        and(
          eq(channelGithubRepos.workspaceId, workspaceId),
          eq(channelGithubRepos.channelId, channelId),
        ),
      );
    return link ?? null;
  }

  async listWorkspaceLinks(workspaceId: string, userId: string) {
    await this.workspacesService.verifyMembership(workspaceId, userId);
    return this.drizzle.db
      .select({
        channelId: channelGithubRepos.channelId,
        owner: channelGithubRepos.owner,
        repo: channelGithubRepos.repo,
        channelName: channels.name,
        ticketKey: channels.ticketKey,
      })
      .from(channelGithubRepos)
      .innerJoin(channels, eq(channelGithubRepos.channelId, channels.id))
      .where(eq(channelGithubRepos.workspaceId, workspaceId));
  }

  async listTicketPullRequests(ticketChannelId: string, userId: string) {
    const channel =
      await this.workspacePermissionsService.assertChannelPermissionByChannelId(
        ticketChannelId,
        userId,
        PERMISSIONS.VIEW_CHANNEL,
      );
    if (!channel.parentId) {
      throw new BadRequestException('Pull requests are listed on ticket threads');
    }

    return this.drizzle.db
      .select()
      .from(githubPrLinks)
      .where(eq(githubPrLinks.ticketChannelId, ticketChannelId));
  }

  async handleWebhookEvent(
    event: string,
    payload: unknown,
    deliveryId: string | undefined,
  ) {
    if (!this.markDelivery(deliveryId)) return;

    if (event === 'installation') {
      await this.syncInstallationEvent(payload as InstallationPayload);
      return;
    }
    if (event === 'pull_request') {
      try {
        await this.handlePullRequest(payload as PullRequestPayload);
      } catch (error) {
        this.logger.error('GitHub pull_request webhook failed', error);
        throw error;
      }
      return;
    }
    if (event === 'push') {
      try {
        await this.handlePush(payload as PushPayload);
      } catch (error) {
        this.logger.error('GitHub push webhook failed', error);
        throw error;
      }
    }
  }

  private ticketNumbersFromPush(
    branch: string,
    commits: PushPayload['commits'],
    ticketKey: string,
  ): number[] {
    const found = new Set<number>();
    const texts = [branch, ...(commits ?? []).map((commit) => commit.message)];
    for (const text of texts) {
      for (const num of extractTicketNumbers(text, ticketKey)) {
        found.add(num);
      }
    }
    return [...found];
  }

  private async syncInstallationEvent(payload: InstallationPayload) {
    if (payload.action === 'deleted') return;
    if (!payload.installation.account) return;

    const rows = await this.drizzle.db
      .select()
      .from(githubInstallations)
      .where(
        eq(githubInstallations.installationId, payload.installation.id),
      );
    if (rows.length === 0) return;

    const now = new Date();
    for (const row of rows) {
      await this.drizzle.db
        .update(githubInstallations)
        .set({
          accountLogin: payload.installation.account.login,
          accountType: payload.installation.account.type,
          updatedAt: now,
        })
        .where(eq(githubInstallations.id, row.id));
    }
  }

  private async resolveBoardLink(owner: string, repo: string) {
    const [link] = await this.drizzle.db
      .select()
      .from(channelGithubRepos)
      .where(
        and(
          eq(channelGithubRepos.owner, owner),
          eq(channelGithubRepos.repo, repo),
        ),
      );
    if (!link) return null;

    const [board] = await this.drizzle.db
      .select()
      .from(channels)
      .where(eq(channels.id, link.channelId));
    if (!board?.ticketKey) return null;

    return { link, board };
  }

  private async handlePullRequest(payload: PullRequestPayload) {
    const owner = payload.repository.owner.login;
    const repo = payload.repository.name;
    const ctx = await this.resolveBoardLink(owner, repo);
    if (!ctx) return;

    const ticketKey = ticketPrefixOf(ctx.board);
    const haystack = `${payload.pull_request.title}\n${payload.pull_request.head.ref}`;
    const numbers = extractTicketNumbers(haystack, ticketKey);
    if (numbers.length === 0) return;

    const nextStatus = resolvePullRequestAutomation(
      payload.action,
      payload.pull_request.merged,
      payload.pull_request.draft,
    );

    for (const ticketNumber of numbers) {
      const ticketChannelId =
        await this.channelsService.findTicketThreadByNumber(
          ctx.link.workspaceId,
          ctx.board.id,
          ticketNumber,
        );
      if (!ticketChannelId) continue;

      await this.upsertPrLink(ticketChannelId, owner, repo, payload);

      await this.channelsService.recordAndPublishChannelEvents(
        ticketChannelId,
        ctx.board.id,
        [
          {
            type: 'github_pull_request',
            actorId: null,
            fromValue: { action: payload.action },
            toValue: {
              number: payload.pull_request.number,
              title: payload.pull_request.title,
              htmlUrl: payload.pull_request.html_url,
              state: payload.pull_request.state,
              merged: payload.pull_request.merged,
              draft: payload.pull_request.draft,
            },
          },
        ],
      );

      if (nextStatus) {
        await this.channelsService.applyIntegrationTicketStatus(
          ctx.link.workspaceId,
          ticketChannelId,
          nextStatus,
          null,
          { source: 'github' },
        );
      }
    }
  }

  private async handlePush(payload: PushPayload) {
    const owner = payload.repository.owner.login;
    const repo = payload.repository.name;
    const ctx = await this.resolveBoardLink(owner, repo);
    if (!ctx) {
      this.logger.debug(
        `GitHub push ignored: no linked board for ${owner}/${repo}`,
      );
      return;
    }

    const branch = payload.ref.replace(/^refs\/heads\//, '');
    const ticketKey = ticketPrefixOf(ctx.board);
    const numbers = this.ticketNumbersFromPush(
      branch,
      payload.commits,
      ticketKey,
    );
    if (numbers.length === 0) {
      this.logger.debug(
        `GitHub push ignored: no ${ticketKey}-N id in branch "${branch}"`,
      );
      return;
    }

    const nextStatus = resolvePushAutomation();

    for (const ticketNumber of numbers) {
      const ticketChannelId =
        await this.channelsService.findTicketThreadByNumber(
          ctx.link.workspaceId,
          ctx.board.id,
          ticketNumber,
        );
      if (!ticketChannelId) {
        this.logger.warn(
          `GitHub push: ticket ${ticketKey}-${ticketNumber} not found on linked board ${ctx.board.id}`,
        );
        continue;
      }

      const [before] = await this.drizzle.db
        .select({ status: channels.status })
        .from(channels)
        .where(eq(channels.id, ticketChannelId))
        .limit(1);

      const [openPr] = await this.drizzle.db
        .select({ id: githubPrLinks.id })
        .from(githubPrLinks)
        .where(
          and(
            eq(githubPrLinks.ticketChannelId, ticketChannelId),
            eq(githubPrLinks.state, 'open'),
          ),
        )
        .limit(1);

      if (
        !shouldApplyPushStatusAutomation(before?.status, Boolean(openPr))
      ) {
        this.logger.debug(
          `GitHub push skipped status for ticket ${ticketKey}-${ticketNumber} (status=${before?.status ?? 'unknown'}, openPr=${Boolean(openPr)})`,
        );
        continue;
      }

      if (before && before.status !== nextStatus) {
        await this.channelsService.applyIntegrationTicketStatus(
          ctx.link.workspaceId,
          ticketChannelId,
          nextStatus,
          null,
          { source: 'github' },
        );
      }
    }
  }

  private async upsertPrLink(
    ticketChannelId: string,
    owner: string,
    repo: string,
    payload: PullRequestPayload,
  ) {
    const now = new Date();
    await this.drizzle.db
      .insert(githubPrLinks)
      .values({
        id: crypto.randomUUID(),
        ticketChannelId,
        owner,
        repo,
        prNumber: payload.pull_request.number,
        headRef: payload.pull_request.head.ref,
        htmlUrl: payload.pull_request.html_url,
        state: payload.pull_request.state,
        merged: payload.pull_request.merged,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          githubPrLinks.ticketChannelId,
          githubPrLinks.owner,
          githubPrLinks.repo,
          githubPrLinks.prNumber,
        ],
        set: {
          headRef: payload.pull_request.head.ref,
          htmlUrl: payload.pull_request.html_url,
          state: payload.pull_request.state,
          merged: payload.pull_request.merged,
          updatedAt: now,
        },
      });
  }

  async handleChatCommand(
    workspaceId: string,
    channelId: string,
    userId: string,
    raw: string,
  ) {
    const trimmed = raw.trim();
    const match = trimmed.match(/^@?github\b\s*(.*)$/i);
    if (!match) return null;

    const args = (match[1] ?? '').trim().split(/\s+/).filter(Boolean);
    const command = (args[0] ?? 'help').toLowerCase();

    if (command === 'help' || command === 'status' || command === 'repos') {
      return { handled: true };
    }

    if (command === 'connect') {
      const owner = args[1];
      const repo = args[2];
      if (!owner || !repo) {
        return { handled: true };
      }
      const { beginUrl } = await this.startInstall(
        workspaceId,
        channelId,
        userId,
        owner,
        repo,
      );
      await this.channelsService.recordAndPublishChannelEvents(channelId, null, [
        {
          type: 'github_setup_started',
          actorId: userId,
          fromValue: null,
          toValue: { owner, repo, beginUrl },
        },
      ]);
      return { handled: true };
    }

    if (command === 'disconnect') {
      await this.disconnectChannel(workspaceId, channelId, userId);
      return { handled: true };
    }

    return { handled: true };
  }
}
