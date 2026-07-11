require('dotenv').config();

const express = require('express');
const { paymentMiddleware } = require('@x402/express');
const { x402ResourceServer } = require('@x402/core/server');
const { x402Facilitator } = require('@x402/core/facilitator');
const { ExactEvmScheme } = require('@x402/evm/exact/server');
const { registerExactEvmScheme } = require('@x402/evm/exact/facilitator');
const { toFacilitatorEvmSigner } = require('@x402/evm');
const { createWalletClient, http, publicActions, defineChain, encodeFunctionData, decodeFunctionResult, encodePacked } = require('viem');
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

// ─── WETH on Robinhood Chain — verified on-chain (eth_getCode + live
// Uniswap V3 pool liquidity), address matches Robinhood's official token
// contracts page and Uniswap's own launch announcement.
const WETH_CONTRACT = '0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73'; // Robinhood's non-standard WETH (verified name/symbol/decimals on-chain)
const SWAP_SLIPPAGE_BPS_DEFAULT = 100n; // 1%

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
    'POST /trade': {
        accepts: { scheme: 'exact', network, payTo, price: usdgPrice(0.01) },
        description: 'Construct a real Uniswap V3 swap transaction between any two tokens on Robinhood Chain',
        mimeType: 'application/json',
    },
    'GET /quote/[tokenIn]/[tokenOut]/[amountIn]': {
        accepts: { scheme: 'exact', network, payTo, price: usdgPrice(0.01) },
        description: 'Get a live Uniswap V3 swap price quote for any token pair without constructing a transaction',
        mimeType: 'application/json',
    },
    'GET /pool/[tokenA]/[tokenB]': {
        accepts: { scheme: 'exact', network, payTo, price: usdgPrice(0.01) },
        description: 'Get Uniswap V3 pool reserves and implied price for any token pair on Robinhood Chain',
        mimeType: 'application/json',
    },
    'POST /liquidity/add': {
        accepts: { scheme: 'exact', network, payTo, price: usdgPrice(0.01) },
        description: 'Mint a Uniswap V3 liquidity position for any token pair, with a custom price range',
        mimeType: 'application/json',
    },
    'POST /liquidity/remove': {
        accepts: { scheme: 'exact', network, payTo, price: usdgPrice(0.01) },
        description: 'Withdraw and collect a Uniswap V3 liquidity position by tokenId',
        mimeType: 'application/json',
    },
    'GET /liquidity/positions/[address]': {
        accepts: { scheme: 'exact', network, payTo, price: usdgPrice(0.01) },
        description: 'List every Uniswap V3 liquidity position NFT owned by an address',
        mimeType: 'application/json',
    },
    'GET /yield/usdg': {
        accepts: { scheme: 'exact', network, payTo, price: usdgPrice(0.01) },
        description: 'Get the live Morpho steakUSDG vault APY that powers Robinhood Earn',
        mimeType: 'application/json',
    },
    'GET /bridge/[originChain]/[token]/[amount]': {
        accepts: { scheme: 'exact', network, payTo, price: usdgPrice(0.01) },
        description: 'Get an Across Protocol bridge quote for moving USDC or WETH onto Robinhood Chain',
        mimeType: 'application/json',
    },
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
            price: '$0.01',
            currency: 'USDG',
            network: network,
            description: 'Construct a real Uniswap V3 swap transaction between any two tokens on Robinhood Chain (no allowlist — pass any ERC20 address). Client signs and broadcasts.',
            example: 'POST /skill/trade { "tokenIn": "ETH", "tokenOut": "USDG", "amountIn": "0.1", "from": "0x..." }',
        },
        {
            endpoint: '/skill/quote/:tokenIn/:tokenOut/:amountIn',
            method: 'GET',
            price: '$0.01',
            currency: 'USDG',
            network: network,
            description: 'Get a live Uniswap V3 swap price quote for any token pair, with no transaction constructed',
            example: '/skill/quote/ETH/USDG/0.1',
        },
        {
            endpoint: '/skill/pool/:tokenA/:tokenB',
            method: 'GET',
            price: '$0.01',
            currency: 'USDG',
            network: network,
            description: 'Get Uniswap V3 pool reserves and implied price for any token pair on Robinhood Chain',
            example: '/skill/pool/ETH/USDG',
        },
        {
            endpoint: '/skill/liquidity/add',
            method: 'POST',
            price: '$0.01',
            currency: 'USDG',
            network: network,
            description: 'Mint a Uniswap V3 liquidity position for any token pair, with a custom price range. Client signs and broadcasts.',
            example: 'POST /skill/liquidity/add { "tokenA": "ETH", "tokenB": "USDG", "amountA": "0.1", "amountB": "180", "from": "0x...", "rangePct": 10 }',
        },
        {
            endpoint: '/skill/liquidity/remove',
            method: 'POST',
            price: '$0.01',
            currency: 'USDG',
            network: network,
            description: 'Withdraw and collect a Uniswap V3 liquidity position by tokenId. Client signs and broadcasts.',
            example: 'POST /skill/liquidity/remove { "tokenId": "12345", "from": "0x..." }',
        },
        {
            endpoint: '/skill/liquidity/positions/:address',
            method: 'GET',
            price: '$0.01',
            currency: 'USDG',
            network: network,
            description: 'List every Uniswap V3 liquidity position NFT owned by an address',
            example: '/skill/liquidity/positions/0x101Cd32b9bEEE93845Ead7Bc604a5F1873330acf',
        },
        {
            endpoint: '/skill/yield/usdg',
            method: 'GET',
            price: '$0.01',
            currency: 'USDG',
            network: network,
            description: 'Get the live Morpho steakUSDG vault APY that powers Robinhood Earn',
            example: '/skill/yield/usdg',
        },
        {
            endpoint: '/skill/bridge/:originChain/:token/:amount',
            method: 'GET',
            price: '$0.01',
            currency: 'USDG',
            network: network,
            description: 'Get an Across Protocol bridge quote for moving USDC or WETH onto Robinhood Chain',
            example: '/skill/bridge/42161/USDC/100',
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

function applySlippage(amount, slippageBps) {
    return (amount * (10000n - slippageBps)) / 10000n;
}

// ─── Uniswap V3 (any-token trading + liquidity provision) ──────────────
// V3/V4 + UniswapX went live on Robinhood Chain at mainnet launch alongside
// V2. Addresses below were verified on-chain via eth_getCode (all deployed)
// and cross-checked against Robinhood's own contract-addresses page. Trading
// and LP moved fully onto V3 here since it holds deeper, fee-tiered liquidity
// than the V2 pair and is the only version that supports arbitrary tokens
// without a bespoke pair contract per pair.
const UNISWAP_V3_FACTORY = '0x1f7d7550B1b028f7571E69A784071F0205FD2EfA';
const UNISWAP_V3_SWAP_ROUTER02 = '0xCaf681a66D020601342297493863E78C959E5cb2';
const UNISWAP_V3_QUOTER_V2 = '0x33e885eD0Ec9bF04EcfB19341582aADCb4c8A9E7';
const UNISWAP_V3_POSITION_MANAGER = '0x73991a25C818Bf1f1128dEAaB1492D45638DE0D3';
const V3_FEE_TIERS = [100, 500, 3000, 10000];
// SwapRouter02's Payments sentinel: routing recipient=ADDRESS_THIS keeps the
// output (as WETH) inside the router so a following unwrapWETH9 call, bundled
// via multicall, can send real native ETH to the caller in the same tx.
const V3_ADDRESS_THIS = '0x0000000000000000000000000000000000000002';
const MIN_TICK = -887272;
const MAX_TICK = 887272;

const erc20Abi = [
    { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
    { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
    { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
    { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ type: 'address' }, { type: 'uint256' }], outputs: [{ type: 'bool' }] },
];
const v3FactoryAbi = [{ name: 'getPool', type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }, { type: 'address' }, { type: 'uint24' }], outputs: [{ type: 'address' }] }];
const v3PoolAbi = [
    { name: 'slot0', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint160' }, { type: 'int24' }, { type: 'uint16' }, { type: 'uint16' }, { type: 'uint16' }, { type: 'uint8' }, { type: 'bool' }] },
    { name: 'liquidity', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint128' }] },
    { name: 'tickSpacing', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'int24' }] },
    { name: 'token0', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
];
const v3QuoterAbi = [
    {
        name: 'quoteExactInputSingle', type: 'function', stateMutability: 'nonpayable',
        inputs: [{ name: 'params', type: 'tuple', components: [{ name: 'tokenIn', type: 'address' }, { name: 'tokenOut', type: 'address' }, { name: 'amountIn', type: 'uint256' }, { name: 'fee', type: 'uint24' }, { name: 'sqrtPriceLimitX96', type: 'uint160' }] }],
        outputs: [{ type: 'uint256' }, { type: 'uint160' }, { type: 'uint32' }, { type: 'uint256' }],
    },
    {
        name: 'quoteExactInput', type: 'function', stateMutability: 'nonpayable',
        inputs: [{ name: 'path', type: 'bytes' }, { name: 'amountIn', type: 'uint256' }],
        outputs: [{ type: 'uint256' }, { type: 'uint160[]' }, { type: 'uint32[]' }, { type: 'uint256' }],
    },
];
const v3RouterAbi = [
    {
        name: 'exactInputSingle', type: 'function', stateMutability: 'payable',
        inputs: [{ name: 'params', type: 'tuple', components: [{ name: 'tokenIn', type: 'address' }, { name: 'tokenOut', type: 'address' }, { name: 'fee', type: 'uint24' }, { name: 'recipient', type: 'address' }, { name: 'amountIn', type: 'uint256' }, { name: 'amountOutMinimum', type: 'uint256' }, { name: 'sqrtPriceLimitX96', type: 'uint160' }] }],
        outputs: [{ type: 'uint256' }],
    },
    {
        name: 'exactInput', type: 'function', stateMutability: 'payable',
        inputs: [{ name: 'params', type: 'tuple', components: [{ name: 'path', type: 'bytes' }, { name: 'recipient', type: 'address' }, { name: 'amountIn', type: 'uint256' }, { name: 'amountOutMinimum', type: 'uint256' }] }],
        outputs: [{ type: 'uint256' }],
    },
    { name: 'unwrapWETH9', type: 'function', stateMutability: 'payable', inputs: [{ name: 'amountMinimum', type: 'uint256' }, { name: 'recipient', type: 'address' }], outputs: [] },
    { name: 'multicall', type: 'function', stateMutability: 'payable', inputs: [{ name: 'data', type: 'bytes[]' }], outputs: [{ type: 'bytes[]' }] },
];
const v3PositionManagerAbi = [
    {
        name: 'mint', type: 'function', stateMutability: 'payable',
        inputs: [{ name: 'params', type: 'tuple', components: [{ name: 'token0', type: 'address' }, { name: 'token1', type: 'address' }, { name: 'fee', type: 'uint24' }, { name: 'tickLower', type: 'int24' }, { name: 'tickUpper', type: 'int24' }, { name: 'amount0Desired', type: 'uint256' }, { name: 'amount1Desired', type: 'uint256' }, { name: 'amount0Min', type: 'uint256' }, { name: 'amount1Min', type: 'uint256' }, { name: 'recipient', type: 'address' }, { name: 'deadline', type: 'uint256' }] }],
        outputs: [{ type: 'uint256' }, { type: 'uint128' }, { type: 'uint256' }, { type: 'uint256' }],
    },
    {
        name: 'decreaseLiquidity', type: 'function', stateMutability: 'payable',
        inputs: [{ name: 'params', type: 'tuple', components: [{ name: 'tokenId', type: 'uint256' }, { name: 'liquidity', type: 'uint128' }, { name: 'amount0Min', type: 'uint256' }, { name: 'amount1Min', type: 'uint256' }, { name: 'deadline', type: 'uint256' }] }],
        outputs: [{ type: 'uint256' }, { type: 'uint256' }],
    },
    {
        name: 'collect', type: 'function', stateMutability: 'payable',
        inputs: [{ name: 'params', type: 'tuple', components: [{ name: 'tokenId', type: 'uint256' }, { name: 'recipient', type: 'address' }, { name: 'amount0Max', type: 'uint128' }, { name: 'amount1Max', type: 'uint128' }] }],
        outputs: [{ type: 'uint256' }, { type: 'uint256' }],
    },
    { name: 'burn', type: 'function', stateMutability: 'payable', inputs: [{ type: 'uint256' }], outputs: [] },
    { name: 'refundETH', type: 'function', stateMutability: 'payable', inputs: [], outputs: [] },
    { name: 'unwrapWETH9', type: 'function', stateMutability: 'payable', inputs: [{ name: 'amountMinimum', type: 'uint256' }, { name: 'recipient', type: 'address' }], outputs: [] },
    { name: 'sweepToken', type: 'function', stateMutability: 'payable', inputs: [{ name: 'token', type: 'address' }, { name: 'amountMinimum', type: 'uint256' }, { name: 'recipient', type: 'address' }], outputs: [] },
    { name: 'multicall', type: 'function', stateMutability: 'payable', inputs: [{ name: 'data', type: 'bytes[]' }], outputs: [{ type: 'bytes[]' }] },
    {
        name: 'positions', type: 'function', stateMutability: 'view', inputs: [{ type: 'uint256' }],
        outputs: [{ type: 'uint96' }, { type: 'address' }, { name: 'token0', type: 'address' }, { name: 'token1', type: 'address' }, { name: 'fee', type: 'uint24' }, { name: 'tickLower', type: 'int24' }, { name: 'tickUpper', type: 'int24' }, { name: 'liquidity', type: 'uint128' }, { type: 'uint256' }, { type: 'uint256' }, { name: 'tokensOwed0', type: 'uint128' }, { name: 'tokensOwed1', type: 'uint128' }],
    },
    { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
    { name: 'tokenOfOwnerByIndex', type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }, { type: 'uint256' }], outputs: [{ type: 'uint256' }] },
    { name: 'ownerOf', type: 'function', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'address' }] },
];

