import { NextRequest, NextResponse } from "next/server";

// Single-admin app: maps the one allowed username to its Neon Auth email
// server-side, so the real email never ships in client JS. Same response
// shape on a bad username as a bad password would give, to avoid leaking
// which part was wrong.
export async function POST(req: NextRequest) {
  const { username } = await req.json();

  if (
    typeof username !== "string" ||
    username.trim().toLowerCase() !== process.env.ADMIN_USERNAME?.toLowerCase()
  ) {
    return NextResponse.json({ error: "invalid_username" }, { status: 401 });
  }

  return NextResponse.json({ email: process.env.ADMIN_EMAIL });
}
