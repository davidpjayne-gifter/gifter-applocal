export const runtime = "nodejs";

const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";

export async function GET() {
  const computedBaseUrl = getBaseUrl();

  return Response.json({
    expected_prod: "https://gifter.skeletonkeysolution.com/auth/callback",
    env_NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? null,
    env_APP_URL: process.env.APP_URL ?? null,
    computed_base_url: computedBaseUrl,
    computed_email_redirect_to: `${computedBaseUrl}/auth/callback`,
    is_expected_domain: computedBaseUrl.startsWith("https://gifter.skeletonkeysolution.com"),
  });
}
