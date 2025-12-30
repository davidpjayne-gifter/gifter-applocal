const DEFAULT_NEXT = "/gifts";
const ALLOWLIST = new Set(["/", "/gifts"]);

export function safeNext(nextPath?: string | null) {
  if (!nextPath || typeof nextPath !== "string") return DEFAULT_NEXT;
  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) return DEFAULT_NEXT;
  if (!ALLOWLIST.has(nextPath)) return DEFAULT_NEXT;
  return nextPath;
}
