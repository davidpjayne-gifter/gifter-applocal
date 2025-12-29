import { headers } from "next/headers";

export const dynamic = "force-dynamic";

type Item = {
  id: string;
  title: string;
  category: string | null;
  price_bucket: string | null;
  count: number;
  updated_at?: string;
  created_at?: string;
};

function amazonSearchUrl(title: string) {
  return `https://www.amazon.com/s?k=${encodeURIComponent(title)}`;
}

export default async function ExplorePage() {
  // ✅ Next.js dynamic API: headers() can be async
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  const res = await fetch(`${origin}/api/explore?limit=50`, {
    cache: "no-store",
  });

  const json = await res.json();
  const items: Item[] = json?.items ?? [];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
        Explore Gifts
      </h1>

      <p style={{ opacity: 0.8, marginBottom: 16 }}>
        Trending gifts based on what people are <b>done GIFTing</b>.
      </p>

      {items.length === 0 ? (
        <div
          style={{
            padding: 16,
            border: "1px solid #ddd",
            borderRadius: 12,
          }}
        >
          <b>No trending gifts yet.</b>
          <div style={{ marginTop: 6, opacity: 0.8 }}>
            Mark a gift as done GIFTing to start populating Explore.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((it, idx) => (
            <div
              key={it.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                padding: 14,
                border: "1px solid #ddd",
                borderRadius: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                  <div style={{ fontWeight: 700 }}>{idx + 1}.</div>
                  <div
                    style={{
                      fontWeight: 700,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {it.title}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 6,
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    opacity: 0.85,
                  }}
                >
                  {it.category && (
                    <span
                      style={{
                        padding: "2px 8px",
                        border: "1px solid #ccc",
                        borderRadius: 999,
                      }}
                    >
                      {it.category}
                    </span>
                  )}

                  {it.price_bucket && (
                    <span
                      style={{
                        padding: "2px 8px",
                        border: "1px solid #ccc",
                        borderRadius: 999,
                      }}
                    >
                      {it.price_bucket}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{it.count}</div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>done GIFTing</div>
                </div>

                <a
                  href={amazonSearchUrl(it.title)}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: "8px 10px",
                    border: "1px solid #ccc",
                    borderRadius: 10,
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  View
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
