"use client";

export default function ShareRecipientButton({
  recipientKey,
  listId,
}: {
  recipientKey: string;
  listId: string;
}) {
  async function handleClick() {
    const rk = (recipientKey || "").trim().toLowerCase();
    const lid = (listId || "").trim();

    if (!rk) {
      console.error("ShareRecipientButton missing recipientKey prop:", recipientKey);
      alert("Share failed: recipient key is missing.");
      return;
    }
    if (!lid) {
      console.error("ShareRecipientButton missing listId prop:", listId);
      alert("Share failed: list id is missing.");
      return;
    }

    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientKey: rk, listId: lid }),
    });

    const raw = await res.text();
    let json: any = null;
    try {
      json = raw ? JSON.parse(raw) : null;
    } catch {
      json = null;
    }

    if (!res.ok) {
      console.error("Share API error status:", res.status);
      console.error("Share API raw:", raw);
      alert((json && json.error) || `Share failed (${res.status}).`);
      return;
    }

    const token = json?.token;
    if (!token) {
      console.error("Share API missing token:", { raw, json });
      alert("Share failed: token missing.");
      return;
    }

    window.open(`/share/${token}`, "_blank");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        padding: "6px 10px",
        borderRadius: 10,
        border: "1px solid #cbd5e1",
        background: "#ffffff",
        fontSize: 12,
        fontWeight: 800,
        color: "#334155",
        cursor: "pointer",
      }}
    >
      Share this list
    </button>
  );
}
