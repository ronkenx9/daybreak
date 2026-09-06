export type RelationshipType =
  | 'manufactured_by'
  | 'service_operated_by'
  | 'brand_owned_by'
  | 'component_supplied_by';

export interface Company {
  id: string;
  name: string;
  ticker: string;
  sector: string;
  summary: string;
  headquarters: string;
  primarySourceUrl: string;
}

export interface Relationship {
  id: string;
  objectId: string;
  companyId: string;
  relationshipType: RelationshipType;
  claim: string;
  explanation: string;
  primarySourceUrl: string;
  sourceName: string;
  checkedAt: string;
  status: 'verified' | 'unverified';
}

/** Fixture-only instrument. Never use for real token discovery or execution. */
export interface Instrument {
  kind: 'simulation';
  chainId: number;
  address: `0x${string}`;
  name: string;
  symbol: string;
  underlyingCompany: string;
  decimals: number;
  rightsSummary: string;
  tokenIssuer: string;
  venueStatus: 'active' | 'paused' | 'unavailable';
  multiplier: number;
  simulatedPriceUsd: number;
}

export interface DiscoveryObject {
  id: string;
  label: string;
  category: string;
  iconName: string;
  color: string;
  secondaryColor: string;
  geometryType: 'laptop' | 'controller' | 'parcel' | 'screen' | 'chip' | 'mug';
  anchorSlot: number; // 0 to 5 on the room desk/shelves
  company: Company;
  relationship: Relationship;
  instrument: Instrument;
}

export interface PlacedObjectState {
  objectId: string;
  slotIndex: number;
  placedAt: number;
}

export interface WorldState {
  id: string;
  schemaVersion: number;
  createdAt: number;
  updatedAt: number;
  interests: string[];
  placedObjects: PlacedObjectState[];
}

export type TransactionStatus =
  | 'draft'
  | 'quoting'
  | 'reviewable'
  | 'awaiting_signature'
  | 'submitted'
  | 'confirming'
  | 'confirmed'
  | 'rejected'
  | 'reverted'
  | 'unknown';

export interface TradeQuote {
  id: string;
  instrumentAddress: `0x${string}`;
  symbol: string;
  inputToken: string; // e.g. "USDC"
  inputAmount: string; // human string, e.g. "10.00"
  atomicInputAmount: string; // bigint string
  expectedOutputShares: string; // human scaled share quantity, e.g. "0.0432"
  atomicOutputAmount: string;
  feeUsd: string;
  estimatedGasUsd: string;
  expiresAt: number; // timestamp ms
  spender: `0x${string}`;
}

export interface TradeReceipt {
  id: string;
  txHash: `0x${string}`;
  blockNumber: number;
  timestamp: number;
  instrumentAddress: `0x${string}`;
  symbol: string;
  sharesPurchased: string;
  amountSpentUsd: string;
  confirmedAt: number;
}

export interface HoldingItem {
  instrumentAddress: `0x${string}`;
  symbol: string;
  companyName: string;
  shares: string;
  estimatedValueUsd: string;
  lastUpdated: number;
  receiptId?: string;
}

export interface ShareSnapshot {
  id: string;
  version: 1;
  worldName: string;
  interests: string[];
  objectIds: string[];
  createdAt: number;
}
