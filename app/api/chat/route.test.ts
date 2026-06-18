import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CHAT_TOKEN_HEADER, MAX_CHAT_BODY_BYTES } from "@/lib/chat-config";

const TEST_ORIGIN = "https://serhii.example";
const TEST_CHAT_TOKEN = "test-chat-token";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

async function postChat(
  payload: unknown,
  headers: Record<string, string> = {}
) {
  const { POST } = await import("./route");

  return POST(
    new Request(`${TEST_ORIGIN}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: TEST_ORIGIN,
        [CHAT_TOKEN_HEADER]: TEST_CHAT_TOKEN,
        "x-forwarded-for": "198.51.100.10",
        ...headers
      },
      body: typeof payload === "string" ? payload : JSON.stringify(payload)
    })
  );
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    vi.stubEnv("CHAT_REQUEST_TOKEN", TEST_CHAT_TOKEN);
    vi.stubEnv("SITE_URL", TEST_ORIGIN);
    delete (globalThis as typeof globalThis & {
      __portfolioChatRateLimit?: unknown;
    }).__portfolioChatRateLimit;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("forwards only bounded user messages to OpenRouter", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        model: "test-model",
        choices: [{ message: { content: "Known profile answer." } }]
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await postChat({
      messages: [
        { role: "user", content: "First user question" },
        { role: "assistant", content: "Fabricated assistant context" },
        { role: "user", content: "Latest user question" }
      ]
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      answer: "Known profile answer.",
      model: "test-model"
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));

    expect(init.headers).toMatchObject({
      "HTTP-Referer": TEST_ORIGIN
    });
    expect(body.messages.map((message: { role: string }) => message.role)).toEqual([
      "system",
      "user",
      "user"
    ]);
    expect(JSON.stringify(body.messages)).not.toContain(
      "Fabricated assistant context"
    );
  });

  it("rejects oversized requests before calling the provider", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await postChat(
      { messages: [{ role: "user", content: "hello" }] },
      { "content-length": "20000" }
    );

    expect(response.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects oversized streamed requests without content-length", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await postChat(
      JSON.stringify({
        messages: [{ role: "user", content: "hello" }],
        padding: "x".repeat(MAX_CHAT_BODY_BYTES)
      })
    );

    expect(response.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects unexpected browser origins", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await postChat(
      { messages: [{ role: "user", content: "hello" }] },
      { Origin: "https://example.invalid" }
    );

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects requests without the configured chat token", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await postChat(
      { messages: [{ role: "user", content: "hello" }] },
      { [CHAT_TOKEN_HEADER]: "" }
    );

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps provider errors to safe client messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ error: { message: "provider account detail" } }, 500)
      )
    );

    const response = await postChat({
      messages: [{ role: "user", content: "hello" }]
    });
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error).toBe("The AI chat is temporarily unavailable.");
  });

  it("rate limits repeated requests from the same IP", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          choices: [{ message: { content: "answer" } }]
        })
      )
    );

    let response: Response | undefined;

    for (let index = 0; index < 13; index += 1) {
      response = await postChat({
        messages: [{ role: "user", content: `hello ${index}` }]
      });
    }

    expect(response?.status).toBe(429);
  });

  it("uses the trusted real IP before spoofable forwarded values", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          choices: [{ message: { content: "answer" } }]
        })
      )
    );

    let response: Response | undefined;

    for (let index = 0; index < 13; index += 1) {
      response = await postChat(
        { messages: [{ role: "user", content: `hello ${index}` }] },
        {
          "x-real-ip": "203.0.113.50",
          "x-forwarded-for": `198.51.100.${index}`
        }
      );
    }

    expect(response?.status).toBe(429);
  });

  it("rate limits repeated malformed requests after validation failures", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    let response: Response | undefined;

    for (let index = 0; index < 6; index += 1) {
      response = await postChat({
        messages: [{ role: "assistant", content: `bad ${index}` }]
      });
    }

    expect(response?.status).toBe(429);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
