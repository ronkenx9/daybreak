import assert from 'node:assert/strict';
import { getAddress } from 'viem';

const expectedSeller = process.argv[2];
assert.ok(expectedSeller, 'Expected seller address argument is required');
const normalizedSeller = getAddress(expectedSeller);

const response = await fetch('https://www.daybreakcircles.lol/api/v1/market/pairing-opportunities?limit=1', {
  headers: { accept: 'application/json' },
  signal: AbortSignal.timeout(15_000),
});
assert.equal(response.status, 402, `Expected HTTP 402, received ${response.status}`);
const encoded = response.headers.get('payment-required');
assert.ok(encoded, 'PAYMENT-REQUIRED header is missing');
const challenge = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
assert.equal(challenge.x402Version, 2);
assert.ok(Array.isArray(challenge.accepts) && challenge.accepts.length > 0, 'No payment requirements advertised');
const baseRequirement = challenge.accepts.find((item) => item.network === 'eip155:8453');
assert.ok(baseRequirement, 'Base mainnet requirement is missing');
assert.equal(baseRequirement.scheme, 'exact');
assert.equal(baseRequirement.amount, '5000');
assert.equal(getAddress(baseRequirement.payTo), normalizedSeller);
console.log('live x402 seller verification passed');