async function readContract(address, abi, functionName, args = []) {
    const data = encodeFunctionData({ abi, functionName, args });
    const result = await robinhoodRpc('eth_call', [{ to: address, data }, 'latest']);
    return decodeFunctionResult({ abi, functionName, data: result });
}

const KNOWN_TOKENS = {
    ETH: { address: WETH_CONTRACT, decimals: 18, symbol: 'ETH', isNative: true },
    USDG: { address: USDG_CONTRACT, decimals: USDG_DECIMALS, symbol: 'USDG', isNative: false },
};

// Resolves 'ETH', 'USDG', or any raw ERC20 address into { address, decimals, symbol, isNative }.
// Arbitrary tokens are read live on-chain (decimals/symbol) — there is no allowlist, so a bad
// or non-ERC20 address surfaces as a clear error rather than a silent wrong result.
async function resolveToken(input) {
    const upper = String(input).toUpperCase();
    if (KNOWN_TOKENS[upper]) return KNOWN_TOKENS[upper];
    if (!/^0x[0-9a-fA-F]{40}$/.test(input)) {
        throw new Error(`"${input}" is not "ETH", "USDG", or a valid 0x token address`);
    }
    try {
        const [decimals, symbol] = await Promise.all([
            readContract(input, erc20Abi, 'decimals'),
            readContract(input, erc20Abi, 'symbol'),
        ]);
        return { address: input, decimals: Number(decimals), symbol, isNative: false };
    } catch (err) {
        throw new Error(`${input} does not look like an ERC20 token on Robinhood Chain (decimals()/symbol() call failed)`);
    }
}

