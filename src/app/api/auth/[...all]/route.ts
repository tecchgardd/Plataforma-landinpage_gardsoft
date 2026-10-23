import { toNextJsHandler } from "better-auth/next-js";
import { auth, ensureAdminUser } from "@/lib/auth";

const handler = toNextJsHandler(auth);

export async function GET(request: Request) {
  await ensureAdminUser();
  return handler.GET(request);
}

export async function POST(request: Request) {
  await ensureAdminUser();
  return handler.POST(request);
}
