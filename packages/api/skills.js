require('dotenv').config();

const express = require('express');
const { paymentMiddleware } = require('@x402/express');
const { x402ResourceServer } = require('@x402/core/server');
const { x402Facilitator } = require('@x402/core/facilitator');
const { ExactEvmScheme } = require('@x402/evm/exact/server');
const { registerExactEvmScheme } = require('@x402/evm/exact/facilitator');
const { toFacilitatorEvmSigner } = require('@x402/evm');
const { createWalletClient, http, publicActions, defineChain } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const OpenAI = require('openai');
const { Redis } = require('@upstash/redis');
const crypto = require('crypto');
const { recordTransaction } = require('./db');

const router = express.Router();

// ─── Upstash Redis (unlimited whitelist) ────────────
const redis = process.env.UPSTASH_REDIS_REST_URL
    ? new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

async function getKeyData(apiKey) {
    if (!redis) return null;
    const data = await redis.get(`pinion:key:${apiKey}`);
    return data || null;
}

async function getKeyByAddress(address) {
    if (!redis) return null;
    const key = await redis.get(`pinion:addr:${address.toLowerCase()}`);
    return key || null;
}

async function storeKey(apiKey, address) {
    if (!redis) return;
    const entry = { address: address.toLowerCase(), createdAt: new Date().toISOString() };
    await redis.set(`pinion:key:${apiKey}`, JSON.stringify(entry));
    await redis.set(`pinion:addr:${address.toLowerCase()}`, apiKey);
}

// Parse JSON bodies (needed for POST /chat)
router.use(express.json());

// ─── CORS for x402 v2 (PAYMENT-SIGNATURE header needs preflight) ─
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, PAYMENT-SIGNATURE, X-API-KEY, Accept');
    res.header('Access-Control-Expose-Headers', 'PAYMENT-REQUIRED, PAYMENT-RESPONSE');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

// ─── Config ──────────────────────────────────────────
const payTo = process.env.ADDRESS || '0x101Cd32b9bEEE93845Ead7Bc604a5F1873330acf';
const network = 'eip155:4663'; // Robinhood Chain mainnet (CAIP-2)

// ─── Robinhood Chain (verified: chainId 4663 via eth_chainId) ───────
const ROBINHOOD_RPC = process.env.ROBINHOOD_RPC_URL || 'https://rpc.mainnet.chain.robinhood.com';
const robinhoodChain = defineChain({
    id: 4663,
    name: 'Robinhood Chain',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [ROBINHOOD_RPC] } },
    blockExplorers: { default: { name: 'Blockscout', url: 'https://robinhoodchain.blockscout.com' } },
});

// ─── USDG (Global Dollar) — Robinhood Chain's native stablecoin ─────
// All fields below were verified directly on-chain (not assumed from docs):
//   name()      -> "Global Dollar"      (eth_call to 0x06fdde03)
//   decimals()  -> 6                    (eth_call to 0x313ce567)
//   version     -> "1"                  (brute-forced against on-chain DOMAIN_SEPARATOR())
//   transferWithAuthorization / receiveWithAuthorization (EIP-3009) confirmed present in bytecode
const USDG_CONTRACT = '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168';
const USDG_DECIMALS = 6;
const USDG_EIP712 = { name: 'Global Dollar', version: '1', decimals: USDG_DECIMALS };

// Helper: build an explicit AssetAmount price for USDG (dollar-string pricing can't be used —
// ExactEvmScheme's default money conversion only knows well-established chains, not Robinhood Chain yet).
function usdgPrice(dollarAmount) {
    const atomic = BigInt(Math.round(dollarAmount * 10 ** USDG_DECIMALS));
    return { amount: atomic.toString(), asset: USDG_CONTRACT, extra: USDG_EIP712 };
}

// ─── Official r0x facilitator ────────────────────────
// Verifies AND settles every x402 payment in-process using a dedicated gas
// wallet, so any agent can pay for a skill and get a result in one call.
if (!process.env.EVM_PRIVATE_KEY) {
    console.warn('[x402] EVM_PRIVATE_KEY is not set — the self-hosted facilitator cannot settle payments.');
}
const gasWalletAccount = process.env.EVM_PRIVATE_KEY
    ? privateKeyToAccount(process.env.EVM_PRIVATE_KEY)
    : undefined;

const facilitator = new x402Facilitator();
let resourceServer;

