const DEFAULT_NEXT = "/";

export function safeNextClient(nextPath?: string | null) {
  if (!nextPath || typeof nextPath !== "string") return DEFAULT_NEXT;
  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) return DEFAULT_NEXT;
  return nextPath;
}
