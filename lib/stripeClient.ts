async function openStripeUrl(path: string, accessToken: string, errorMessage: string) {
  const res = await fetch(path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(errorMessage);
  }

  const data = await res.json();
  if (!data?.url) {
    throw new Error("No Stripe URL returned");
  }

  window.location.href = data.url;
}

export async function openStripeCheckout(accessToken: string) {
  return openStripeUrl("/api/stripe/checkout", accessToken, "Failed to open checkout");
}

export async function openStripePortal(accessToken: string) {
  return openStripeUrl("/api/stripe/portal", accessToken, "Failed to open billing portal");
}