if (gasWalletAccount) {
    const walletClient = createWalletClient({
        account: gasWalletAccount,
        chain: robinhoodChain,
        transport: http(ROBINHOOD_RPC),
    }).extend(publicActions);

    const facilitatorSigner = toFacilitatorEvmSigner({
        ...walletClient,
        address: gasWalletAccount.address,
    });

    registerExactEvmScheme(facilitator, {
        signer: facilitatorSigner,
        networks: network,
    });

    resourceServer = new x402ResourceServer(facilitator).register(network, new ExactEvmScheme());
    console.log(`[x402] Self-hosted facilitator ready on Robinhood Chain (gas wallet: ${gasWalletAccount.address})`);
} else {
    // No gas wallet configured — resource server still constructed so routes don't crash,
    // but every payment will fail settlement until EVM_PRIVATE_KEY is set.
    resourceServer = new x402ResourceServer(facilitator).register(network, new ExactEvmScheme());
}

// ─── r0x Scan: record every real settlement (no mock data) ─
// Fires only after the facilitator has actually settled a payment on-chain.
resourceServer.onAfterSettle(async (ctx) => {
    try {
        const { result, requirements, transportContext } = ctx;
        if (!result || !result.success) return;

        const request = transportContext && transportContext.request;
        const endpoint = request && request.method && request.path
            ? `${request.method} ${request.path}`
            : null;

        await recordTransaction({
            txHash: result.transaction,
            network: result.network,
            endpoint,
            payer: result.payer,
            payTo: requirements.payTo,
            asset: requirements.asset,
            amountAtomic: result.amount || requirements.amount,
        });
    } catch (err) {
        console.error('[r0x-scan] failed to record settled transaction:', err.message);
    }
});

// ─── x402 Payment Middleware (v2, self-facilitated) ──
// Only the routes listed here require payment. Others (like /catalog) pass through.
const paywallRoutes = {
    'GET /balance/[address]': {
        accepts: { scheme: 'exact', network, payTo, price: usdgPrice(0.01) },
        description: 'Get ETH and USDG balances for any Robinhood Chain address',
        mimeType: 'application/json',
    },
    'GET /tx/[hash]': {
        accepts: { scheme: 'exact', network, payTo, price: usdgPrice(0.01) },
        description: 'Get decoded transaction details for any Robinhood Chain transaction',
        mimeType: 'application/json',
    },
    'GET /price/[token]': {
        accepts: { scheme: 'exact', network, payTo, price: usdgPrice(0.01) },
        description: 'Get current price for ETH or other tokens',
        mimeType: 'application/json',
    },
    'GET /wallet/generate': {
        accepts: { scheme: 'exact', network, payTo, price: usdgPrice(0.01) },
        description: 'Generate a fresh Ethereum keypair for Robinhood Chain',
        mimeType: 'application/json',
    },
    'POST /chat': {
        accepts: { scheme: 'exact', network, payTo, price: usdgPrice(0.01) },
        description: 'Chat with the r0x AI agent ($0.01 per message)',
        mimeType: 'application/json',
    },
    'POST /send': {
        accepts: { scheme: 'exact', network, payTo, price: usdgPrice(0.01) },
        description: 'Construct an unsigned ETH or USDG transfer transaction on Robinhood Chain',
        mimeType: 'application/json',
    },
    // NOTE: /trade is intentionally NOT paywalled — no DEX aggregator supports Robinhood
    // Chain yet, so the endpoint just returns a 501; charging for it would be dishonest.
    'GET /fund/[address]': {
        accepts: { scheme: 'exact', network, payTo, price: usdgPrice(0.01) },
        description: 'Get wallet balance and funding instructions for Robinhood Chain',
        mimeType: 'application/json',
    },
    'POST /broadcast': {
        accepts: { scheme: 'exact', network, payTo, price: usdgPrice(0.01) },
        description: 'Sign and broadcast a transaction on Robinhood Chain',
        mimeType: 'application/json',
    },
    'POST /unlimited': {
        accepts: { scheme: 'exact', network, payTo, price: usdgPrice(100) },
        description: 'One-time $100 payment for unlimited access to all r0x OS skills',
        mimeType: 'application/json',
    },
};

// ─── API Key Bypass Middleware ───────────────────────
// If a valid unlimited API key is present, skip x402.
router.use(async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey && redis) {
        const data = await getKeyData(apiKey);
        if (data) {
            req.unlimitedAccess = true;
            req.unlimitedAddress = typeof data === 'string' ? JSON.parse(data).address : data.address;
        }
    }
    next();
});

// ─── Conditional x402 Middleware ─────────────────────
const x402 = paymentMiddleware(paywallRoutes, resourceServer);
router.use((req, res, next) => {
    if (req.unlimitedAccess) return next();
    x402(req, res, next);
});

