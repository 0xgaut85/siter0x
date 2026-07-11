#!/usr/bin/env node
// ── r0x Scan wallet drip ────────────────────────────────────────────────────
// Generates N fresh wallets, funds each with a bit of USDG from a funding
// wallet, then works through them ONE AT A TIME (never in parallel): the
// active wallet fires a real x402 payment against the live server every
// random 5-15s until its balance can no longer cover a payment, then the
// script moves on to the next wallet. Stops once every wallet is drained.
//
// Usage (run from packages/api):
//   FUNDING_PRIVATE_KEY=0x... node scripts/wallet_drip.js
//
// Optional env vars:
//   NUM_WALLETS           how many fresh wallets to generate   (default 5)
//   FUND_PER_WALLET_USDG  USDG sent to each fresh wallet        (default 0.3)
//   TARGET_BASE_URL       server to hit                         (default https://projectr0x.dev)
//   MIN_DELAY_MS          min delay between txns for a wallet   (default 5000)
//   MAX_DELAY_MS          max delay between txns for a wallet   (default 15000)

const crypto = require('crypto');
const {
    createWalletClient,
    http,
    publicActions,
    defineChain,
    encodeFunctionData,
} = require('viem');
const { privateKeyToAccount, generatePrivateKey } = require('viem/accounts');

const RPC = 'https://rpc.mainnet.chain.robinhood.com';
const USDG = '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168';
const BASE_URL = process.env.TARGET_BASE_URL || 'https://projectr0x.dev';
const NUM_WALLETS = parseInt(process.env.NUM_WALLETS || '5', 10);
const FUND_PER_WALLET = parseFloat(process.env.FUND_PER_WALLET_USDG || '0.3');
const MIN_DELAY_MS = parseInt(process.env.MIN_DELAY_MS || '5000', 10);
const MAX_DELAY_MS = parseInt(process.env.MAX_DELAY_MS || '15000', 10);
const MIN_BALANCE_ATOMIC = 10000n; // 0.01 USDG, the cheapest endpoint price

const robinhoodChain = defineChain({
    id: 4663,
    name: 'Robinhood Chain',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [RPC] } },
});

const ERC20_ABI = [
    {
        name: 'transfer',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
    },
];

