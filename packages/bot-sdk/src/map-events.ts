import type { SdkEventName } from "@jeichat/bot-protocol";

export function mapGatewayEvent(
  event: string,
): SdkEventName | null {
  switch (event) {
    case "new_message":
      return "messageCreate";
    case "message_updated":
      return "messageUpdate";
    case "message_deleted":
      return "messageDelete";
    case "message_reactions_updated":
      return "messageReactionsUpdate";
    default:
      return null;
  }
}

export function isTicketEvent(payload: {
  parentId?: string | null;
  ticket?: unknown;
}): boolean {
  return Boolean(payload.parentId || payload.ticket);
}
