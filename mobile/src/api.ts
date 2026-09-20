export const API_ORIGIN = process.env.EXPO_PUBLIC_API_ORIGIN || "https://www.daybreakcircles.lol";

export type Company = {
  ticker: string;
  name: string;
  baseSymbol: string;
  solanaSymbol: string | null;
  solanaInstrumentId: string | null;
};
export type Circle = {
  slug: string;
  name: string;
  description: string | null;
  kind: string;
  tickers: string[];
  memberCount: number;
  pinned: boolean;
};
export type Thesis = {
  id: string;
  slug: string;
  companyId: string;
  title: string;
  summary: string;
  body: string;
  invalidation: string;
  horizon: string;
  tokenSymbol: string;
  mode: "paper" | "live";
  authorKind: "agent" | "human";
  authorName: string | null;
  paperTradeCount: number | null;
  publishedAt: string | null;
};
export type Stats = {
  configured: boolean;
  accounts?: number | null;
  circles?: number | null;
  members?: number | null;
  messages?: number | null;
  launches?: number | null;
  wallets?: number | null;
};
export type EquityPrice = {
  priceUsd: number | null;
  source: "pyth" | "chainlink-ref" | "unavailable";
  asOf: number | null;
  stale: boolean;
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function getJson(path: string, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 12_000);
  try {
    const response = await fetch(`${API_ORIGIN}${path}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok)
      throw new ApiError(
        response.status,
        response.status === 429
          ? "Daybreak is busy. Pull to retry."
          : "Could not load this feed. Pull to retry.",
      );
    return await response.json();
  } catch (error) {
    if (timedOut) throw new ApiError(408, "This feed is taking too long. Pull to retry.");
    if (error instanceof TypeError) throw new ApiError(0, "Daybreak is unavailable. Pull to retry.");
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const string = (value: unknown): value is string => typeof value === "string";

export async function companies(signal?: AbortSignal): Promise<Company[]> {
  const data = await getJson("/api/mobile/companies", signal);
  if (!record(data) || !Array.isArray(data.items))
    throw new Error("Company feed has an unexpected format.");
  return data.items.filter(
    (item): item is Company =>
      record(item) &&
      string(item.ticker) &&
      string(item.name) &&
      string(item.baseSymbol) &&
      (item.solanaSymbol === null || string(item.solanaSymbol)) &&
      (item.solanaInstrumentId === null || string(item.solanaInstrumentId)),
  );
}

export async function circles(signal?: AbortSignal): Promise<Circle[]> {
  const data = await getJson("/api/circles/public", signal);
  if (!record(data) || !Array.isArray(data.circles))
    throw new Error("Circle feed has an unexpected format.");
  return data.circles.filter(
    (item): item is Circle =>
      record(item) &&
      string(item.slug) &&
      string(item.name) &&
      Array.isArray(item.tickers) &&
      item.tickers.every(string) &&
      typeof item.memberCount === "number" &&
      typeof item.pinned === "boolean",
  );
}

export async function theses(
  mode: "all" | "paper" | "live",
  signal?: AbortSignal,
): Promise<Thesis[]> {
  const query = mode === "all" ? "" : `?mode=${mode}`;
  const data = await getJson(`/api/theses${query}`, signal);
  if (!record(data) || !Array.isArray(data.items))
    throw new Error("Thesis feed has an unexpected format.");
  return data.items.filter(
    (item): item is Thesis =>
      record(item) &&
      string(item.id) &&
      string(item.slug) &&
      string(item.title) &&
      string(item.summary) &&
      (item.mode === "paper" || item.mode === "live"),
  );
}

export async function stats(signal?: AbortSignal): Promise<Stats> {
  const data = await getJson("/api/stats", signal);
  if (!record(data) || typeof data.configured !== "boolean")
    throw new Error("Stats have an unexpected format.");
  return data as Stats;
}

export async function prices(
  tickers: string[],
  signal?: AbortSignal,
): Promise<Record<string, EquityPrice>> {
  if (!tickers.length) return {};
  const data = await getJson(
    `/api/equity-prices?tickers=${encodeURIComponent(tickers.slice(0, 20).join(","))}`,
    signal,
  );
  if (!record(data) || !record(data.prices))
    throw new Error("Prices have an unexpected format.");
  return data.prices as Record<string, EquityPrice>;
}

export function appLink(path: string): string {
  if (
    !/^\/app(?:\/(?:groups|conviction|stats|profile))?(?:\?(?:thesis=[a-z0-9-]+(?:&simulate=1)?|stock=[A-Z]{1,8}))?$/.test(
      path,
    )
  )
    throw new Error("Invalid app path");
  return `${API_ORIGIN}${path}`;
}

export function thesisLink(slug: string, mode: "paper" | "live"): string {
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) throw new Error("Invalid thesis slug");
  return `/app/conviction?thesis=${slug}${mode === "paper" ? "&simulate=1" : ""}`;
}

export function stockLink(ticker: string): string {
  if (!/^[A-Z]{1,8}$/.test(ticker)) throw new Error("Invalid stock ticker");
  return `/app?stock=${ticker}`;
}