// Best (highest-liquidity) direct V3 pool between two tokens, across all fee tiers. Null if none exist.
async function findBestPool(tokenA, tokenB) {
    const candidates = [];
    for (const fee of V3_FEE_TIERS) {
        const pool = await readContract(UNISWAP_V3_FACTORY, v3FactoryAbi, 'getPool', [tokenA, tokenB, fee]);
        if (pool === '0x0000000000000000000000000000000000000000') continue;
        const liquidity = await readContract(pool, v3PoolAbi, 'liquidity');
        if (liquidity > 0n) candidates.push({ fee, pool, liquidity });
    }
    if (candidates.length === 0) return null;
    return candidates.reduce((best, c) => (c.liquidity > best.liquidity ? c : best));
}

// Finds a route from tokenIn to tokenOut: a direct pool if one has liquidity, otherwise a
// two-hop route through WETH or USDG (whichever token isn't already an endpoint).
async function findRoute(tokenIn, tokenOut) {
    const direct = await findBestPool(tokenIn, tokenOut);
    if (direct) return { hops: [{ tokenIn, tokenOut, fee: direct.fee, pool: direct.pool }] };

    for (const hub of [WETH_CONTRACT, USDG_CONTRACT]) {
        if (hub.toLowerCase() === tokenIn.toLowerCase() || hub.toLowerCase() === tokenOut.toLowerCase()) continue;
        const [legA, legB] = await Promise.all([findBestPool(tokenIn, hub), findBestPool(hub, tokenOut)]);
        if (legA && legB) {
            return {
                hops: [
                    { tokenIn, tokenOut: hub, fee: legA.fee, pool: legA.pool },
                    { tokenIn: hub, tokenOut, fee: legB.fee, pool: legB.pool },
                ],
            };
        }
    }
    return null;
}

function encodeV3Path(hops) {
    let path = '0x';
    for (let i = 0; i < hops.length; i++) {
        path += hops[i].tokenIn.replace('0x', '').toLowerCase();
        path += hops[i].fee.toString(16).padStart(6, '0');
    }
    path += hops[hops.length - 1].tokenOut.replace('0x', '').toLowerCase();
    return path;
}

