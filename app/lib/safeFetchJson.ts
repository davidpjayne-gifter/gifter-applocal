export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; json: T | null; text: string | null }> {
  const res = await fetch(input, init);
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const json = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, json, text: null };
  }
  const text = await res.text().catch(() => null);
  return { ok: res.ok, status: res.status, json: null, text };
}
