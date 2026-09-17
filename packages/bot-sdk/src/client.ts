import { EventEmitter } from "node:events";
import { io, type Socket } from "socket.io-client";
import type {
  ApiChannel,
  ApiMessage,
  BotUser,
  ChannelEvent,
  MessageDeletedPayload,
  MessageReactionsPayload,
} from "@jeichat/bot-protocol";
import { isTicketEvent } from "./map-events.js";
import { RestClient } from "./rest.js";

export type JeiChatOptions = {
  apiUrl?: string;
};

type ChannelPatch = {
  name?: string;
  description?: string | null;
  ticketKey?: string;
  status?: string;
  priority?: string;
  assigneeId?: string | null;
  dueAt?: string | null;
  labelIds?: string[];
  watcherIds?: string[];
  archived?: boolean;
};

function defaultApiUrl() {
  return (
    process.env.JEICHAT_API_URL?.replace(/\/$/, "") ?? "http://localhost:3001"
  );
}

export class Message {
  readonly id: string;
  readonly channelId: string;
  readonly content: string;
  readonly author: { id: string; username: string; bot: boolean };
  readonly channel: Channel;

  constructor(
    private readonly client: JeiChat,
    raw: ApiMessage,
    channel: Channel,
  ) {
    this.id = raw.id;
    this.channelId = raw.channelId;
    this.content = raw.content;
    this.author = {
      id: raw.senderId,
      username: raw.sender?.name ?? "Unknown",
      bot: Boolean(raw.sender?.isBot),
    };
    this.channel = channel;
  }

  reply(content: string) {
    return this.client.rest.post<ApiMessage>(
      `/channels/${this.channelId}/messages`,
      { content, replyToId: this.id },
    );
  }

  edit(content: string) {
    return this.client.rest.patch<ApiMessage>(
      `/channels/${this.channelId}/messages/${this.id}`,
      { content },
    );
  }

  delete() {
    return this.client.rest.delete(
      `/channels/${this.channelId}/messages/${this.id}`,
    );
  }

  react(emoji: string) {
    return this.client.rest.post(
      `/channels/${this.channelId}/messages/${this.id}/reactions`,
      { emoji },
    );
  }

  pin() {
    return this.client.rest.post(
      `/channels/${this.channelId}/messages/${this.id}/pin`,
    );
  }

  unpin() {
    return this.client.rest.delete(
      `/channels/${this.channelId}/messages/${this.id}/pin`,
    );
  }
}

export class Channel {
  constructor(
    private readonly client: JeiChat,
    readonly raw: ApiChannel,
  ) {}

  get id() {
    return this.raw.id;
  }

  get name() {
    return this.raw.name;
  }

  get isTicket() {
    return Boolean(this.raw.parentId);
  }

  send(content: string, extra?: { replyToId?: string }) {
    return this.client.rest.post<ApiMessage>(
      `/channels/${this.id}/messages`,
      { content, ...extra },
    );
  }

  edit(patch: ChannelPatch) {
    return this.client.rest.patch<ApiChannel>(
      `/workspaces/${this.client.workspaceId}/channels/${this.id}`,
      patch,
    );
  }

  setStatus(status: string) {
    return this.edit({ status });
  }

  setPriority(priority: string) {
    return this.edit({ priority });
  }

  setAssignee(assigneeId: string | null) {
    return this.edit({ assigneeId });
  }

  setDueAt(dueAt: string | null) {
    return this.edit({ dueAt });
  }

  setLabels(labelIds: string[]) {
    return this.edit({ labelIds });
  }

  setWatchers(watcherIds: string[]) {
    return this.edit({ watcherIds });
  }

  setArchived(archived: boolean) {
    return this.edit({ archived });
  }

  delete() {
    return this.client.rest.delete(
      `/workspaces/${this.client.workspaceId}/channels/${this.id}`,
    );
  }

