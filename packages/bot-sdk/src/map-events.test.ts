import { expect, test } from "bun:test";
import { isTicketEvent, mapGatewayEvent } from "./map-events.ts";

test("maps socket events onto SDK names", () => {
  expect(mapGatewayEvent("new_message")).toBe("messageCreate");
  expect(mapGatewayEvent("message_updated")).toBe("messageUpdate");
  expect(mapGatewayEvent("message_deleted")).toBe("messageDelete");
  expect(mapGatewayEvent("message_reactions_updated")).toBe(
    "messageReactionsUpdate",
  );
  expect(mapGatewayEvent("unknown")).toBeNull();
});

test("treats parented channel events as ticket updates", () => {
  expect(isTicketEvent({ parentId: "c1" })).toBe(true);
  expect(isTicketEvent({ ticket: { id: "t1" } })).toBe(true);
  expect(isTicketEvent({ parentId: null, ticket: null })).toBe(false);
});
