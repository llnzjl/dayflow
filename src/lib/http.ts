import { userFrom, type User } from "./auth";
export const json = (d: unknown, status = 200, headers: Record<string, string> = {}) => Response.json(d, { status, headers });
export function need(req: Request): User | Response { return userFrom(req) ?? json({ error: "Please log in." }, 401); }
export const isRes = (x: unknown): x is Response => x instanceof Response;
