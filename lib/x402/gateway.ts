import 'server-only';
import { createGatewayMiddleware, type GatewayMiddleware, type PaymentRequest, type PaymentResponse } from '@circle-fin/x402-batching/server';
import { isAddress } from 'viem';

export const X402_PRICE_USD = '$0.005';
export const X402_NETWORK = 'eip155:8453';
export const X402_DESCRIPTION = 'Daybreak Base stock-pairing opportunity intelligence';

interface PaymentReceipt {
  payer: string;
  amount: string;
  network: string;
  transaction?: string;
}

interface AuthorizationResult {
  response?: Response;
  payment?: PaymentReceipt;
  paymentResponseHeader?: string;
}

type HeaderValue = string | number | readonly string[];

let cachedGateway: { sellerAddress: string; middleware: GatewayMiddleware } | null = null;

function gatewayFor(sellerAddress: string): GatewayMiddleware {
  if (cachedGateway?.sellerAddress === sellerAddress) return cachedGateway.middleware;
  const middleware = createGatewayMiddleware({
    sellerAddress,
    networks: X402_NETWORK,
    description: X402_DESCRIPTION,
  });
  cachedGateway = { sellerAddress, middleware };
  return middleware;
}

function json(status: number, body: Record<string, unknown>, headers?: HeadersInit): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

export async function requirePairingPayment(request: Request): Promise<AuthorizationResult> {
  const sellerAddress = process.env.DAYBREAK_X402_SELLER_ADDRESS?.trim() ?? '';
  if (!isAddress(sellerAddress)) {
    return { response: json(503, { error: 'Paid data API is not configured', code: 'X402_NOT_CONFIGURED' }) };
  }

  const gateway = gatewayFor(sellerAddress);
  const requestUrl = new URL(request.url);
  const nodeHeaders: Record<string, string> = {};
  request.headers.forEach((value, name) => { nodeHeaders[name.toLowerCase()] = value; });
  const nodeRequest = {
    method: request.method,
    url: `${requestUrl.pathname}${requestUrl.search}`,
    headers: nodeHeaders,
  } as unknown as PaymentRequest;

  let ended = false;
  let responseBody = '';
  const responseHeaders = new Headers();
  const nodeResponse = {
    statusCode: 200,
    setHeader(name: string, value: HeaderValue) {
      if (Array.isArray(value)) responseHeaders.set(name, value.join(', '));
      else responseHeaders.set(name, String(value));
      return this;
    },
    end(body?: string | Uint8Array) {
      ended = true;
      responseBody = typeof body === 'string' ? body : body ? Buffer.from(body).toString('utf8') : '';
      return this;
    },
  } as unknown as PaymentResponse;

  let authorized = false;
  await gateway.require(X402_PRICE_USD)(nodeRequest, nodeResponse, () => { authorized = true; });

  if (!authorized || ended) {
    const status = nodeResponse.statusCode || 500;
    if (status >= 500) return { response: json(503, { error: 'Payment service temporarily unavailable', code: 'X402_FACILITATOR_UNAVAILABLE' }) };
    responseHeaders.set('Cache-Control', 'no-store');
    return { response: new Response(responseBody || '{}', { status, headers: responseHeaders }) };
  }

  return {
    payment: nodeRequest.payment,
    paymentResponseHeader: responseHeaders.get('PAYMENT-RESPONSE') ?? undefined,
  };
}
