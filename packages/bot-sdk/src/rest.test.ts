import { expect, test } from "bun:test";
import { ApiError, RestClient } from "./rest.ts";

function jsonResponse(body: unknown, status = 200) {
  return new Response(body === null ? "" : JSON.stringify(body), {
    status,
    statusText: status === 403 ? "Forbidden" : "OK",
  });
}

test("sends Bot authorization and parses JSON", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), init: init ?? {} });
    return jsonResponse({ id: "bot-1" });
  };

  const client = new RestClient("http://api.test", "jei_live_secret");
  await expect(client.get<{ id: string }>("/bots/@me")).resolves.toEqual({
    id: "bot-1",
  });
  expect(calls[0]?.url).toBe("http://api.test/bots/@me");
  expect(calls[0]?.init.method).toBe("GET");
  expect(
    (calls[0]?.init.headers as Record<string, string>).Authorization,
  ).toBe("Bot jei_live_secret");
});

test("posts JSON with a content-type header", async () => {
  globalThis.fetch = async (_input, init) => {
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ content: "hi" }));
    expect(
      (init?.headers as Record<string, string>)["Content-Type"],
    ).toBe("application/json");
    return jsonResponse({ ok: true });
  };

  const client = new RestClient("http://api.test", "tok");
  await expect(client.post("/channels/ch-1/messages", { content: "hi" })).resolves.toEqual(
    { ok: true },
  );
});

test("throws ApiError on a non-OK response", async () => {
  globalThis.fetch = async () => jsonResponse({ message: "nope" }, 403);
  const client = new RestClient("http://api.test", "tok");
  try {
    await client.get("/auth/me");
    throw new Error("expected ApiError");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(403);
    expect((error as ApiError).body).toEqual({ message: "nope" });
  }
});

test("setToken updates the authorization header", async () => {
  globalThis.fetch = async (_input, init) => {
    expect(
      (init?.headers as Record<string, string>).Authorization,
    ).toBe("Bot jei_live_new");
    return jsonResponse(null);
  };

  const client = new RestClient("http://api.test", "old");
  client.setToken("jei_live_new");
  await expect(client.delete("/channels/ch-1/messages/m-1")).resolves.toBeNull();
});
