#!/usr/bin/env node
// ── r0x x402 v2 test transaction ──────────────────────────────────────────
// Completes a REAL, live payment against any r0x skill endpoint: signs an
// EIP-3009 TransferWithAuthorization for USDG on Robinhood Chain and lets
// r0x's self-hosted facilitator verify + settle it on-chain.
//
// Usage:
//   PAYER_PRIVATE_KEY=0x... node scripts/test-transaction.js [url]
//
// Requires viem (already a dependency of packages/api). Run from inside
// packages/api, or `npm install viem` anywhere else you copy this script.

const crypto = require('crypto');
const { privateKeyToAccount } = require('viem/accounts');

const TARGET_URL = process.argv[2] || 'https://projectr0x.dev/skill/price/ETH';
const PRIVATE_KEY = process.env.PAYER_PRIVATE_KEY;

function b64encode(obj) {
    return Buffer.from(JSON.stringify(obj), 'utf-8').toString('base64');
}

function b64decode(str) {
    return JSON.parse(Buffer.from(str, 'base64').toString('utf-8'));
}

async function main() {
    if (!PRIVATE_KEY) {
        console.error('Set PAYER_PRIVATE_KEY (a wallet holding a little USDG on Robinhood Chain) and re-run.');
        process.exit(1);
    }

    const account = privateKeyToAccount(PRIVATE_KEY);
    console.log(`[1/4] Payer wallet: ${account.address}`);
    console.log(`[1/4] Calling ${TARGET_URL} with no payment...`);

    const first = await fetch(TARGET_URL);
    if (first.status !== 402) {
        console.log(`Expected 402, got ${first.status}. Response:`, await first.text());
        process.exit(first.status === 200 ? 0 : 1);
    }

    const header = first.headers.get('payment-required') || first.headers.get('PAYMENT-REQUIRED');
    if (!header) throw new Error('402 response is missing the PAYMENT-REQUIRED header');
    const paymentRequired = b64decode(header);
    const requirements = paymentRequired.accepts[0];

    console.log(`[2/4] Got 402. Price: ${requirements.amount} atomic units of ${requirements.extra.name} on ${requirements.network}`);
    console.log(`[2/4] payTo: ${requirements.payTo}`);

    const chainId = parseInt(requirements.network.split(':')[1], 10);
    const nonce = '0x' + crypto.randomBytes(32).toString('hex');
    const nowSec = Math.floor(Date.now() / 1000);

    const authorization = {
        from: account.address,
        to: requirements.payTo,
        value: requirements.amount,
        validAfter: '0',
        validBefore: (nowSec + requirements.maxTimeoutSeconds).toString(),
        nonce,
    };

    console.log('[3/4] Signing EIP-3009 TransferWithAuthorization...');
    const signature = await account.signTypedData({
        domain: {
            name: requirements.extra.name,
            version: requirements.extra.version,
            chainId,
            verifyingContract: requirements.asset,
        },
        types: {
            TransferWithAuthorization: [
                { name: 'from', type: 'address' },
                { name: 'to', type: 'address' },
                { name: 'value', type: 'uint256' },
                { name: 'validAfter', type: 'uint256' },
                { name: 'validBefore', type: 'uint256' },
                { name: 'nonce', type: 'bytes32' },
            ],
        },
        primaryType: 'TransferWithAuthorization',
        message: authorization,
    });

    const paymentPayload = {
        x402Version: paymentRequired.x402Version,
        resource: paymentRequired.resource,
        accepted: requirements,
        payload: { authorization, signature },
        extensions: paymentRequired.extensions,
    };

    console.log('[4/4] Retrying with PAYMENT-SIGNATURE header (this settles on-chain)...');
    const paid = await fetch(TARGET_URL, {
        headers: { 'PAYMENT-SIGNATURE': b64encode(paymentPayload) },
    });

    if (!paid.ok) {
        console.error(`Payment failed: ${paid.status}`, await paid.text());
        process.exit(1);
    }

    const settlement = paid.headers.get('payment-response') || paid.headers.get('PAYMENT-RESPONSE');
    console.log('\n✅ Payment settled.');
    if (settlement) console.log('Settlement receipt:', b64decode(settlement));
    console.log('Response body:', await paid.json());
}

main().catch((err) => {
    console.error('Test transaction failed:', err);
    process.exit(1);
});