async function quoteRoute(route, amountIn) {
    if (route.hops.length === 1) {
        const { tokenIn, tokenOut, fee } = route.hops[0];
        const [amountOut] = await readContract(UNISWAP_V3_QUOTER_V2, v3QuoterAbi, 'quoteExactInputSingle', [
            { tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n },
        ]);
        return amountOut;
    }
    const path = encodeV3Path(route.hops);
    const [amountOut] = await readContract(UNISWAP_V3_QUOTER_V2, v3QuoterAbi, 'quoteExactInput', [path, amountIn]);
    return amountOut;
}

function buildSwapTx({ route, amountIn, amountOutMin, from, tokenOutIsNative }) {
    const recipient = tokenOutIsNative ? V3_ADDRESS_THIS : from;
    let swapCalldata;
    if (route.hops.length === 1) {
        const { tokenIn, tokenOut, fee } = route.hops[0];
        swapCalldata = encodeFunctionData({
            abi: v3RouterAbi, functionName: 'exactInputSingle',
            args: [{ tokenIn, tokenOut, fee, recipient, amountIn, amountOutMinimum: amountOutMin, sqrtPriceLimitX96: 0n }],
        });
    } else {
        const path = encodeV3Path(route.hops);
        swapCalldata = encodeFunctionData({
            abi: v3RouterAbi, functionName: 'exactInput',
            args: [{ path, recipient, amountIn, amountOutMinimum: amountOutMin }],
        });
    }
    if (!tokenOutIsNative) return swapCalldata;

    const unwrapCalldata = encodeFunctionData({ abi: v3RouterAbi, functionName: 'unwrapWETH9', args: [amountOutMin, from] });
    return encodeFunctionData({ abi: v3RouterAbi, functionName: 'multicall', args: [[swapCalldata, unwrapCalldata]] });
}

function routeFeesLabel(route) {
    return route.hops.map((h) => `${h.fee / 10000}%`).join(' -> ');
}

// ─── Paid Endpoint: Trade (real Uniswap V3 swap, any token) ────────────
// Fully open token input by design: pass 'ETH', 'USDG', or any ERC20 address.
// r0x doesn't maintain an allowlist here — resolveToken() and findRoute() are
// the only gates, so trading an illiquid or scam token is possible; it will
// just quote/execute at whatever real price that token's pool implies.
router.post('/trade', async (req, res) => {
    try {
        const { tokenIn, tokenOut, amountIn, from, slippageBps } = req.body;

        if (!tokenIn || !tokenOut || !amountIn || !from) {
            return res.status(400).json({ error: 'tokenIn, tokenOut, amountIn, and from (your wallet address) are required' });
        }
        if (!/^0x[0-9a-fA-F]{40}$/.test(from)) {
            return res.status(400).json({ error: 'Invalid from address' });
        }
        const parsedAmount = parseFloat(amountIn);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ error: 'amountIn must be a positive number' });
        }

        const [inToken, outToken] = await Promise.all([resolveToken(tokenIn), resolveToken(tokenOut)]);
        if (inToken.address.toLowerCase() === outToken.address.toLowerCase()) {
            return res.status(400).json({ error: 'tokenIn and tokenOut resolve to the same token' });
        }

        const route = await findRoute(inToken.address, outToken.address);
        if (!route) {
            return res.status(404).json({
                error: `No Uniswap V3 route found between ${inToken.symbol} and ${outToken.symbol}`,
                hint: 'No direct pool, and no route through WETH or USDG has liquidity either.',
            });
        }

        const slippage = slippageBps ? BigInt(Math.round(Number(slippageBps))) : SWAP_SLIPPAGE_BPS_DEFAULT;
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
        const amountInAtomic = BigInt(Math.round(parsedAmount * 10 ** inToken.decimals));
        const amountOut = await quoteRoute(route, amountInAtomic);
        const amountOutMin = applySlippage(amountOut, slippage);

        const quote = {
            tokenIn: inToken.symbol,
            tokenOut: outToken.symbol,
            amountIn: parsedAmount.toString(),
            estimatedAmountOut: (Number(amountOut) / 10 ** outToken.decimals).toFixed(6),
            minimumAmountOut: (Number(amountOutMin) / 10 ** outToken.decimals).toFixed(6),
            slippageBps: slippage.toString(),
            route: routeFeesLabel(route),
        };

        const swapCalldata = buildSwapTx({ route, amountIn: amountInAtomic, amountOutMin, from, tokenOutIsNative: outToken.isNative });

        if (inToken.isNative) {
            // Native ETH in: SwapRouter02 wraps msg.value into WETH itself, no separate approval needed.
            return res.json({
                tx: { to: UNISWAP_V3_SWAP_ROUTER02, value: '0x' + amountInAtomic.toString(16), data: swapCalldata, chainId: 4663 },
                quote,
                router: 'Uniswap V3',
                network: 'robinhood-chain',
                note: 'Sign this transaction with your private key and broadcast to Robinhood Chain.',
                timestamp: new Date().toISOString(),
            });
        }

        // ERC20 in: needs a one-time approval for the router before the swap can pull funds.
        const approveData = encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [UNISWAP_V3_SWAP_ROUTER02, amountInAtomic] });
        res.json({
            steps: [
                {
                    tx: { to: inToken.address, value: '0x0', data: approveData, chainId: 4663 },
                    note: `Approve the Uniswap V3 router to spend your ${inToken.symbol} (one-time per allowance).`,
                },
                {
                    tx: { to: UNISWAP_V3_SWAP_ROUTER02, value: '0x0', data: swapCalldata, chainId: 4663 },
                    note: 'Execute the swap. Broadcast this only after the approval above confirms.',
                },
            ],
            quote,
            router: 'Uniswap V3',
            network: 'robinhood-chain',
            note: 'Sign and broadcast each transaction in order with your private key.',
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('Trade construction error:', err.message);
        res.status(500).json({ error: 'Failed to construct trade transaction', details: err.message });
    }
});