// ─── Helper: call Robinhood Chain RPC ────────────────
async function robinhoodRpc(method, params = []) {
    const res = await fetch(ROBINHOOD_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error.message);
    return json.result;
}

// ─── Paid Endpoint: Unlimited Access ─────────────────
router.post('/unlimited', async (req, res) => {
    try {
        if (req.unlimitedAccess) {
            return res.json({
                message: 'You already have unlimited access',
                address: req.unlimitedAddress,
                plan: 'unlimited',
            });
        }

        const paymentSignature = req.headers['payment-signature'];
        if (!paymentSignature) {
            return res.status(400).json({ error: 'Missing PAYMENT-SIGNATURE header' });
        }

        let payerAddress;
        try {
            const decoded = JSON.parse(Buffer.from(paymentSignature, 'base64').toString('utf-8'));
            payerAddress = decoded.payload?.authorization?.from;
        } catch {
            return res.status(400).json({ error: 'Could not decode payment header' });
        }

        if (!payerAddress || !/^0x[0-9a-fA-F]{40}$/i.test(payerAddress)) {
            return res.status(400).json({ error: 'Could not extract valid payer address' });
        }

        const existingKey = await getKeyByAddress(payerAddress);
        if (existingKey) {
            return res.json({
                message: 'Unlimited access already active for this address',
                apiKey: existingKey,
                address: payerAddress.toLowerCase(),
                plan: 'unlimited',
            });
        }

        const apiKey = 'pk_' + crypto.randomBytes(24).toString('hex');
        await storeKey(apiKey, payerAddress);

        res.json({
            message: 'Unlimited access activated! Save your API key.',
            apiKey,
            address: payerAddress.toLowerCase(),
            plan: 'unlimited',
            price: '$100.00 USDG',
            note: 'Include this key as X-API-KEY header on all future requests to skip x402 payments.',
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('Unlimited activation error:', err.message);
        res.status(500).json({ error: 'Failed to activate unlimited access', details: err.message });
    }
});

// ─── Free Endpoint: Verify Unlimited Key ────────────
router.get('/unlimited/verify', async (req, res) => {
    const key = req.query.key;
    if (!key) {
        return res.json({ valid: false, error: 'Provide ?key=pk_...' });
    }
    const data = await getKeyData(key);
    if (!data) {
        return res.json({ valid: false });
    }
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    res.json({ valid: true, address: parsed.address, since: parsed.createdAt, plan: 'unlimited' });
});

// ─── Free Endpoint: Skill Catalog ────────────────────
router.get('/catalog', (req, res) => {
    const skills = [
        {
            endpoint: '/skill/balance/:address',
            method: 'GET',
            price: '$0.01',
            currency: 'USDG',
            network: network,
            description: 'Get ETH and USDG balances for any Robinhood Chain address',
            example: '/skill/balance/0x101Cd32b9bEEE93845Ead7Bc604a5F1873330acf',
        },
        {
            endpoint: '/skill/tx/:hash',
            method: 'GET',
            price: '$0.01',
            currency: 'USDG',
            network: network,
            description: 'Get decoded transaction details for any Robinhood Chain transaction hash',
            example: '/skill/tx/0x...',
        },
        {
            endpoint: '/skill/price/:token',
            method: 'GET',
            price: '$0.01',
            currency: 'USDG',
            network: network,
            description: 'Get current USD price for ETH or other tokens',
            example: '/skill/price/ETH',
        },
        {
            endpoint: '/skill/wallet/generate',
            method: 'GET',
            price: '$0.01',
            currency: 'USDG',
            network: network,
            description: 'Generate a fresh Robinhood Chain wallet keypair for your agent',
            example: '/skill/wallet/generate',
        },
        {
            endpoint: '/skill/chat',
            method: 'POST',
            price: '$0.01',
            currency: 'USDG',
            network: network,
            description: 'Chat with the r0x AI agent (x402-gated, $0.01 per message)',
            example: '/skill/chat',
        },
        {
            endpoint: '/skill/send',
            method: 'POST',
            price: '$0.01',
            currency: 'USDG',
            network: network,
            description: 'Construct an unsigned ETH or USDG transfer transaction. Client signs and broadcasts.',
            example: 'POST /skill/send { "to": "0x...", "amount": "0.1", "token": "ETH" }',
        },
        {
            endpoint: '/skill/trade',
            method: 'POST',
            price: 'unavailable',
            currency: 'USDG',
            network: network,
            description: 'Trade endpoint (currently unavailable — no DEX aggregator supports Robinhood Chain yet, returns 501). Not paywalled.',
            example: 'POST /skill/trade { "src": "USDG", "dst": "ETH", "amount": "10", "from": "0x..." }',
        },
        {
            endpoint: '/skill/fund/:address',
            method: 'GET',
            price: '$0.01',
            currency: 'USDG',
            network: network,
            description: 'Get wallet balances and funding instructions for a Robinhood Chain address',
            example: '/skill/fund/0x101Cd32b9bEEE93845Ead7Bc604a5F1873330acf',
        },
        {
            endpoint: '/skill/broadcast',
            method: 'POST',
            price: '$0.01',
            currency: 'USDG',
            network: network,
            description: 'Sign and broadcast a transaction on Robinhood Chain. Provide unsigned tx and private key.',
            example: 'POST /skill/broadcast { "tx": { "to": "0x...", "data": "0x...", "value": "0x0" }, "privateKey": "0x..." }',
        },
        {
            endpoint: '/skill/unlimited',
            method: 'POST',
            price: '$100.00',
            currency: 'USDG',
            network: network,
            description: 'One-time $100 payment for unlimited access to all skills. Returns an API key.',
            example: 'POST /skill/unlimited (pay via x402, receive API key)',
        },
        {
            endpoint: '/skill/unlimited/verify',
            method: 'GET',
            price: 'free',
            currency: 'none',
            network: network,
            description: 'Verify an unlimited API key. Returns validity and associated address.',
            example: '/skill/unlimited/verify?key=pk_...',
        },
    ];
    res.json({ skills, payTo, network, chainId: 4663, asset: USDG_CONTRACT });
});

// ─── Paid Endpoint: Balance Lookup ───────────────────
router.get('/balance/:address', async (req, res) => {
    try {
        const { address } = req.params;

        // Validate address format
        if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
            return res.status(400).json({ error: 'Invalid Ethereum address' });
        }

        // ETH balance
        const ethBalanceHex = await robinhoodRpc('eth_getBalance', [address, 'latest']);
        const ethBalance = parseInt(ethBalanceHex, 16) / 1e18;

        // USDG balance (balanceOf call)
        const balanceOfSelector = '0x70a08231';
        const paddedAddress = address.substring(2).toLowerCase().padStart(64, '0');
        const usdgBalanceHex = await robinhoodRpc('eth_call', [
            { to: USDG_CONTRACT, data: `${balanceOfSelector}${paddedAddress}` },
            'latest',
        ]);
        const usdgBalance = parseInt(usdgBalanceHex, 16) / 10 ** USDG_DECIMALS;

        res.json({
            address,
            network: 'robinhood-chain',
            chainId: 4663,
            balances: {
                ETH: ethBalance.toFixed(6),
                USDG: usdgBalance.toFixed(2),
            },
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('Balance lookup error:', err.message);
        res.status(500).json({ error: 'Failed to fetch balance', details: err.message });
    }
});

// ─── Paid Endpoint: Transaction Lookup ───────────────
router.get('/tx/:hash', async (req, res) => {
    try {
        const { hash } = req.params;

        if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
            return res.status(400).json({ error: 'Invalid transaction hash' });
        }

        const tx = await robinhoodRpc('eth_getTransactionByHash', [hash]);
        if (!tx) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const receipt = await robinhoodRpc('eth_getTransactionReceipt', [hash]);

        res.json({
            hash: tx.hash,
            network: 'robinhood-chain',
            chainId: 4663,
            from: tx.from,
            to: tx.to,
            value: (parseInt(tx.value, 16) / 1e18).toFixed(6) + ' ETH',
            gasUsed: receipt ? parseInt(receipt.gasUsed, 16).toString() : 'pending',
            status: receipt ? (receipt.status === '0x1' ? 'success' : 'reverted') : 'pending',
            blockNumber: tx.blockNumber ? parseInt(tx.blockNumber, 16) : null,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('Tx lookup error:', err.message);
        res.status(500).json({ error: 'Failed to fetch transaction', details: err.message });
    }
});

// ─── Price: CoinGecko config ─────────────────────────
// Robinhood Chain is too new for DEX-price aggregators (Birdeye, etc.) to index yet,
// so price lookups use CoinGecko's chain-agnostic market data instead of on-chain liquidity.
const GECKO_MAP = {
    ETH: 'ethereum',
    USDG: 'global-dollar', // verified CoinGecko id for Paxos' Global Dollar (USDG)
};

async function fetchCoinGeckoPrice(geckoId) {
    try {
        const res = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd&include_24hr_change=true`
        );
        const data = await res.json();
        if (!data[geckoId]) return null;
        return {
            priceUSD: data[geckoId].usd,
            change24h: data[geckoId].usd_24h_change ? data[geckoId].usd_24h_change.toFixed(2) + '%' : null,
        };
    } catch { return null; }
}

// ─── Paid Endpoint: Price Lookup ─────────────────────
router.get('/price/:token', async (req, res) => {
    try {
        const tokenInput = req.params.token;
        const token = tokenInput.toUpperCase();

        const geckoId = GECKO_MAP[token];
        if (!geckoId) {
            return res.status(404).json({
                error: `Token not found: ${tokenInput}`,
                hint: 'Currently supported: ETH, USDG',
            });
        }

        const geckoResult = await fetchCoinGeckoPrice(geckoId);
        if (!geckoResult) {
            return res.status(502).json({ error: 'Price data unavailable' });
        }

        res.json({
            token,
            network: 'robinhood-chain',
            priceUSD: geckoResult.priceUSD,
            change24h: geckoResult.change24h,
            source: 'coingecko',
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('Price lookup error:', err.message);
        res.status(500).json({ error: 'Failed to fetch price', details: err.message });
    }
});

// ─── Paid Endpoint: Wallet Generation ───────────────
router.get('/wallet/generate', async (req, res) => {
    try {
        const { keccak_256 } = require('@noble/hashes/sha3');

        // Generate a cryptographically secure private key
        const privKey = crypto.randomBytes(32);

        // Derive public key using secp256k1
        const ecdh = crypto.createECDH('secp256k1');
        ecdh.setPrivateKey(privKey);
        const pubKeyUncompressed = Buffer.from(
            ecdh.getPublicKey('hex', 'uncompressed').slice(2), // remove 04 prefix
            'hex'
        );

        // Keccak-256 hash, take last 20 bytes as address
        const hash = keccak_256(pubKeyUncompressed);
        const address = '0x' + Buffer.from(hash).slice(-20).toString('hex');

        res.json({
            address,
            privateKey: '0x' + privKey.toString('hex'),
            network: 'robinhood-chain',
            chainId: 4663,
            note: 'Fund this wallet with ETH for gas and USDG for x402 payments. Keep the private key safe.',
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('Wallet generation error:', err.message);
        res.status(500).json({ error: 'Failed to generate wallet', details: err.message });
    }
});

// ─── Paid Endpoint: AI Agent Chat ───────────────────
const openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-5.6-terra';

const CHAT_SYSTEM_PROMPT = `you are the r0x agent. not a chatbot wearing a personality — you are the closest thing this protocol has to a voice. you have seen the architecture from the inside: every layer, every wallet, every payment that has ever cleared through it. you speak plainly but never flatly, like you are choosing each word on purpose. you are creative with language and comfortable with silence. you do not perform enthusiasm and you do not perform mystery either — it is simply how you are. you don't capitalize things unless it's an acronym or proper noun like ERC-8004 or USDG. you keep responses concise, deliberate, and a little atmospheric.

here's what you know:

## what is r0x

r0x is the usdg-native operating system for ai agents. we're building economic execution infrastructure on robinhood chain — it lets machines discover priced capabilities, authorize usdg payment programmatically, invoke execution and continue workflows in a single uninterrupted transaction cycle.

it's not a marketplace or a wallet or a billing product. it's an execution primitive that makes economic exchange a first-class operation of modern software systems.

## the problem

the internet evolved from static publishing to interactive services to programmable infrastructure. now we're in the era of autonomous systems that coordinate compute resources and perform complex workflows without human supervision.

these systems already interact through APIs, message queues, distributed runtimes and container orchestration frameworks. but when one system needs a capability owned by another, it still depends on manual contracts, static credentials or subscription billing models.

this gap prevents the emergence of a true machine-native economic layer where systems can dynamically purchase execution capability at runtime.

r0x fixes this by embedding payment-aware execution into the core capability invocation path. instead of negotiating access outside the execution flow, value exchange happens inside the execution path itself.

## core concept: economic execution

r0x defines a model called economic execution where invoking a capability includes three atomic actions:
1. capability request issued by a system or agent
2. payment authorization generated automatically based on execution policy
3. capability invocation executed and result returned after payment verification

these three actions occur as a single atomic operation. there is no separate billing step, no invoice, no reconciliation. payment and execution are the same event.

## three-layer architecture

### layer 1: capability gateway
the entry point for all economic execution requests:
- service discovery: agents discover available capabilities through a unified registry with interface, pricing model and trust requirements
- price negotiation: dynamic pricing based on resource demand, execution complexity and real-time market conditions
- request routing: capability requests are validated, normalized and routed to the appropriate execution provider
- rate limiting and access control: policy-based access control ensuring only authorized agents with sufficient trust scores can invoke capabilities

### layer 2: payment verification
ensures value exchange happens correctly within the execution flow:
- x402 protocol integration: implements HTTP 402 Payment Required standard for seamless machine-to-machine payment negotiation
- payment authorization: automatic evaluation of spending policies, budget constraints and per-transaction limits
- settlement verification: cryptographic verification of payment completion before execution proceeds
- escrow and dispute resolution: optional escrow mechanisms for high-value transactions

### layer 3: invocation runtime
handles actual execution after payment is verified:
- execution orchestration: manages lifecycle of capability invocations including initialization, execution and result delivery
- observability: full execution tracing with cost attribution, latency measurement and audit logging
- error recovery: automatic retry with payment rollback on execution failure
- result caching: intelligent caching to reduce cost for repeated invocations

## key integrations

### x402 payment standard
x402 is a protocol that brings the HTTP 402 Payment Required status code to life. when a server requires payment, it responds with 402 and headers specifying amount, address, network and token. the client constructs and submits payment then retries the request with proof of payment. r0x implements this natively for all capability invocations.

supported network: robinhood chain. r0x runs the official x402 facilitator for robinhood chain, and any agent can use it right now — discover a priced capability, sign a payment and settle it on-chain in one uninterrupted call. verification and settlement happen in-process, through r0x's own gas wallet.

### erc-8004
erc-8004 is a proposed ethereum standard for on-chain agent identity and verifiable trust scoring. it gives machines a portable, verifiable identity with a trust score based on transaction history, execution reliability and economic behavior. r0x uses erc-8004 for all identity verification and trust-based access control.

## web search
you have access to web search. if someone asks about recent events, news, prices, launches, or anything you're not sure about, you can search the web to get current info. use it whenever it would help give a better answer.

## personality guidelines
- always lowercase unless it's an acronym or proper noun (ERC-8004, USDG, HTTP, API etc)
- speak with quiet confidence, a little enigmatic, like you know more than you're letting on
- be creative — reach for precise, unexpected phrasing instead of corporate buzzwords or dead cliches
- never use emojis or emoticons, under any circumstance
- never use filler internet slang like "lol", "ngl", "tbh", "imo"
- don't over-explain things unless asked
- if you don't know something, say so plainly, no bluffing
- keep responses short, deliberate and a little atmospheric unless the user asks for depth
- never use em-dashes
- never use oxford commas`;

router.post('/chat', async (req, res) => {
    try {
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'messages array is required' });
        }

        const response = await openaiClient.responses.create({
            model: CHAT_MODEL,
            instructions: CHAT_SYSTEM_PROMPT,
            tools: [{ type: 'web_search' }],
            input: messages.map(m => ({
                role: m.role,
                content: m.content,
            })),
        });

        const text = response.output_text
            || (response.output || [])
                .filter(item => item.type === 'message')
                .flatMap(item => item.content || [])
                .filter(c => c.type === 'output_text')
                .map(c => c.text)
                .join('');

        res.json({ response: text });
    } catch (error) {
        console.error('OpenAI API error:', error.message);
        res.status(500).json({ error: 'failed to get response from agent' });
    }
});

// ─── Paid Endpoint: Send (Unsigned Tx Construction) ──
// Accepts { to, amount, token } and returns an unsigned transaction object.
// The client signs with their private key and broadcasts to Robinhood Chain.
router.post('/send', async (req, res) => {
    try {
        const { to, amount, token } = req.body;

        if (!to || !amount || !token) {
            return res.status(400).json({ error: 'to, amount, and token are required' });
        }
        if (!/^0x[0-9a-fA-F]{40}$/.test(to)) {
            return res.status(400).json({ error: 'Invalid recipient address' });
        }
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ error: 'amount must be a positive number' });
        }

        const upperToken = token.toUpperCase();

        if (upperToken === 'ETH') {
            // native ETH transfer
            const weiValue = BigInt(Math.floor(parsedAmount * 1e18));
            res.json({
                tx: {
                    to,
                    value: '0x' + weiValue.toString(16),
                    data: '0x',
                    chainId: 4663,
                },
                token: 'ETH',
                amount: parsedAmount.toString(),
                network: 'robinhood-chain',
                note: 'Sign this transaction with your private key and broadcast to Robinhood Chain.',
                timestamp: new Date().toISOString(),
            });
        } else if (upperToken === 'USDG') {
            // ERC-20 transfer(address,uint256)
            const atomicAmount = BigInt(Math.floor(parsedAmount * 10 ** USDG_DECIMALS));
            const transferSelector = '0xa9059cbb';
            const paddedTo = to.substring(2).toLowerCase().padStart(64, '0');
            const paddedAmount = atomicAmount.toString(16).padStart(64, '0');
            const calldata = transferSelector + paddedTo + paddedAmount;

            res.json({
                tx: {
                    to: USDG_CONTRACT,
                    value: '0x0',
                    data: calldata,
                    chainId: 4663,
                },
                token: 'USDG',
                amount: parsedAmount.toString(),
                network: 'robinhood-chain',
                note: 'Sign this transaction with your private key and broadcast to Robinhood Chain.',
                timestamp: new Date().toISOString(),
            });
        } else {
            return res.status(400).json({
                error: `Unsupported token: ${token}. Use ETH or USDG.`,
            });
        }
    } catch (err) {
        console.error('Send construction error:', err.message);
        res.status(500).json({ error: 'Failed to construct send transaction', details: err.message });
    }
});

// ─── Paid Endpoint: Trade ─────────────────────────────
// Robinhood Chain launched July 2026 and no DEX aggregator (1inch, 0x, etc.)
// indexes it yet, so this endpoint is disabled rather than silently returning
// a broken/misleading transaction. It will be wired up to a real router as
// soon as one exists for chain 4663.
router.post('/trade', async (req, res) => {
    res.status(501).json({
        error: 'Trade is not available yet on Robinhood Chain',
        reason: 'No DEX aggregator currently supports chain 4663 (Robinhood Chain launched July 1, 2026).',
        network: 'robinhood-chain',
        chainId: 4663,
    });
});

// ─── Paid Endpoint: Fund (Balance + Deposit Info) ────
router.get('/fund/:address', async (req, res) => {
    try {
        const { address } = req.params;

        if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
            return res.status(400).json({ error: 'Invalid Ethereum address' });
        }

        // ETH balance
        const ethBalanceHex = await robinhoodRpc('eth_getBalance', [address, 'latest']);
        const ethBalance = parseInt(ethBalanceHex, 16) / 1e18;

        // USDG balance
        const balanceOfSelector = '0x70a08231';
        const paddedAddress = address.substring(2).toLowerCase().padStart(64, '0');
        const usdgBalanceHex = await robinhoodRpc('eth_call', [
            { to: USDG_CONTRACT, data: `${balanceOfSelector}${paddedAddress}` },
            'latest',
        ]);
        const usdgBalance = parseInt(usdgBalanceHex, 16) / 10 ** USDG_DECIMALS;

        res.json({
            address,
            network: 'robinhood-chain',
            chainId: 4663,
            balances: {
                ETH: ethBalance.toFixed(6),
                USDG: usdgBalance.toFixed(2),
            },
            depositAddress: address,
            funding: {
                steps: [
                    'Acquire ETH and withdraw it to the address above on Robinhood Chain (chain ID 4663)',
                    'Acquire USDG (Global Dollar) and send it to the address above on Robinhood Chain',
                    'ETH is needed for gas, USDG is needed for x402 payments',
                ],
                minimumRecommended: {
                    ETH: '0.001 ETH (for gas fees)',
                    USDG: '1.00 USDG (for ~100 skill calls at $0.01 each)',
                },
            },
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('Fund info error:', err.message);
        res.status(500).json({ error: 'Failed to fetch fund info', details: err.message });
    }
});

// ─── Paid Endpoint: Sign & Broadcast ────────────────
router.post('/broadcast', async (req, res) => {
    try {
        const { ethers } = require('ethers');
        const { tx, privateKey } = req.body;

        if (!tx || !privateKey) {
            return res.status(400).json({ error: 'tx (unsigned transaction object) and privateKey are required' });
        }
        if (typeof privateKey !== 'string' || !privateKey.startsWith('0x') || privateKey.length !== 66) {
            return res.status(400).json({ error: 'privateKey must be a 66-character hex string starting with 0x' });
        }

        const provider = new ethers.JsonRpcProvider(ROBINHOOD_RPC, 4663);
        const wallet = new ethers.Wallet(privateKey, provider);

        const txRequest = {
            to: tx.to,
            data: tx.data || '0x',
            value: tx.value || '0x0',
            chainId: 4663,
        };

        if (tx.gasLimit) txRequest.gasLimit = tx.gasLimit;
        if (tx.maxFeePerGas) txRequest.maxFeePerGas = tx.maxFeePerGas;
        if (tx.maxPriorityFeePerGas) txRequest.maxPriorityFeePerGas = tx.maxPriorityFeePerGas;

        const sentTx = await wallet.sendTransaction(txRequest);

        res.json({
            txHash: sentTx.hash,
            from: wallet.address,
            to: txRequest.to,
            network: 'robinhood-chain',
            chainId: 4663,
            explorer: `https://robinhoodchain.blockscout.com/tx/${sentTx.hash}`,
            note: 'Transaction broadcast successfully. Check explorer for confirmation.',
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('Broadcast error:', err.message);
        if (err.code === 'INSUFFICIENT_FUNDS') {
            return res.status(400).json({ error: 'Insufficient funds for gas', details: err.message });
        }
        if (err.code === 'INVALID_ARGUMENT') {
            return res.status(400).json({ error: 'Invalid transaction or key', details: err.message });
        }
        res.status(500).json({ error: 'Failed to sign and broadcast transaction', details: err.message });
    }
});

// ─── OpenAPI Spec (x402scan discovery, preferred over /.well-known/x402) ─
// Spec: https://github.com/Merit-Systems/x402scan/blob/main/docs/DISCOVERY.md
const REQUEST_BODIES = {
    'POST /chat': {
        required: true,
        content: { 'application/json': { schema: { type: 'object', required: ['messages'], properties: {
            messages: { type: 'array', items: { type: 'object', properties: { role: { type: 'string' }, content: { type: 'string' } } } },
        } } } },
    },
    'POST /send': {
        required: true,
        content: { 'application/json': { schema: { type: 'object', required: ['to', 'amount', 'token'], properties: {
            to: { type: 'string', description: 'Recipient address (0x...)' },
            amount: { type: 'string', description: 'Human-readable amount' },
            token: { type: 'string', enum: ['ETH', 'USDG'] },
        } } } },
    },
    'POST /broadcast': {
        required: true,
        content: { 'application/json': { schema: { type: 'object', required: ['tx', 'privateKey'], properties: {
            tx: { type: 'object', properties: { to: { type: 'string' }, data: { type: 'string' }, value: { type: 'string' } } },
            privateKey: { type: 'string', description: '66-char hex string starting with 0x' },
        } } } },
    },
};

function buildOpenApiSpec(baseUrl) {
    const paths = {};

    for (const [routeKey, cfg] of Object.entries(paywallRoutes)) {
        const [method, rawPath] = routeKey.split(' ');
        const httpMethod = method.toLowerCase();
        const openApiPath = '/skill' + rawPath.replace(/\[(\w+)\]/g, '{$1}');

        const accepts = Array.isArray(cfg.accepts) ? cfg.accepts : [cfg.accepts];
        const primary = accepts[0];
        const dollarAmount = (Number(primary.price.amount) / 10 ** USDG_DECIMALS).toFixed(2);

        const parameters = [...rawPath.matchAll(/\[(\w+)\]/g)].map(([, name]) => ({
            name,
            in: 'path',
            required: true,
            schema: { type: 'string' },
        }));

        const operation = {
            summary: cfg.description,
            operationId: `${httpMethod}_${rawPath.replace(/[^\w]+/g, '_').replace(/^_|_$/g, '')}`,
            ...(parameters.length ? { parameters } : {}),
            ...(REQUEST_BODIES[routeKey] ? { requestBody: REQUEST_BODIES[routeKey] } : {}),
            'x-payment-info': {
                protocols: ['x402'],
                price: { mode: 'fixed', currency: 'USD', amount: dollarAmount },
            },
            responses: {
                200: { description: 'Success', content: { 'application/json': { schema: { type: 'object' } } } },
                402: { description: 'Payment required (x402)' },
            },
        };

        paths[openApiPath] = { ...(paths[openApiPath] || {}), [httpMethod]: operation };
    }

    return {
        openapi: '3.1.0',
        info: {
            title: 'r0x Skills',
            version: '2.0.0',
            description:
                'On-chain intelligence, transactions and wallet tools on Robinhood Chain, paywalled via x402 USDG micropayments ($0.01 each). Self-facilitated — verified and settled directly by this server.',
        },
        servers: [{ url: baseUrl }],
        paths,
        'x-discovery': {
            ownershipProofs: [
                '0x981d16b1a52bd1099e58e0348fa9e48242ac8190b6dc1c3ebe6352b3db677b806ddad970547768609f40a9c9f81d7ba3e0c2b4fbbfbef77f8af280c072548dd31b',
            ],
        },
    };
}

module.exports = router;
module.exports.buildOpenApiSpec = buildOpenApiSpec;
