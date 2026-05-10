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

interface AuthenticatedSocket extends Socket {
  data: { userId: string; userName: string };
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
  }

  handleDisconnect() {}

  @SubscribeMessage('join_channel')
  handleJoinChannel(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { channelId: string },
  ) {
    client.join(`channel:${payload.channelId}`);
  }

  @SubscribeMessage('leave_channel')
  handleLeaveChannel(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { channelId: string },
  ) {
    client.leave(`channel:${payload.channelId}`);
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { channelId: string },
  ) {
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
}
