import { NextResponse } from "next/server";

export const runtime = "nodejs"; // ensure Node runtime

export async function POST(req: Request) {
  try {
    const { pin } = await req.json();
    const expected = (process.env.PARENT_PIN || "").trim();

    if (!expected) {
      return NextResponse.json(
        { error: "Server missing PARENT_PIN" },
        { status: 500 }
      );
    }

    if (String(pin ?? "").trim() !== expected) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
