if (!globalThis.crypto) globalThis.crypto = require('crypto').webcrypto;

require('dotenv').config();

const express = require('express');
const path = require('path');
const apiRouter = require('./packages/api/server.js');
const skillRouter = require('./packages/api/skills.js');
const scanRouter = require('./packages/api/scan.js');
const { initDb } = require('./packages/api/db.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON bodies
app.use(express.json());

// Mount API routes at /api
app.use('/api', apiRouter);

// Mount r0x Scan (real settled transaction feed + stats) at /api/scan
app.use('/api/scan', scanRouter);

// Mount x402-paywalled skill API at /skill
app.use('/skill', skillRouter);

// Serve inner-site at /os/
app.use('/os', express.static(path.join(__dirname, 'packages/inner-site/build'), {
    index: 'index.html',
}));

// SPA fallback for inner-site (React Router)
app.get('/os/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'packages/inner-site/build', 'index.html'));
});

// ─── x402 Discovery ─────────────────────────────────
// https://github.com/Merit-Systems/x402scan/blob/main/docs/DISCOVERY.md
// x402scan checks discovery in this order: (1) /openapi.json, (2) /.well-known/x402.
// Both are kept in sync — OpenAPI is generated from the same paywallRoutes config the
// server actually enforces, so it can never drift from runtime behavior.
const R0X_ORIGIN = process.env.PUBLIC_ORIGIN || 'https://projectr0x.dev';

app.get('/openapi.json', (req, res) => {
    res.json(skillRouter.buildOpenApiSpec(`${R0X_ORIGIN}/skill`));
});

app.get('/.well-known/x402', (req, res) => {
    res.json({
        version: 1,
        resources: [
            `${R0X_ORIGIN}/skill/balance/0x0000000000000000000000000000000000000001`,
            `${R0X_ORIGIN}/skill/tx/0x0000000000000000000000000000000000000000000000000000000000000001`,
            `${R0X_ORIGIN}/skill/price/ETH`,
            `${R0X_ORIGIN}/skill/wallet/generate`,
            `${R0X_ORIGIN}/skill/chat`,
            `${R0X_ORIGIN}/skill/send`,
            `${R0X_ORIGIN}/skill/trade`,
            `${R0X_ORIGIN}/skill/quote/ETH/USDG/0.1`,
            `${R0X_ORIGIN}/skill/pool/ETH/USDG`,
            `${R0X_ORIGIN}/skill/yield/usdg`,
            `${R0X_ORIGIN}/skill/bridge/42161/USDC/100`,
            `${R0X_ORIGIN}/skill/fund/0x0000000000000000000000000000000000000001`,
            `${R0X_ORIGIN}/skill/broadcast`,
            `${R0X_ORIGIN}/skill/unlimited`,
        ],
        ownershipProofs: [
            '0x981d16b1a52bd1099e58e0348fa9e48242ac8190b6dc1c3ebe6352b3db677b806ddad970547768609f40a9c9f81d7ba3e0c2b4fbbfbef77f8af280c072548dd31b',
        ],
        instructions:
            '# r0x Skills\n\n' +
            'On-chain intelligence, transactions and wallet tools on Robinhood Chain, paywalled via x402 USDG micropayments ($0.01 each). ' +
            'Runs on the official r0x facilitator: every payment is verified and settled in-process, so any agent can call a skill and get a result in one round trip.\n\n' +
            '## Endpoints\n' +
            '- **Balance Lookup** - ETH + USDG balances for any Robinhood Chain address\n' +
            '- **Transaction Details** - Decoded tx info for any Robinhood Chain tx hash\n' +
            '- **Token Price** - Current USD price for ETH and USDG\n' +
            '- **Wallet Generation** - Generate a fresh Robinhood Chain keypair\n' +
            '- **AI Chat** - Chat with the r0x Agent ($0.01/message)\n' +
            '- **Send** - Construct unsigned ETH or USDG transfer tx\n' +
            '- **Trade** - Real Uniswap V2 swap tx (ETH <-> USDG) on Robinhood Chain\n' +
            '- **Quote** - Live swap price quote, no tx constructed\n' +
            '- **Pool** - Uniswap V2 pool reserves and implied price\n' +
            '- **Yield** - Morpho steakUSDG vault APY (powers Robinhood Earn)\n' +
            '- **Bridge** - Across Protocol quote for bridging onto Robinhood Chain\n' +
            '- **Fund** - Wallet balance and funding instructions\n' +
            '- **Broadcast** - Sign and broadcast a transaction on Robinhood Chain\n' +
            '- **Unlimited** - One-time $100 payment for unlimited access to all skills\n\n' +
            '## SDK\n' +
            'npm install r0x-os -- TypeScript SDK with x402 payment signing built in.\n' +
            'Claude Code plugin: /plugin marketplace add nhevers/project-r0x\n\n' +
            '## Catalog\n' +
            `Free catalog at ${R0X_ORIGIN}/skill/catalog\n\n` +
            '## More Info\n' +
            R0X_ORIGIN,
    });
});

// Serve 3d-site at / (main entry)
app.use(express.static(path.join(__dirname, 'packages/3d-site/public'), {
    index: 'index.html',
}));

// SPA fallback for 3d-site
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'packages/3d-site/public', 'index.html'));
});

initDb()
    .catch((err) => console.error('[r0x-scan] Postgres init failed:', err.message))
    .finally(() => {
        app.listen(PORT, () => {
            console.log(`r0x unified server running on port ${PORT}`);
            console.log(`  3d-site:    http://localhost:${PORT}/`);
            console.log(`  inner-site: http://localhost:${PORT}/os/`);
            console.log(`  api:        http://localhost:${PORT}/api/`);
            console.log(`  scan:       http://localhost:${PORT}/api/scan/stats`);
            console.log(`  skill:      http://localhost:${PORT}/skill/catalog`);
        });
    });
