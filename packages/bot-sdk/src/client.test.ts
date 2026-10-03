import { expect, mock, test } from "bun:test";
import type { ApiChannel, ApiMessage } from "@jeichat/bot-protocol";

mock.module("socket.io-client", () => ({
  io: () => ({
    on() {},
    once() {},
    disconnect() {},
    removeAllListeners() {},
  }),
}));

const { Channel, JeiChat, Message } = await import("./client.ts");

const channelRaw: ApiChannel = {
  id: "ch-1",
  workspaceId: "ws-1",
  name: "general",
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
};

const messageRaw: ApiMessage = {
  id: "m-1",
  channelId: "ch-1",
  senderId: "user-1",
  content: "ping",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  sender: { name: "Ada", image: null, isBot: false },
  replyToId: null,
  attachments: [],
  reactions: [],
};

test("Message wraps sender and posts a reply", async () => {
  const calls: Array<{ url: string; body: unknown }> = [];
  globalThis.fetch = async (input, init) => {
    calls.push({
      url: String(input),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };

  const client = new JeiChat({ apiUrl: "http://api.test/" });
  client.rest.setToken("jei_live_secret");
  const channel = new Channel(client, channelRaw);
  const message = new Message(client, messageRaw, channel);

  expect(message.author).toEqual({
    id: "user-1",
    username: "Ada",
    bot: false,
  });
  expect(message.channel.id).toBe("ch-1");

  await message.reply("pong");
  expect(calls[0]?.url).toBe("http://api.test/channels/ch-1/messages");
  expect(calls[0]?.body).toEqual({ content: "pong", replyToId: "m-1" });
});

test("Channel.send and ticket helpers hit workspace routes", async () => {
  const urls: string[] = [];
  globalThis.fetch = async (input) => {
    urls.push(String(input));
    return new Response(JSON.stringify({ id: "ok" }), { status: 200 });
  };

  const client = new JeiChat({ apiUrl: "http://api.test" });
  client.workspaceId = "ws-1";
  client.rest.setToken("tok");
  const channel = new Channel(client, { ...channelRaw, parentId: "parent-1" });

  expect(channel.isTicket).toBe(true);
  await channel.send("hello");
  await channel.setStatus("done");
  await channel.createTicket("Bug", { status: "open" });

  expect(urls).toEqual([
    "http://api.test/channels/ch-1/messages",
    "http://api.test/workspaces/ws-1/channels/ch-1",
    "http://api.test/workspaces/ws-1/channels/ch-1/threads",
  ]);
});
