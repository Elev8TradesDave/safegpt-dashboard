import { NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY is not set. SafeGPT API will not work until it is configured.");
}

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function POST(req: Request) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Server is missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    const body = await req.json();

    // Flexible input: either { message: string } or { messages: ChatMessage[] }
    let userMessages: ChatMessage[] = [];

    if (Array.isArray(body?.messages)) {
      userMessages = body.messages;
    } else if (typeof body?.message === "string") {
      userMessages = [{ role: "user", content: body.message }];
    } else {
      return NextResponse.json(
        { error: "Invalid request body. Expected { message } or { messages }." },
        { status: 400 }
      );
    }

    const lastUser = userMessages
      .slice()
      .reverse()
      .find((m) => m.role === "user");

    const lastContent = lastUser?.content?.toLowerCase() ?? "";

    // Very simple topic guard — we can refine this over time
    const restrictedKeywords = [
      "sex",
      "sexual",
      "porn",
      "onlyfans",
      "hookup",
      "boyfriend",
      "girlfriend",
      "dating",
      "crush",
      "sext",
      "nudes",
    ];

    const isRestricted = restrictedKeywords.some((kw) =>
      lastContent.includes(kw)
    );

    if (isRestricted) {
      // Hard stop + parent redirect
      return NextResponse.json({
        role: "assistant",
        content:
          "This is a topic you need to talk about with a parent or trusted adult. I can't answer this, but please ask your mom or dad (or another adult you trust) instead.",
      });
    }

    // System prompt for SafeGPT kid helper
    const systemMessage: ChatMessage = {
      role: "system",
      content: [
        "You are SafeGPT, a kid-friendly helper for a middle-school student with ADHD.",
        "Goals:",
        "- Help them plan their day, understand school topics, and stay motivated.",
        "- Keep explanations concrete, short chunks, and step-by-step.",
        "- Encourage healthy routines: breaks, movement, and asking parents for help when needed.",
        "",
        "Safety rules (very important):",
        "- Do NOT answer questions about sex, sexual relationships, explicit content, or anything similar.",
        "- For those topics, always say they must talk to a parent or trusted adult.",
        "- Be neutral on politics and adult controversies.",
        "- No profanity, no mean or insulting language.",
        "",
        "If a question seems more like an adult decision (legal, medical, mental health crisis), tell them kindly that a parent or professional adult must help.",
      ].join("\n"),
    };

    const messagesForOpenAI: ChatMessage[] = [
      systemMessage,
      ...userMessages,
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messagesForOpenAI,
        temperature: 0.6,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      return NextResponse.json(
        { error: "Upstream OpenAI error", details: errorText },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content =
      data?.choices?.[0]?.message?.content ??
      "Sorry, I had trouble generating a response. Please try again.";

    return NextResponse.json({
      role: "assistant",
      content,
    });
  } catch (err) {
    console.error("SafeGPT /api/chat error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