  listEvents() {
    return this.client.rest.get<ChannelEvent[]>(
      `/workspaces/${this.client.workspaceId}/channels/${this.id}/events`,
    );
  }

  listThreads(archived = false) {
    const query = archived ? "?archived=true" : "";
    return this.client.rest.get<ApiChannel[]>(
      `/workspaces/${this.client.workspaceId}/channels/${this.id}/threads${query}`,
    );
  }

  createTicket(name: string, extra?: { description?: string; status?: string }) {
    return this.client.rest.post<ApiChannel>(
      `/workspaces/${this.client.workspaceId}/channels/${this.id}/threads`,
      { name, ...extra },
    );
  }

  members = {
    list: () =>
      this.client.rest.get(
        `/workspaces/${this.client.workspaceId}/channels/${this.id}/members`,
      ),
    add: (userId: string) =>
      this.client.rest.post(
        `/workspaces/${this.client.workspaceId}/channels/${this.id}/members`,
        { userId },
      ),
    remove: (userId: string) =>
      this.client.rest.delete(
        `/workspaces/${this.client.workspaceId}/channels/${this.id}/members/${userId}`,
      ),
  };
}

/**
 * JavaScript SDK for JeiChat bots.
 *
 * Socket delivery is at-most-once: Socket.IO does not replay missed events.
 * Listen for `reconnected` and backfill with `GET /channels/:id/messages?cursor=`.
 * File uploads are not supported in v1.
 */
export class JeiChat extends EventEmitter {
  readonly rest: RestClient;
  user: BotUser | null = null;
  workspaceId = "";
  readonly channels = {
    cache: new Map<string, Channel>(),
    create: (payload: {
      name: string;
      description?: string;
      isPrivate?: boolean;
      memberIds?: string[];
    }) =>
      this.rest.post<ApiChannel>(
        `/workspaces/${this.workspaceId}/channels`,
        payload,
      ),
    fetch: async (channelId: string) => {
      const raw = await this.rest.get<ApiChannel>(
        `/workspaces/${this.workspaceId}/channels/${channelId}`,
      );
      const channel = new Channel(this, raw);
      this.channels.cache.set(channel.id, channel);
      return channel;
    },
    list: () =>
      this.rest.get<ApiChannel[]>(
        `/workspaces/${this.workspaceId}/channels`,
      ),
    createTicket: (
      parentId: string,
      name: string,
      extra?: { description?: string; status?: string },
    ) =>
      this.rest.post<ApiChannel>(
        `/workspaces/${this.workspaceId}/channels/${parentId}/threads`,
        { name, ...extra },
      ),
    listThreads: (parentId: string, archived = false) => {
      const query = archived ? "?archived=true" : "";
      return this.rest.get<ApiChannel[]>(
        `/workspaces/${this.workspaceId}/channels/${parentId}/threads${query}`,
      );
    },
    listEvents: (channelId: string) =>
      this.rest.get<ChannelEvent[]>(
        `/workspaces/${this.workspaceId}/channels/${channelId}/events`,
      ),
    messages: (
      channelId: string,
      query?: { cursor?: string; limit?: number },
    ) => {
      const params = new URLSearchParams();
      if (query?.cursor) params.set("cursor", query.cursor);
      if (query?.limit) params.set("limit", String(query.limit));
      const suffix = params.size ? `?${params.toString()}` : "";
      return this.rest.get(`/channels/${channelId}/messages${suffix}`);
    },
    send: (channelId: string, content: string, extra?: { replyToId?: string }) =>
      this.rest.post<ApiMessage>(`/channels/${channelId}/messages`, {
        content,
        ...extra,
      }),
    delete: (channelId: string) =>
      this.rest.delete(
        `/workspaces/${this.workspaceId}/channels/${channelId}`,
      ),
  };

  private readonly apiUrl: string;
  private token = "";
  private socket: Socket | null = null;
  private readonly seenEventIds = new Set<string>();
  private readyOnce = false;

