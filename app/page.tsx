import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 10 }}>Gifter</h1>
      <p style={{ opacity: 0.8, marginBottom: 16 }}>Manage gifts, shipping, and wrapping status.</p>

      <Link
        href="/gifts"
        style={{
          display: "inline-block",
          padding: "10px 14px",
          borderRadius: 12,
          border: "1px solid #cbd5e1",
          fontWeight: 900,
          textDecoration: "none",
        }}
      >
        Go to Gifts →
      </Link>
    </main>
  );
}
