import { NextResponse } from "next/server";
import {
  CHAT_TOKEN_HEADER,
  MAX_CHAT_BODY_BYTES,
  MAX_CHAT_CONTENT_LENGTH,
  MAX_CHAT_MESSAGES
} from "@/lib/chat-config";
import { careerProfile } from "@/lib/career-profile";
import { getSiteOrigin, getSiteUrl } from "@/lib/site-config";

export const runtime = "nodejs";

const DEFAULT_OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-120b:free";
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 12;
const MAX_FAILURES_PER_WINDOW = 5;
const MAX_RATE_LIMIT_BUCKETS = 500;

type ChatMessage = {
  role: "user";
  content: string;
};

type RateLimitBucket = {
  count: number;
  failures: number;
  resetAt: number;
};

const globalRateLimit = globalThis as typeof globalThis & {
  __portfolioChatRateLimit?: Map<string, RateLimitBucket>;
};

const rateLimitBuckets =
  globalRateLimit.__portfolioChatRateLimit ??
  new Map<string, RateLimitBucket>();

globalRateLimit.__portfolioChatRateLimit = rateLimitBuckets;

function getConfig() {
  const maxTokens = Number(process.env.OPENROUTER_MAX_TOKENS || 520);
  const temperature = Number(process.env.OPENROUTER_TEMPERATURE || 0.35);

  return {
    apiUrl: process.env.OPENROUTER_URL || DEFAULT_OPENROUTER_URL,
    model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
    maxTokens: Number.isFinite(maxTokens) ? maxTokens : 520,
    temperature: Number.isFinite(temperature) ? temperature : 0.35
  };
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers
    .get("x-forwarded-for")
    ?.split(",")
    .at(-1)
    ?.trim();

  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    forwardedFor ||
    "unknown"
  );
}

function isAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");

  if (!origin && process.env.NODE_ENV !== "production") {
    return true;
  }

  if (!origin) {
    return false;
  }

  const allowedOrigins = new Set([getSiteOrigin()]);

  if (process.env.NODE_ENV !== "production") {
    allowedOrigins.add("http://127.0.0.1:3000");
    allowedOrigins.add("http://localhost:3000");
  }

  try {
    return allowedOrigins.has(new URL(origin).origin);
  } catch {
    return false;
  }
}

function hasValidChatToken(request: Request) {
  const expectedToken = process.env.CHAT_REQUEST_TOKEN;

  if (!expectedToken && process.env.NODE_ENV !== "production") {
    return true;
  }

  return Boolean(
    expectedToken && request.headers.get(CHAT_TOKEN_HEADER) === expectedToken
  );
}

function createBodyTooLargeResponse() {
  return NextResponse.json(
    { error: "The chat request is too large." },
    { status: 413 }
  );
}

function checkContentLength(request: Request) {
  const contentLength = request.headers.get("content-length");

  if (!contentLength) {
    return null;
  }

  const size = Number(contentLength);

  if (Number.isFinite(size) && size > MAX_CHAT_BODY_BYTES) {
    return createBodyTooLargeResponse();
  }

  return null;
}

async function readBodyBounded(request: Request) {
  const reader = request.body?.getReader();

  if (!reader) {
    return "";
  }

  let bytes = 0;
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    bytes += value.byteLength;

    if (bytes > MAX_CHAT_BODY_BYTES) {
      return null;
    }

    chunks.push(value);
  }

  const body = new Uint8Array(bytes);
  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(body);
}

function evictExpiredBuckets(now: number) {
  if (rateLimitBuckets.size <= MAX_RATE_LIMIT_BUCKETS) {
    return;
  }

  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(key);
    }
  }
}

function checkRateLimit(request: Request) {
  const now = Date.now();
  const key = getClientIp(request);
  evictExpiredBuckets(now);

  const bucket = rateLimitBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, {
      count: 1,
      failures: 0,
      resetAt: now + RATE_LIMIT_WINDOW_MS
    });
    return null;
  }

  if (
    bucket.count >= MAX_REQUESTS_PER_WINDOW ||
    bucket.failures >= MAX_FAILURES_PER_WINDOW
  ) {
    return NextResponse.json(
      { error: "Too many chat requests. Please try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": `${Math.ceil((bucket.resetAt - now) / 1000)}`
        }
      }
    );
  }

  bucket.count += 1;
  return null;
}

function recordFailure(request: Request) {
  const bucket = rateLimitBuckets.get(getClientIp(request));

  if (bucket) {
    bucket.failures += 1;
  }
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    candidate.role === "user" &&
    typeof candidate.content === "string" &&
    candidate.content.trim().length > 0 &&
    candidate.content.length <= MAX_CHAT_CONTENT_LENGTH
  );
}

function normalizeMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter(isChatMessage)
    .slice(-MAX_CHAT_MESSAGES)
    .map((message) => ({
      role: message.role,
      content: message.content.trim()
    }));
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const config = getConfig();

  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: "Chat origin is not allowed." }, { status: 403 });
  }

  if (!hasValidChatToken(request)) {
    return NextResponse.json({ error: "Chat access is not allowed." }, { status: 403 });
  }

  const bodySizeError = checkContentLength(request);

  if (bodySizeError) {
    return bodySizeError;
  }

  const rateLimitError = checkRateLimit(request);

  if (rateLimitError) {
    return rateLimitError;
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: "The AI chat is not configured yet." },
      { status: 500 }
    );
  }

  let payload: unknown;

  try {
    const rawBody = await readBodyBounded(request);

    if (rawBody === null) {
      return createBodyTooLargeResponse();
    }

    payload = JSON.parse(rawBody);
  } catch {
    recordFailure(request);
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const rawMessages = (payload as { messages?: unknown }).messages;

  if (Array.isArray(rawMessages) && rawMessages.length > MAX_CHAT_MESSAGES) {
    recordFailure(request);
    return NextResponse.json(
      { error: "Too many chat messages were sent." },
      { status: 400 }
    );
  }

  const messages = normalizeMessages(rawMessages);

  if (!messages.length || messages[messages.length - 1]?.role !== "user") {
    recordFailure(request);
    return NextResponse.json(
      { error: "A final user message is required." },
      { status: 400 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(config.apiUrl, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": getSiteUrl(),
        "X-OpenRouter-Title": "Serhii Drachuk Digital Twin"
      },
      body: JSON.stringify({
        model: config.model,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        messages: [
          {
            role: "system",
            content: `You are Serhii Drachuk's digital twin for a professional portfolio website. Use only the profile context below when answering questions about Serhii's career.\n\n${careerProfile}`
          },
          ...messages
        ]
      })
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      recordFailure(request);
      console.error("OpenRouter chat request failed", {
        status: response.status,
        providerMessage: data?.error?.message || data?.message
      });

      return NextResponse.json(
        {
          error:
            response.status === 429
              ? "The AI provider is rate limited. Please try again shortly."
              : "The AI chat is temporarily unavailable."
        },
        { status: response.status === 429 ? 429 : 502 }
      );
    }

    const answer = data?.choices?.[0]?.message?.content;

    if (typeof answer !== "string" || !answer.trim()) {
      return NextResponse.json(
        { error: "OpenRouter returned an empty answer." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      answer: answer.trim(),
      model: data?.model || config.model
    });
  } catch (error) {
    recordFailure(request);

    const message =
      error instanceof Error && error.name === "AbortError"
        ? "The AI response timed out. Please try again."
        : "The AI chat is temporarily unavailable.";

    return NextResponse.json({ error: message }, { status: 504 });
  } finally {
    clearTimeout(timeout);
  }
}