  constructor(options: JeiChatOptions = {}) {
    super();
    this.apiUrl = (options.apiUrl ?? defaultApiUrl()).replace(/\/$/, "");
    this.rest = new RestClient(this.apiUrl, "");
  }

  async login(token: string) {
    this.token = token;
    this.rest.setToken(token);
    this.user = await this.rest.get<BotUser>("/bots/@me");
    this.workspaceId = this.user.workspaceId;
    this.channels.cache.clear();
    for (const snapshot of this.user.channels) {
      this.channels.cache.set(
        snapshot.id,
        new Channel(this, {
          id: snapshot.id,
          workspaceId: this.workspaceId,
          name: snapshot.name,
          description: null,
          parentId: snapshot.parentId,
          channelType: snapshot.channelType,
          isPrivate: snapshot.isPrivate,
          status: null,
          priority: null,
          assigneeId: null,
          dueAt: null,
          ticketKey: null,
          archivedAt: null,
        }),
      );
    }
    const listed = await this.channels.list();
    for (const raw of listed) {
      this.channels.cache.set(raw.id, new Channel(this, raw));
    }
    await this.connectGateway();
    if (!this.readyOnce) {
      this.readyOnce = true;
      this.emit("ready");
    }
    return this.user;
  }

  private wrapMessage(raw: ApiMessage) {
    const cached = this.channels.cache.get(raw.channelId);
    const channel =
      cached ??
      new Channel(this, {
        id: raw.channelId,
        workspaceId: this.workspaceId,
        name: "",
        description: null,
        parentId: null,
        channelType: "channel",
        isPrivate: false,
        status: null,
        priority: null,
        assigneeId: null,
        dueAt: null,
        ticketKey: null,
        archivedAt: null,
      });
    return new Message(this, raw, channel);
  }

  private connectGateway() {
    return new Promise<void>((resolve, reject) => {
      this.socket?.removeAllListeners();
      this.socket?.disconnect();
      const socket = io(this.apiUrl, {
        transports: ["websocket"],
        auth: { token: this.token },
      });
      this.socket = socket;

      socket.once("connect", () => resolve());
      socket.once("connect_error", (error) => reject(error));
      socket.on("disconnect", () => {
        socket.once("connect", () => this.emit("reconnected"));
      });

      socket.on("new_message", (payload: ApiMessage) => {
        this.emit("messageCreate", this.wrapMessage(payload));
      });
      socket.on("message_updated", (payload: ApiMessage) => {
        this.emit("messageUpdate", this.wrapMessage(payload));
      });
      socket.on("message_deleted", (payload: MessageDeletedPayload) => {
        this.emit("messageDelete", payload);
      });
      socket.on(
        "message_reactions_updated",
        (payload: MessageReactionsPayload) => {
          this.emit("messageReactionsUpdate", payload);
        },
      );
      socket.on("channel_event", (payload: ChannelEvent) => {
        if (this.seenEventIds.has(payload.id)) return;
        this.seenEventIds.add(payload.id);
        if (this.seenEventIds.size > 500) {
          const first = this.seenEventIds.values().next().value;
          if (first) this.seenEventIds.delete(first);
        }
        const channel =
          this.channels.cache.get(payload.channelId) ??
          this.channels.cache.get(payload.ticket?.id ?? "") ??
          new Channel(this, {
            id: payload.channelId,
            workspaceId: this.workspaceId,
            name: payload.ticket?.name ?? "",
            description: null,
            parentId: payload.parentId,
            channelType: "channel",
            isPrivate: false,
            status: null,
            priority: null,
            assigneeId: null,
            dueAt: null,
            ticketKey: null,
            archivedAt: null,
          });
        if (isTicketEvent(payload)) {
          this.emit("ticketUpdate", channel, payload);
        } else {
          this.emit("channelUpdate", channel, payload);
        }
      });
    });
  }
}