// ─── Paid Endpoint: Quote (swap price check, no tx constructed) ─────────
router.get('/quote/:tokenIn/:tokenOut/:amountIn', async (req, res) => {
    try {
        const { tokenIn, tokenOut, amountIn } = req.params;
        const parsedAmount = parseFloat(amountIn);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ error: 'amountIn must be a positive number' });
        }

        const [inToken, outToken] = await Promise.all([resolveToken(tokenIn), resolveToken(tokenOut)]);
        const route = await findRoute(inToken.address, outToken.address);
        if (!route) {
            return res.status(404).json({
                error: `No Uniswap V3 route found between ${inToken.symbol} and ${outToken.symbol}`,
                hint: 'No direct pool, and no route through WETH or USDG has liquidity either.',
            });
        }

        const amountInAtomic = BigInt(Math.round(parsedAmount * 10 ** inToken.decimals));
        const amountOut = await quoteRoute(route, amountInAtomic);
        const amountOutFormatted = Number(amountOut) / 10 ** outToken.decimals;

        res.json({
            tokenIn: inToken.symbol,
            tokenOut: outToken.symbol,
            amountIn: parsedAmount.toString(),
            amountOut: amountOutFormatted.toFixed(6),
            price: (amountOutFormatted / parsedAmount).toFixed(6),
            route: routeFeesLabel(route),
            router: 'Uniswap V3',
            network: 'robinhood-chain',
            chainId: 4663,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('Quote error:', err.message);
        res.status(500).json({ error: 'Failed to fetch quote', details: err.message });
    }
});

