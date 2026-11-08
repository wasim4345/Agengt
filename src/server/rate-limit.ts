import { LIMITS } from "@/lib/limits";

const hits = new Map<string, number[]>();

export function allowRequest(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter(
    (stamp) => now - stamp < LIMITS.rateLimitWindowMs,
  );
  if (recent.length >= LIMITS.rateLimitMax) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "local";
}
