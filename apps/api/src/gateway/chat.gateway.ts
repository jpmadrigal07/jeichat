import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { auth } from '../auth/auth';
import { PERMISSIONS } from '../workspaces/permissions';
import { WorkspacePermissionsService } from '../workspaces/workspace-permissions.service';
import { WorkspacesService } from '../workspaces/workspaces.service';

interface AuthenticatedSocket extends Socket {
  data: { userId: string; userName: string; workspaceIds: string[] };
}

@WebSocketGateway({
  cors: {
    origin: (process.env.WEB_ORIGIN ?? 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim()),
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly socketsByUser = new Map<string, Set<string>>();
  private readonly workspacesByUser = new Map<string, Set<string>>();

  constructor(
    private readonly workspacePermissionsService: WorkspacePermissionsService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    const cookieHeader = client.handshake.headers.cookie;
    if (!cookieHeader) {
      client.disconnect();
      return;
    }

    const session = await auth.api.getSession({
      headers: new Headers({ cookie: cookieHeader }),
    });

    if (!session?.user) {
      client.disconnect();
      return;
    }

    client.data.userId = session.user.id;
    client.data.userName = session.user.name;
    client.data.workspaceIds = [];
    this.trackSocket(session.user.id, client.id);
    client.join(`user:${session.user.id}`);
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.data.userId;
    if (!userId) return;

    const wentOffline = this.untrackSocket(userId, client.id);
    if (!wentOffline) return;

    const workspaceIds = this.workspacesByUser.get(userId);
    this.workspacesByUser.delete(userId);
    if (!workspaceIds) return;

    for (const workspaceId of workspaceIds) {
      this.server.to(`workspace:${workspaceId}`).emit('presence_update', {
        workspaceId,
        userId,
        online: false,
      });
    }
  }

  @SubscribeMessage('join_channel')
  async handleJoinChannel(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { channelId: string },
  ) {
    const userId = await this.waitForSocketUser(client);
    if (!userId || !payload?.channelId) return;

    const allowed = await this.workspacePermissionsService
      .assertChannelPermissionByChannelId(
        payload.channelId,
        userId,
        PERMISSIONS.VIEW_CHANNEL,
      )
      .then(() => true)
      .catch(() => false);

    if (!allowed) return;

    client.join(`channel:${payload.channelId}`);
  }

  @SubscribeMessage('leave_channel')
  handleLeaveChannel(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { channelId: string },
  ) {
    if (!payload?.channelId) return;
    client.leave(`channel:${payload.channelId}`);
  }

  @SubscribeMessage('join_workspace')
  async handleJoinWorkspace(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { workspaceId: string },
  ) {
    const userId = await this.waitForSocketUser(client);
    if (!userId || !payload?.workspaceId) return;

    const allowed = await this.workspacesService
      .verifyMembership(payload.workspaceId, userId)
      .then(() => true)
      .catch(() => false);

    if (!allowed) return;

    const room = `workspace:${payload.workspaceId}`;
    client.join(room);
    this.rememberWorkspace(client, userId, payload.workspaceId);

    const memberIds = await this.workspacesService.listMemberUserIds(
      payload.workspaceId,
    );
    const userIds = memberIds.filter((memberId) => this.isUserOnline(memberId));

    client.emit('presence_snapshot', {
      workspaceId: payload.workspaceId,
      userIds,
    });
    client.to(room).emit('presence_update', {
      workspaceId: payload.workspaceId,
      userId,
      online: true,
    });
  }

  @SubscribeMessage('leave_workspace')
  handleLeaveWorkspace(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { workspaceId: string },
  ) {
    if (!payload?.workspaceId) return;
    client.leave(`workspace:${payload.workspaceId}`);
    client.data.workspaceIds = (client.data.workspaceIds ?? []).filter(
      (workspaceId) => workspaceId !== payload.workspaceId,
    );
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { channelId: string },
  ) {
    const allowed = await this.workspacePermissionsService
      .assertChannelPermissionByChannelId(
        payload.channelId,
        client.data.userId,
        PERMISSIONS.VIEW_CHANNEL,
      )
      .then(() => true)
      .catch(() => false);

    if (!allowed) return;
    client.to(`channel:${payload.channelId}`).emit('user_typing', {
      channelId: payload.channelId,
      userId: client.data.userId,
      userName: client.data.userName,
    });
  }

  emitNewMessage(channelId: string, message: unknown) {
    this.server.to(`channel:${channelId}`).emit('new_message', message);
  }

  emitMessageUpdated(channelId: string, message: unknown) {
    this.server.to(`channel:${channelId}`).emit('message_updated', message);
  }

  emitMessageDeleted(channelId: string, messageId: string) {
    this.server
      .to(`channel:${channelId}`)
      .emit('message_deleted', { id: messageId, channelId });
  }

  emitMessagePinned(channelId: string, pin: unknown) {
    this.server.to(`channel:${channelId}`).emit('message_pinned', pin);
  }

  emitMessageUnpinned(channelId: string, messageId: string) {
    this.server
      .to(`channel:${channelId}`)
      .emit('message_unpinned', { id: messageId, channelId });
  }

  emitMessageReactionsUpdated(channelId: string, payload: unknown) {
    this.server
      .to(`channel:${channelId}`)
      .emit('message_reactions_updated', payload);
  }

  emitChannelEvent(channelId: string, event: unknown) {
    this.server.to(`channel:${channelId}`).emit('channel_event', event);
  }

  emitInboxNotification(userId: string, notification: unknown) {
    this.server.to(`user:${userId}`).emit('inbox_notification', notification);
  }

  private trackSocket(userId: string, socketId: string) {
    const sockets = this.socketsByUser.get(userId) ?? new Set<string>();
    sockets.add(socketId);
    this.socketsByUser.set(userId, sockets);
  }

  private untrackSocket(userId: string, socketId: string) {
    const sockets = this.socketsByUser.get(userId);
    if (!sockets) return true;

    sockets.delete(socketId);
    if (sockets.size > 0) return false;

    this.socketsByUser.delete(userId);
    return true;
  }

  private isUserOnline(userId: string) {
    return (this.socketsByUser.get(userId)?.size ?? 0) > 0;
  }

  private rememberWorkspace(
    client: AuthenticatedSocket,
    userId: string,
    workspaceId: string,
  ) {
    if (!client.data.workspaceIds) {
      client.data.workspaceIds = [];
    }
    if (!client.data.workspaceIds.includes(workspaceId)) {
      client.data.workspaceIds.push(workspaceId);
    }

    const workspaces = this.workspacesByUser.get(userId) ?? new Set<string>();
    workspaces.add(workspaceId);
    this.workspacesByUser.set(userId, workspaces);
  }

  private async waitForSocketUser(
    client: AuthenticatedSocket,
    timeoutMs = 2000,
  ) {
    if (client.data.userId) return client.data.userId;
    const started = Date.now();
    while (!client.data.userId && Date.now() - started < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    return client.data.userId;
  }
}
