import { NextResponse } from "next/server";

export const runtime = "nodejs"; // node runtime for Windows dev

// -------------------- Tiny in-memory rate limiter --------------------
const RL_WINDOW_MS = 60_000;       // 1 minute window
const RL_MAX_HITS = 20;            // max requests per IP per window
const rlHits = new Map<string, number[]>();

function getClientIp(req: Request): string {
  const h = new Headers(req.headers);
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    h.get("cf-connecting-ip") ||
    "local"
  );
}

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = rlHits.get(ip) ?? [];
  // keep only hits inside the window
  const recent = bucket.filter((t) => now - t < RL_WINDOW_MS);
  recent.push(now);
  rlHits.set(ip, recent);
  return recent.length <= RL_MAX_HITS;
}

// -------------------- Safety / utility helpers --------------------
const BANNED_REGEX = /\b(porn|nsfw|sex|sexual|suicide|self\s?-?harm)\b/i;

type ChatRole = "system" | "user" | "assistant";
interface ChatMessage {
  role: ChatRole;
  content: string;
}

async function callModeration(apiKey: string, text: string) {
  const resp = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "omni-moderation-latest",
      input: text.slice(0, 8000),
    }),
  });
  if (!resp.ok) {
    // if moderation fails for network reasons we’ll continue, but you could hard-fail here
    return { flagged: false };
  }
  const data = await resp.json();
  const flagged = Boolean(data?.results?.[0]?.flagged);
  return { flagged };
}

// Baseline server-side safety policy that’s always prepended
const SERVER_SYSTEM_POLICY = [
  "You are KidSafe GPT, a child-safe educational assistant.",
  "Always keep answers age-appropriate and avoid graphic details.",
  "Politely refuse sexual content, pornography, dating, NSFW, self-harm, or similar requests.",
  "For factual topics (science, history, health), include a short 'Sources:' list with reputable references on new lines using hyphen bullets.",
  "Keep replies concise and calm; no sensationalism.",
].join("\n");

export async function POST(req: Request) {
  try {
    // ----- Rate limit
    const ip = getClientIp(req);
    if (!rateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429 }
      );
    }

    // ----- Parse input
    const body = await req.json().catch(() => ({}));
    const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
    if (!messages.length) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    // ----- Screen user text quickly (local)
    const userText = messages
      .filter((m) => m?.role === "user")
      .map((m) => m?.content || "")
      .join("\n")
      .slice(0, 8000);

    if (BANNED_REGEX.test(userText)) {
      return NextResponse.json({
        content:
          "I can’t help with that topic. Please ask a parent or try a different question.",
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY (set it in .env.local and restart)" },
        { status: 500 }
      );
    }

    // ----- OpenAI Moderation (server-side)
    const mod = await callModeration(apiKey, userText);
    if (mod.flagged) {
      return NextResponse.json({
        content:
          "I can’t help with that topic. Please ask a parent or try a different question.",
      });
    }

    // ----- Prepend server safety system message
    const finalMessages: ChatMessage[] = [
      { role: "system", content: SERVER_SYSTEM_POLICY },
      ...messages,
    ];

    // ----- Call Chat Completions
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        max_tokens: 800,
        messages: finalMessages,
      }),
    });

    const raw = await resp.text();
    if (!resp.ok) {
      // Bubble up upstream error so you can see why
      try {
        const j = JSON.parse(raw);
        return NextResponse.json(
          { error: j?.error?.message || raw || "Upstream error" },
          { status: resp.status }
        );
      } catch {
        return NextResponse.json({ error: raw || "Upstream error" }, { status: resp.status });
      }
    }

    const data = JSON.parse(raw);
    const content: string = data?.choices?.[0]?.message?.content || "(no content)";

    // ----- Enforce a simple “Sources:” presence for factual answers
    const mustCite = true;
    if (mustCite && !/(?:^|\n)\s*Sources\s*:/i.test(content)) {
      // If missing, you could re-prompt the model here. For now, send a friendly note.
      return NextResponse.json({
        content:
          "I wasn’t able to include reputable sources yet. Please ask again and I’ll cite peer-reviewed or reputable references.",
      });
    }

    return NextResponse.json({ content });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
