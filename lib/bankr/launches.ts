import 'server-only';
import { createHash } from 'node:crypto';
import { TOKENS } from '@/lib/base/tokens';
import { HttpError } from '@/lib/account/auth-server';
import type { DeployRequest } from './types';

export interface LaunchIntent {
  tokenName: string; tokenSymbol: string; description: string; image?: string;
  websiteUrl?: string; tweetUrl?: string; ticker: string; quoteOnlyFees: boolean;
}

function optionalUrl(value: unknown, field: string, hosts?: string[]) {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string' || value.length > 500) throw new HttpError(400, `${field} is invalid`);
  let url: URL; try { url = new URL(value); } catch { throw new HttpError(400, `${field} must be a valid URL`); }
  if (url.protocol !== 'https:' || url.username || url.password || (hosts && !hosts.includes(url.hostname.toLowerCase()))) throw new HttpError(400, `${field} must use an approved HTTPS URL`);
  return url.toString();
}

export function normalizeLaunchIntent(body: Record<string, unknown>): LaunchIntent {
  const tokenName = typeof body.tokenName === 'string' ? body.tokenName.trim().replace(/\s+/g, ' ') : '';
  const tokenSymbol = typeof body.tokenSymbol === 'string' ? body.tokenSymbol.trim().toUpperCase() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const ticker = typeof body.ticker === 'string' ? body.ticker.trim().toUpperCase() : '';
  if (tokenName.length < 2 || tokenName.length > 100) throw new HttpError(400, 'Token name must be 2–100 characters');
  if (!/^[A-Z0-9]{2,10}$/.test(tokenSymbol)) throw new HttpError(400, 'Symbol must be 2–10 letters or numbers');
  if (description.length < 10 || description.length > 500) throw new HttpError(400, 'Description must be 10–500 characters');
  if (!TOKENS.some((token) => token.ticker === ticker)) throw new HttpError(400, 'Choose a supported stock pair');
  return {
    tokenName, tokenSymbol, description, ticker,
    image: optionalUrl(body.image, 'Artwork'), websiteUrl: optionalUrl(body.websiteUrl, 'Website'),
    tweetUrl: optionalUrl(body.tweetUrl, 'X post', ['x.com', 'twitter.com']),
    quoteOnlyFees: body.quoteOnlyFees === true,
  };
}

export function launchHash(userId: string, walletAddress: string, intent: LaunchIntent) {
  return createHash('sha256').update(JSON.stringify({ userId, walletAddress, ...intent })).digest('hex');
}

export function launchFingerprint(intentHash: string, tokenAddress: string, poolId: string) {
  return createHash('sha256').update(`${intentHash}:${tokenAddress.toLowerCase()}:${poolId.toLowerCase()}`).digest('hex');
}

export function bankrLaunchRequest(intent: LaunchIntent, walletAddress: string, simulateOnly: boolean): Omit<DeployRequest, 'chain'> {
  const stock = TOKENS.find((token) => token.ticker === intent.ticker)!;
  return {
    tokenName: intent.tokenName, tokenSymbol: intent.tokenSymbol, description: intent.description,
    image: intent.image, websiteUrl: intent.websiteUrl, tweetUrl: intent.tweetUrl,
    pairedStockAddress: stock.token, feeRecipient: { type: 'wallet', value: walletAddress },
    quoteOnlyFees: intent.quoteOnlyFees, simulateOnly,
  };
}