// ─── Paid Endpoint: Pool (Uniswap V3 liquidity for a token pair) ───────
router.get('/pool/:tokenA/:tokenB', async (req, res) => {
    try {
        const { tokenA, tokenB } = req.params;
        const [t0, t1] = await Promise.all([resolveToken(tokenA), resolveToken(tokenB)]);
        const best = await findBestPool(t0.address, t1.address);
        if (!best) {
            return res.status(404).json({ error: `No Uniswap V3 pool with liquidity found for ${t0.symbol}/${t1.symbol}` });
        }

        const [slot0, poolToken0, balance0Raw, balance1Raw] = await Promise.all([
            readContract(best.pool, v3PoolAbi, 'slot0'),
            readContract(best.pool, v3PoolAbi, 'token0'),
            readContract(t0.address, erc20Abi, 'balanceOf', [best.pool]),
            readContract(t1.address, erc20Abi, 'balanceOf', [best.pool]),
        ]);

        const sqrtPriceX96 = slot0[0];
        const isT0First = poolToken0.toLowerCase() === t0.address.toLowerCase();
        const [decimals0, decimals1] = isT0First ? [t0.decimals, t1.decimals] : [t1.decimals, t0.decimals];
        const rawPrice = (Number(sqrtPriceX96) / 2 ** 96) ** 2; // token1 per token0, atomic units
        const priceToken1PerToken0 = rawPrice * 10 ** (decimals0 - decimals1);

        res.json({
            pair: `${t0.symbol}/${t1.symbol}`,
            pairAddress: best.pool,
            feeTier: `${best.fee / 10000}%`,
            router: 'Uniswap V3',
            reserves: { [t0.symbol]: (Number(balance0Raw) / 10 ** t0.decimals).toFixed(6), [t1.symbol]: (Number(balance1Raw) / 10 ** t1.decimals).toFixed(6) },
            impliedPrice: isT0First
                ? { [`${t0.symbol}_in_${t1.symbol}`]: priceToken1PerToken0.toFixed(6) }
                : { [`${t1.symbol}_in_${t0.symbol}`]: priceToken1PerToken0.toFixed(6) },
            network: 'robinhood-chain',
            chainId: 4663,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('Pool lookup error:', err.message);
        res.status(500).json({ error: 'Failed to fetch pool info', details: err.message });
    }
});

// ─── Paid Endpoint: Liquidity add (mint a Uniswap V3 position) ─────────
// Custom-range by design: rangePct sets how tight the band is around the
// current price (e.g. 5 = +-5%). Tighter ranges earn more fees per dollar of
// capital but go out-of-range (and stop earning) faster if price moves.
router.post('/liquidity/add', async (req, res) => {
    try {
        const { tokenA, tokenB, amountA, amountB, from, rangePct } = req.body;
        if (!tokenA || !tokenB || !amountA || !amountB || !from) {
            return res.status(400).json({ error: 'tokenA, tokenB, amountA, amountB, and from (your wallet address) are required' });
        }
        if (!/^0x[0-9a-fA-F]{40}$/.test(from)) {
            return res.status(400).json({ error: 'Invalid from address' });
        }
        const parsedA = parseFloat(amountA);
        const parsedB = parseFloat(amountB);
        if (isNaN(parsedA) || parsedA <= 0 || isNaN(parsedB) || parsedB <= 0) {
            return res.status(400).json({ error: 'amountA and amountB must be positive numbers' });
        }
        const pct = rangePct !== undefined ? Number(rangePct) : 10;
        if (isNaN(pct) || pct <= 0 || pct >= 100) {
            return res.status(400).json({ error: 'rangePct must be a number between 0 and 100 (exclusive)' });
        }

        const [t0, t1] = await Promise.all([resolveToken(tokenA), resolveToken(tokenB)]);
        if (t0.address.toLowerCase() === t1.address.toLowerCase()) {
            return res.status(400).json({ error: 'tokenA and tokenB resolve to the same token' });
        }
        const best = await findBestPool(t0.address, t1.address);
        if (!best) {
            return res.status(404).json({ error: `No Uniswap V3 pool with liquidity found for ${t0.symbol}/${t1.symbol}` });
        }

        const [slot0, poolToken0, tickSpacing] = await Promise.all([
            readContract(best.pool, v3PoolAbi, 'slot0'),
            readContract(best.pool, v3PoolAbi, 'token0'),
            readContract(best.pool, v3PoolAbi, 'tickSpacing'),
        ]);
        const currentTick = slot0[1];
        const spacing = Number(tickSpacing);
        const isT0First = poolToken0.toLowerCase() === t0.address.toLowerCase();
        const [token0, token1, decimals0, decimals1] = isT0First ? [t0.address, t1.address, t0.decimals, t1.decimals] : [t1.address, t0.address, t1.decimals, t0.decimals];
        const [amount0, amount1] = isT0First ? [parsedA, parsedB] : [parsedB, parsedA];
        // At most one side can be native ETH (tokenA/tokenB already rejected if equal), since 'ETH'
        // always resolves to the WETH address. That side must be paid via msg.value, not transferFrom —
        // the position manager wraps ETH internally (like SwapRouter02) only when it holds enough of its
        // own native balance; otherwise it tries an ERC20 pull that reverts with "STF" (no WETH balance).
        const nativeIsToken0 = t0.isNative ? isT0First : t1.isNative ? !isT0First : false;
        const nativeIsToken1 = t0.isNative ? !isT0First : t1.isNative ? isT0First : false;

        // 1.0001^tick = price -> a +-pct% price band is +-log(1 +- pct/100) / log(1.0001) ticks.
        const tickDelta = Math.round(Math.log(1 + pct / 100) / Math.log(1.0001));
        let tickLower = Math.floor((Number(currentTick) - tickDelta) / spacing) * spacing;
        let tickUpper = Math.ceil((Number(currentTick) + tickDelta) / spacing) * spacing;
        tickLower = Math.max(tickLower, Math.ceil(MIN_TICK / spacing) * spacing);
        tickUpper = Math.min(tickUpper, Math.floor(MAX_TICK / spacing) * spacing);

        const amount0Desired = BigInt(Math.round(amount0 * 10 ** decimals0));
        const amount1Desired = BigInt(Math.round(amount1 * 10 ** decimals1));
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);

        const mintCalldata = encodeFunctionData({
            abi: v3PositionManagerAbi, functionName: 'mint',
            args: [{
                token0, token1, fee: best.fee, tickLower, tickUpper,
                amount0Desired, amount1Desired, amount0Min: 0n, amount1Min: 0n,
                recipient: from, deadline,
            }],
        });

        const steps = [];
        let mintValue = 0n;
        if (!nativeIsToken0) {
            const approve0 = encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [UNISWAP_V3_POSITION_MANAGER, amount0Desired] });
            steps.push({ tx: { to: token0, value: '0x0', data: approve0, chainId: 4663 }, note: 'Approve the position manager to spend token0.' });
        } else {
            mintValue = amount0Desired;
        }
        if (!nativeIsToken1) {
            const approve1 = encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [UNISWAP_V3_POSITION_MANAGER, amount1Desired] });
            steps.push({ tx: { to: token1, value: '0x0', data: approve1, chainId: 4663 }, note: 'Approve the position manager to spend token1.' });
        } else {
            mintValue = amount1Desired;
        }

        if (mintValue > 0n) {
            // Bundle mint + refundETH so any unused ETH (the mint only wraps what the chosen
            // price range actually needs, not necessarily the full amount sent) comes back to the caller.
            const refundCalldata = encodeFunctionData({ abi: v3PositionManagerAbi, functionName: 'refundETH' });
            const multicallData = encodeFunctionData({ abi: v3PositionManagerAbi, functionName: 'multicall', args: [[mintCalldata, refundCalldata]] });
            steps.push({ tx: { to: UNISWAP_V3_POSITION_MANAGER, value: '0x' + mintValue.toString(16), data: multicallData, chainId: 4663 }, note: 'Mint the position (wrapping ETH as needed) and refund any unused ETH. Broadcast only after the approval above confirms.' });
        } else {
            steps.push({ tx: { to: UNISWAP_V3_POSITION_MANAGER, value: '0x0', data: mintCalldata, chainId: 4663 }, note: 'Mint the position. Broadcast only after both approvals confirm.' });
        }

        res.json({
            steps,
            position: {
                pair: `${t0.symbol}/${t1.symbol}`,
                feeTier: `${best.fee / 10000}%`,
                rangePct: pct,
                tickLower,
                tickUpper,
                currentTick: Number(currentTick),
                amountA: parsedA.toString(),
                amountB: parsedB.toString(),
            },
            router: 'Uniswap V3',
            network: 'robinhood-chain',
            note: 'Sign and broadcast each transaction in order. The position NFT (tokenId) is minted to your address in the last step; read it off that transaction\'s receipt/logs.',
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('Liquidity add error:', err.message);
        res.status(500).json({ error: 'Failed to construct liquidity-add transaction', details: err.message });
    }
});

