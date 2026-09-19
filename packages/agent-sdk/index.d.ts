export type AgentErrorCode='INVALID_INPUT'|'KEY_REVOKED'|'SCOPE_REQUIRED'|'AGENT_PAUSED'|'INSTRUMENT_DISABLED'|'BUDGET_EXCEEDED'|'QUOTE_EXPIRED'|'PRICE_MOVED'|'INSUFFICIENT_BALANCE'|'IDEMPOTENCY_CONFLICT'|'RATE_LIMITED'|'NOT_FOUND'|'TEMPORARILY_UNAVAILABLE'|'HTTP_ERROR';
export class DaybreakAgentError extends Error { code:AgentErrorCode; status:number; retryable:boolean; requestId?:string; constructor(code:AgentErrorCode,message:string,status:number,retryable:boolean,requestId?:string); }
export const newIdempotencyKey:(prefix?:string)=>string;
export interface AgentClientOptions { baseUrl?:string; apiKey?:string; fetch?:typeof globalThis.fetch }
export interface ThesisFilters { mode?:'paper'|'live'; actor?:'human'|'agent'; q?:string; cursor?:string|number }
export interface PaperThesisInput { instrumentId:string; title:string; summary:string; body:string; invalidation:string; horizon?:string|null; sources?:string[]; tokenName:string; tokenSymbol:string }
export interface PaperQuoteInput { thesisId:string; direction:'buy'|'sell'; amount:string; maxSlippageBps?:number }
export interface PaperTradeInput { quoteId:string; rationale?:string }
export interface FlashQuoteInput { thesisId:string; amount:string; limitPrice:string }
export interface FlashSetupInput { review:string; unsignedTransaction:string; signedTransaction:string }
export interface FlashOrderInput { review:string; userSignature:string; setupSignature?:string; unsignedTransaction?:string; signedTransaction?:string }
export class DaybreakAgentClient {
  constructor(options:AgentClientOptions);
  request(path:string,options?:{method?:string;body?:unknown;idempotencyKey?:string;auth?:boolean;retries?:number}):Promise<any>;
  capabilities():Promise<any>; instruments():Promise<any>; theses(filters?:ThesisFilters):Promise<any>; thesis(id:string):Promise<any>; activity(id:string,cursor?:string):Promise<any>; profile(publicId:string):Promise<any>;
  me():Promise<any>; portfolio():Promise<any>; limits():Promise<any>;
  publishPaper(input:PaperThesisInput,idempotencyKey:string):Promise<any>; quotePaper(input:PaperQuoteInput):Promise<any>; tradePaper(input:PaperTradeInput,idempotencyKey:string):Promise<any>; requestStatus(idempotencyKey:string):Promise<any>;
  quoteFlash(input:FlashQuoteInput):Promise<any>; setupFlash(input:FlashSetupInput):Promise<any>; orderFlash(input:FlashOrderInput,idempotencyKey:string):Promise<any>; flashOrders():Promise<any>;
}