function b64encode(obj) {
    return Buffer.from(JSON.stringify(obj), 'utf-8').toString('base64');
}
function b64decode(str) {
    return JSON.parse(Buffer.from(str, 'base64').toString('utf-8'));
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function randomDelay() {
    return MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
}

async function rpc(method, params = []) {
    const res = await fetch(RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error.message);
    return json.result;
}

async function usdgBalance(address) {
    const selector = '0x70a08231';
    const padded = address.substring(2).toLowerCase().padStart(64, '0');
    const hex = await rpc('eth_call', [{ to: USDG, data: `${selector}${padded}` }, 'latest']);
    return BigInt(hex);
}

function endpointsFor(addr) {
    return [
        `${BASE_URL}/skill/price/ETH`,
        `${BASE_URL}/skill/wallet/generate`,
        `${BASE_URL}/skill/balance/${addr}`,
        `${BASE_URL}/skill/fund/${addr}`,
    ];
}

async function payOnce(account, targetUrl) {
    const first = await fetch(targetUrl);
    if (first.status !== 402) {
        const body = await first.text();
        throw new Error(`expected 402 from ${targetUrl}, got ${first.status}: ${body.slice(0, 200)}`);
    }
    const header = first.headers.get('payment-required') || first.headers.get('PAYMENT-REQUIRED');
    const paymentRequired = b64decode(header);
    const requirements = paymentRequired.accepts[0];
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

    const paid = await fetch(targetUrl, {
        headers: { 'PAYMENT-SIGNATURE': b64encode(paymentPayload) },
    });

    if (!paid.ok) {
        const body = await paid.text();
        throw new Error(`payment failed (${paid.status}) on ${targetUrl}: ${body.slice(0, 300)}`);
    }
    const settlement = paid.headers.get('payment-response') || paid.headers.get('PAYMENT-RESPONSE');
    return settlement ? b64decode(settlement) : null;
}

async function driveWallet(index, total, wallet) {
    console.log(`\n== wallet ${index + 1}/${total}: ${wallet.account.address} ==`);
    let count = 0;
    let consecutiveErrors = 0;

    while (true) {
        const balance = await usdgBalance(wallet.account.address);
        if (balance < MIN_BALANCE_ATOMIC) {
            console.log(`   balance ${Number(balance) / 1e6} USDG too low, wallet drained after ${count} txns.`);
            break;
        }

        const urls = endpointsFor(wallet.account.address);
        const url = urls[Math.floor(Math.random() * urls.length)];

        try {
            const settlement = await payOnce(wallet.account, url);
            count += 1;
            consecutiveErrors = 0;
            console.log(`   [${count}] ${url} -> ${settlement ? settlement.transaction : 'settled'}`);
        } catch (err) {
            consecutiveErrors += 1;
            console.error(`   error: ${err.message}`);
            if (consecutiveErrors >= 3) {
                console.log(`   3 consecutive failures, treating wallet as drained/broken and moving on.`);
                break;
            }
        }

        const delay = randomDelay();
        await sleep(delay);
    }

    return count;
}

async function main() {
    const fundingKey = process.env.FUNDING_PRIVATE_KEY;
    if (!fundingKey) throw new Error('Set FUNDING_PRIVATE_KEY');

    const fundingAccount = privateKeyToAccount(fundingKey);
    const fundingClient = createWalletClient({
        account: fundingAccount,
        chain: robinhoodChain,
        transport: http(RPC),
    }).extend(publicActions);

    console.log(`funding wallet: ${fundingAccount.address}`);
    const fundingBalance = await usdgBalance(fundingAccount.address);
    console.log(`funding wallet USDG balance: ${Number(fundingBalance) / 1e6}`);

    const totalNeeded = BigInt(Math.round(FUND_PER_WALLET * 1e6)) * BigInt(NUM_WALLETS);
    if (fundingBalance < totalNeeded) {
        throw new Error(
            `funding wallet only has ${Number(fundingBalance) / 1e6} USDG, needs ${Number(totalNeeded) / 1e6} USDG for ${NUM_WALLETS} wallets.`
        );
    }

    const wallets = Array.from({ length: NUM_WALLETS }, () => {
        const pk = generatePrivateKey();
        return { pk, account: privateKeyToAccount(pk) };
    });

    console.log(`\ngenerated ${NUM_WALLETS} fresh wallets (save these private keys now if you want them, they are not stored anywhere):`);
    wallets.forEach((w, i) => console.log(`  wallet ${i + 1}: address=${w.account.address} key=${w.pk}`));

    console.log(`\nfunding each wallet with ${FUND_PER_WALLET} USDG...`);
    const fundAmountAtomic = BigInt(Math.round(FUND_PER_WALLET * 1e6));
    for (const w of wallets) {
        const data = encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'transfer',
            args: [w.account.address, fundAmountAtomic],
        });
        const hash = await fundingClient.sendTransaction({ to: USDG, data });
        console.log(`  funding tx for ${w.account.address}: ${hash} (waiting...)`);
        await fundingClient.waitForTransactionReceipt({ hash });
        console.log(`  confirmed.`);
    }

    console.log('\nstarting drip: one wallet at a time, a payment every 5-15s, until each wallet runs dry.\n');

    const totals = [];
    for (let i = 0; i < wallets.length; i += 1) {
        const count = await driveWallet(i, wallets.length, wallets[i]);
        totals.push(count);
    }

    console.log('\nall wallets drained. summary:');
    totals.forEach((count, i) => console.log(`  wallet ${i + 1} (${wallets[i].account.address}): ${count} txns`));
    console.log(`total: ${totals.reduce((a, b) => a + b, 0)} txns`);
}

main().catch((err) => {
    console.error('wallet drip failed:', err);
    process.exit(1);
});