// ─── Paid Endpoint: Liquidity remove (withdraw a Uniswap V3 position) ──
router.post('/liquidity/remove', async (req, res) => {
    try {
        const { tokenId, from, burn } = req.body;
        if (!tokenId || !from) {
            return res.status(400).json({ error: 'tokenId and from (your wallet address) are required' });
        }
        if (!/^0x[0-9a-fA-F]{40}$/.test(from)) {
            return res.status(400).json({ error: 'Invalid from address' });
        }

        const tokenIdBig = BigInt(tokenId);
        const [owner, position] = await Promise.all([
            readContract(UNISWAP_V3_POSITION_MANAGER, v3PositionManagerAbi, 'ownerOf', [tokenIdBig]),
            readContract(UNISWAP_V3_POSITION_MANAGER, v3PositionManagerAbi, 'positions', [tokenIdBig]),
        ]);
        if (owner.toLowerCase() !== from.toLowerCase()) {
            return res.status(403).json({ error: `Position ${tokenId} is not owned by ${from}` });
        }
        const liquidity = position[7];
        if (liquidity === 0n) {
            return res.status(400).json({ error: `Position ${tokenId} already has zero liquidity; nothing to remove` });
        }

        const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
        const decreaseCalldata = encodeFunctionData({
            abi: v3PositionManagerAbi, functionName: 'decreaseLiquidity',
            args: [{ tokenId: tokenIdBig, liquidity, amount0Min: 0n, amount1Min: 0n, deadline }],
        });

        const token0 = position[2];
        const token1 = position[3];
        const involvesWeth = token0.toLowerCase() === WETH_CONTRACT.toLowerCase() || token1.toLowerCase() === WETH_CONTRACT.toLowerCase();
        const otherToken = token0.toLowerCase() === WETH_CONTRACT.toLowerCase() ? token1 : token0;

        const steps = [
            { tx: { to: UNISWAP_V3_POSITION_MANAGER, value: '0x0', data: decreaseCalldata, chainId: 4663 }, note: 'Withdraw all liquidity from the position back into it, uncollected.' },
        ];

        if (!involvesWeth) {
            const collectCalldata = encodeFunctionData({
                abi: v3PositionManagerAbi, functionName: 'collect',
                args: [{ tokenId: tokenIdBig, recipient: from, amount0Max: 2n ** 128n - 1n, amount1Max: 2n ** 128n - 1n }],
            });
            steps.push({ tx: { to: UNISWAP_V3_POSITION_MANAGER, value: '0x0', data: collectCalldata, chainId: 4663 }, note: 'Collect the withdrawn tokens (plus any accrued fees) to your wallet.' });
        } else {
            // Route the collected WETH leg through this contract, then unwrap it to native ETH and
            // sweep the other token out — collect() alone would leave you holding WETH, not ETH.
            const collectToRouter = encodeFunctionData({
                abi: v3PositionManagerAbi, functionName: 'collect',
                args: [{ tokenId: tokenIdBig, recipient: V3_ADDRESS_THIS, amount0Max: 2n ** 128n - 1n, amount1Max: 2n ** 128n - 1n }],
            });
            const unwrapCalldata = encodeFunctionData({ abi: v3PositionManagerAbi, functionName: 'unwrapWETH9', args: [0n, from] });
            const sweepCalldata = encodeFunctionData({ abi: v3PositionManagerAbi, functionName: 'sweepToken', args: [otherToken, 0n, from] });
            const multicallData = encodeFunctionData({ abi: v3PositionManagerAbi, functionName: 'multicall', args: [[collectToRouter, unwrapCalldata, sweepCalldata]] });
            steps.push({ tx: { to: UNISWAP_V3_POSITION_MANAGER, value: '0x0', data: multicallData, chainId: 4663 }, note: 'Collect, unwrap the WETH leg to native ETH, and sweep the other token to your wallet.' });
        }

        if (burn) {
            const burnCalldata = encodeFunctionData({ abi: v3PositionManagerAbi, functionName: 'burn', args: [tokenIdBig] });
            steps.push({ tx: { to: UNISWAP_V3_POSITION_MANAGER, value: '0x0', data: burnCalldata, chainId: 4663 }, note: 'Burn the now-empty position NFT.' });
        }

        res.json({
            tokenId: tokenId.toString(),
            token0: position[2],
            token1: position[3],
            feeTier: `${position[4] / 10000}%`,
            steps,
            router: 'Uniswap V3',
            network: 'robinhood-chain',
            note: 'Sign and broadcast each transaction in order.',
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('Liquidity remove error:', err.message);
        res.status(500).json({ error: 'Failed to construct liquidity-remove transaction', details: err.message });
    }
});

// ─── Paid Endpoint: Liquidity positions (enumerate an address's V3 NFTs) ─
router.get('/liquidity/positions/:address', async (req, res) => {
    try {
        const { address } = req.params;
        if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
            return res.status(400).json({ error: 'Invalid address' });
        }

        const balance = await readContract(UNISWAP_V3_POSITION_MANAGER, v3PositionManagerAbi, 'balanceOf', [address]);
        const tokenIds = await Promise.all(
            Array.from({ length: Number(balance) }, (_, i) => readContract(UNISWAP_V3_POSITION_MANAGER, v3PositionManagerAbi, 'tokenOfOwnerByIndex', [address, BigInt(i)])),
        );
        const positions = await Promise.all(tokenIds.map((id) => readContract(UNISWAP_V3_POSITION_MANAGER, v3PositionManagerAbi, 'positions', [id])));

        res.json({
            address,
            count: positions.length,
            positions: positions.map((p, i) => ({
                tokenId: tokenIds[i].toString(),
                token0: p[2],
                token1: p[3],
                feeTier: `${p[4] / 10000}%`,
                tickLower: p[5],
                tickUpper: p[6],
                liquidity: p[7].toString(),
                tokensOwed0: p[10].toString(),
                tokensOwed1: p[11].toString(),
            })),
            router: 'Uniswap V3',
            network: 'robinhood-chain',
            chainId: 4663,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('Liquidity positions lookup error:', err.message);
        res.status(500).json({ error: 'Failed to fetch liquidity positions', details: err.message });
    }
});

// ─── Paid Endpoint: Yield (Morpho steakUSDG vault, powers Robinhood Earn) ─
// Queried live from Morpho's official GraphQL API (api.morpho.org) — not
// hardcoded APY, since the rate changes with utilization.
const MORPHO_STEAKHOUSE_USDG_VAULT = '0xBeEff033F34C046626B8D0A041844C5d1A5409dd';
router.get('/yield/usdg', async (req, res) => {
    try {
        const query = `query {
            vaultV2ByAddress(address: "${MORPHO_STEAKHOUSE_USDG_VAULT}", chainId: 4663) {
                address
                name
                symbol
                totalAssetsUsd
                netApy
                avgNetApy
            }
        }`;
        const morphoRes = await fetch('https://api.morpho.org/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
        });
        const json = await morphoRes.json();
        const vault = json.data && json.data.vaultV2ByAddress;
        if (!vault) {
            return res.status(502).json({ error: 'Vault data unavailable' });
        }

        res.json({
            vault: vault.name,
            symbol: vault.symbol,
            address: vault.address,
            asset: 'USDG',
            curator: 'Steakhouse Financial',
            protocol: 'Morpho',
            note: 'This is the vault that powers Robinhood Earn.',
            apy: (vault.netApy * 100).toFixed(2) + '%',
            avgApy30d: (vault.avgNetApy * 100).toFixed(2) + '%',
            tvlUSD: vault.totalAssetsUsd.toFixed(2),
            network: 'robinhood-chain',
            chainId: 4663,
            source: 'morpho-api',
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('Yield lookup error:', err.message);
        res.status(500).json({ error: 'Failed to fetch yield data', details: err.message });
    }
});

// ─── Paid Endpoint: Bridge (Across quote into Robinhood Chain) ─────────
// Uses Across's public suggested-fees API (no key required) — Across is a
// day-one bridging partner for Robinhood Chain, confirmed live on-chain via
// its own spoke pool at 0xD29C85F15DF544bA632C9E25829fd29d767d7978.
const ACROSS_ORIGIN_TOKENS = {
    // originChainId -> { USDC, WETH } addresses, for routes into Robinhood Chain (USDG / WETH)
    1: { USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', chainName: 'Ethereum' },
    42161: { USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', chainName: 'Arbitrum' },
    8453: { USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', WETH: '0x4200000000000000000000000000000000000006', chainName: 'Base' },
};
// Destination (Robinhood Chain) side of each route — USDC bridges in as USDG, WETH stays WETH.
const ACROSS_DESTINATION_TOKENS = { USDC: USDG_CONTRACT, WETH: WETH_CONTRACT };

router.get('/bridge/:originChain/:token/:amount', async (req, res) => {
    try {
        const { originChain, token, amount } = req.params;
        const originChainId = Number(originChain);
        const tokenUpper = token.toUpperCase();

        const originConfig = ACROSS_ORIGIN_TOKENS[originChainId];
        if (!originConfig || !originConfig[tokenUpper]) {
            return res.status(400).json({
                error: `Unsupported route: ${token} from chain ${originChain}`,
                hint: 'Supported origin chains: 1 (Ethereum), 42161 (Arbitrum), 8453 (Base). Supported tokens: USDC, WETH.',
            });
        }

        const decimals = tokenUpper === 'USDC' ? 6 : 18;
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ error: 'amount must be a positive number' });
        }
        const amountAtomic = BigInt(Math.floor(parsedAmount * 10 ** decimals));

        const inputToken = originConfig[tokenUpper];
        const outputToken = ACROSS_DESTINATION_TOKENS[tokenUpper];
        const url = `https://app.across.to/api/suggested-fees?originChainId=${originChainId}&destinationChainId=4663&inputToken=${inputToken}&outputToken=${outputToken}&amount=${amountAtomic}`;
        const acrossRes = await fetch(url);
        const data = await acrossRes.json();

        if (data.type === 'AcrossApiError' || !data.outputAmount) {
            return res.status(502).json({ error: 'Bridge quote unavailable', details: data.message || data });
        }

        const outputDecimals = data.outputToken && data.outputToken.decimals ? data.outputToken.decimals : decimals;

        res.json({
            from: { chainId: originChainId, chainName: originConfig.chainName, token: tokenUpper, amount: parsedAmount.toString() },
            to: {
                chainId: 4663,
                chainName: 'Robinhood Chain',
                token: data.outputToken.symbol,
                amount: (Number(data.outputAmount) / 10 ** outputDecimals).toFixed(6),
            },
            estimatedFillTimeSeconds: data.estimatedFillTimeSec,
            totalFeePct: (Number(data.relayFeePct) / 1e18 * 100).toFixed(4) + '%',
            spokePoolAddress: data.spokePoolAddress,
            destinationSpokePoolAddress: data.destinationSpokePoolAddress,
            provider: 'Across Protocol',
            note: 'This is a quote only. Depositing on the origin chain\'s spoke pool executes the bridge; a relayer fills it on Robinhood Chain in seconds.',
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('Bridge quote error:', err.message);
        res.status(500).json({ error: 'Failed to fetch bridge quote', details: err.message });
    }
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
    'POST /trade': {
        required: true,
        content: { 'application/json': { schema: { type: 'object', required: ['tokenIn', 'tokenOut', 'amountIn', 'from'], properties: {
            tokenIn: { type: 'string', description: '"ETH", "USDG", or any ERC20 token address on Robinhood Chain' },
            tokenOut: { type: 'string', description: '"ETH", "USDG", or any ERC20 token address on Robinhood Chain' },
            amountIn: { type: 'string', description: 'Human-readable amount of tokenIn' },
            from: { type: 'string', description: 'Your wallet address (receives the swap output)' },
            slippageBps: { type: 'number', description: 'Optional slippage tolerance in basis points, default 100 (1%)' },
        } } } },
    },
    'POST /liquidity/add': {
        required: true,
        content: { 'application/json': { schema: { type: 'object', required: ['tokenA', 'tokenB', 'amountA', 'amountB', 'from'], properties: {
            tokenA: { type: 'string', description: '"ETH", "USDG", or any ERC20 token address' },
            tokenB: { type: 'string', description: '"ETH", "USDG", or any ERC20 token address' },
            amountA: { type: 'string', description: 'Human-readable max amount of tokenA to deposit' },
            amountB: { type: 'string', description: 'Human-readable max amount of tokenB to deposit' },
            from: { type: 'string', description: 'Your wallet address (receives the position NFT)' },
            rangePct: { type: 'number', description: 'Optional price band width in percent around the current price, default 10 (i.e. +-10%)' },
        } } } },
    },
    'POST /liquidity/remove': {
        required: true,
        content: { 'application/json': { schema: { type: 'object', required: ['tokenId', 'from'], properties: {
            tokenId: { type: 'string', description: 'The Uniswap V3 position NFT tokenId, from /liquidity/add or /liquidity/positions' },
            from: { type: 'string', description: 'Your wallet address (must own the position)' },
            burn: { type: 'boolean', description: 'Optional: also burn the now-empty position NFT, default false' },
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
