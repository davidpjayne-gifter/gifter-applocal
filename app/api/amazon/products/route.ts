import { NextResponse } from "next/server";
import crypto from "crypto";

type PaapiItem = {
  asin: string;
  title: string | null;
  imageUrl: string | null;
  detailPageUrl: string;
};

type CacheEntry = {
  items: PaapiItem[];
  ts: number;
};

const CACHE = new Map<string, CacheEntry>();
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const REGION_BY_HOST: Record<string, string> = {
  "webservices.amazon.com": "us-east-1",
  "webservices.amazon.ca": "us-east-1",
  "webservices.amazon.co.uk": "eu-west-2",
  "webservices.amazon.de": "eu-central-1",
  "webservices.amazon.fr": "eu-west-1",
  "webservices.amazon.it": "eu-west-1",
  "webservices.amazon.es": "eu-west-1",
  "webservices.amazon.co.jp": "us-west-2",
  "webservices.amazon.in": "eu-west-1",
  "webservices.amazon.com.au": "us-west-2",
};

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

function hmac(key: Buffer | string, data: string) {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function getSignatureKey(secret: string, dateStamp: string, region: string, service: string) {
  const kDate = hmac(`AWS4${secret}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

function normalizeHost(input: string) {
  return input.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

function getPaapiHost(marketplace: string) {
  const normalized = normalizeHost(marketplace);
  if (normalized.startsWith("webservices.amazon.")) {
    return normalized;
  }
  if (normalized.startsWith("www.amazon.")) {
    return normalized.replace("www.amazon.", "webservices.amazon.");
  }
  return "webservices.amazon.com";
}

export async function POST(request: Request) {
  const accessKey = process.env.AMAZON_PAAPI_ACCESS_KEY;
  const secretKey = process.env.AMAZON_PAAPI_SECRET_KEY;
  const partnerTag = process.env.AMAZON_PARTNER_TAG;
  const partnerType = process.env.AMAZON_PARTNER_TYPE;
  const marketplace = process.env.AMAZON_MARKETPLACE;
  const debugEnabled = process.env.NODE_ENV !== "production";

  if (!accessKey || !secretKey || !partnerTag || !partnerType || !marketplace) {
    return NextResponse.json({
      items: [],
      ...(debugEnabled
        ? {
            debug: {
              host: null,
              region: null,
              status: null,
              errorCode: "MISSING_ENV",
              errorMessage: "Missing Amazon PA-API environment variables.",
              itemsCount: 0,
            },
          }
        : {}),
    });
  }

  const body = (await request.json().catch(() => null)) as { asins?: string[] } | null;
  const asins = Array.isArray(body?.asins)
    ? body!.asins.map((asin) => String(asin).trim()).filter(Boolean)
    : [];

  if (asins.length === 0) {
    return NextResponse.json({
      items: [],
      ...(debugEnabled
        ? {
            debug: {
              host: null,
              region: null,
              status: null,
              errorCode: "NO_ASINS",
              errorMessage: "No ASINs provided.",
              itemsCount: 0,
            },
          }
        : {}),
    });
  }

  const cacheKey = asins.join(",");
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < ONE_DAY_MS) {
    return NextResponse.json({
      items: cached.items,
      ...(debugEnabled
        ? {
            debug: {
              host: null,
              region: null,
              status: "cache",
              errorCode: null,
              errorMessage: null,
              itemsCount: cached.items.length,
            },
          }
        : {}),
    });
  }

  const host = getPaapiHost(marketplace);
  const region = REGION_BY_HOST[host] ?? "us-east-1";
  const service = "ProductAdvertisingAPI";
  const target = "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems";

  const payload = JSON.stringify({
    ItemIds: asins,
    Resources: ["Images.Primary.Medium", "Images.Primary.Small", "ItemInfo.Title"],
    PartnerTag: partnerTag,
    PartnerType: "Associates",
    Marketplace: marketplace,
  });

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const canonicalUri = "/paapi5/getitems";
  const canonicalQuery = "";
  const canonicalHeaders =
    `content-encoding:amz-1.0\n` +
    `content-type:application/json; charset=utf-8\n` +
    `host:${host}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:${target}\n`;
  const signedHeaders = "content-encoding;content-type;host;x-amz-date;x-amz-target";
  const payloadHash = sha256Hex(payload);
  const canonicalRequest = [
    "POST",
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = getSignatureKey(secretKey, dateStamp, region, service);
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  const authorization = `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(`https://${host}${canonicalUri}`, {
      method: "POST",
      headers: {
        "content-encoding": "amz-1.0",
        "content-type": "application/json; charset=utf-8",
        "x-amz-date": amzDate,
        "x-amz-target": target,
        "x-amz-content-sha256": payloadHash,
        authorization,
      },
      body: payload,
      signal: controller.signal,
      cache: "no-store",
    });

    const json = (await res.json().catch(() => null)) as any;
    const items = Array.isArray(json?.ItemsResult?.Items)
      ? json.ItemsResult.Items.map((item: any) => ({
          asin: String(item?.ASIN ?? ""),
          title: item?.ItemInfo?.Title?.DisplayValue ?? null,
          imageUrl:
            item?.Images?.Primary?.Medium?.URL ??
            item?.Images?.Primary?.Small?.URL ??
            null,
          detailPageUrl: item?.DetailPageURL ?? "",
        }))
      : [];

    const responseItems = asins.map((asin) => {
      const found = items.find((item: PaapiItem) => item.asin === asin);
      return found ?? { asin, title: null, imageUrl: null, detailPageUrl: "" };
    });

    const firstItem = responseItems[0];
    if (debugEnabled) {
      if (firstItem) {
        console.debug("API_DEBUG_FIRST", firstItem);
      }
      console.debug("API_DEBUG_META", {
        host,
        region,
        status: res.status,
        errorCode: json?.Errors?.[0]?.Code ?? null,
        errorMessage: json?.Errors?.[0]?.Message ?? null,
      });
    }

    CACHE.set(cacheKey, { items: responseItems, ts: Date.now() });
    return NextResponse.json({
      items: responseItems,
      ...(debugEnabled
        ? {
            debug: {
              host,
              region,
              status: res.status,
              errorCode: json?.Errors?.[0]?.Code ?? null,
              errorMessage: json?.Errors?.[0]?.Message ?? null,
              itemsCount: responseItems.length,
            },
          }
        : {}),
    });
  } catch {
    const responseItems = asins.map((asin) => ({
      asin,
      title: null,
      imageUrl: null,
      detailPageUrl: "",
    }));
    CACHE.set(cacheKey, { items: responseItems, ts: Date.now() });
    return NextResponse.json({
      items: responseItems,
      ...(debugEnabled
        ? {
            debug: {
              host,
              region,
              status: "error",
              errorCode: "FETCH_ERROR",
              errorMessage: "Failed to reach Amazon PA-API.",
              itemsCount: responseItems.length,
            },
          }
        : {}),
    });
  } finally {
    clearTimeout(timeout);
  }
}
