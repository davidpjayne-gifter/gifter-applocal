import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Gift = {
  id: string;
  title: string;
  recipient_name: string | null;
};

function toTitleCase(str: string) {
  return str
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export default async function SharePage(props: {
  params: Promise<{ token?: string }>;
  searchParams?: Promise<{ token?: string }>;
}) {
  const params = await props.params;
  const searchParams = props.searchParams ? await props.searchParams : undefined;

  const token = params?.token || searchParams?.token;

  if (!token) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui, -apple-system, Arial" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>Share</h1>
        <p style={{ color: "#b91c1c" }}>Missing share token.</p>
      </main>
    );
  }

  // 1) Look up the share token
  const { data: share, error: shareErr } = await supabaseAdmin
    .from("gift_shares")
    .select("list_id, recipient_key")
    .eq("share_token", token)
    .maybeSingle();

  if (shareErr || !share) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui, -apple-system, Arial" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>Share</h1>
        <p style={{ color: "#b91c1c" }}>This share link is invalid or expired.</p>
      </main>
    );
  }

  // 2) Fetch gifts for that recipient (case-insensitive)
  const { data: gifts, error: giftsErr } = await supabaseAdmin
    .from("gifts")
    .select("id, title, recipient_name")
    .eq("list_id", share.list_id)
    .ilike("recipient_name", `${share.recipient_key}%`)
    .order("created_at", { ascending: false });

  if (giftsErr) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui, -apple-system, Arial" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>Share</h1>
        <p style={{ color: "#b91c1c" }}>Error loading gifts.</p>
      </main>
    );
  }

  const displayName =
    share.recipient_key === "unassigned"
      ? "Unassigned"
      : toTitleCase(share.recipient_key);

  return (
    <main
      style={{
        padding: 18,
        maxWidth: 430,
        margin: "0 auto",
        fontFamily: "system-ui, -apple-system, Arial",
        background: "#ffffff",
      }}
    >
      {/* Title */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 900, lineHeight: 1.15 }}>
          What we bought for {displayName}:
        </div>
      </div>

      {/* Gift list */}
      {!gifts || gifts.length === 0 ? (
        <div
          style={{
            border: "1px dashed #cbd5e1",
            borderRadius: 14,
            padding: 16,
            color: "#64748b",
            textAlign: "center",
          }}
        >
          No gifts yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {gifts.map((g: Gift) => (
            <div
              key={g.id}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 14,
                padding: 14,
              }}
            >
              <div style={{ fontWeight: 800 }}>{g.title}</div>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          marginTop: 14,
          fontSize: 11,
          color: "#94a3b8",
          textAlign: "center",
        }}
      >
        Screenshot to share
      </div>
    </main>
  );
}
