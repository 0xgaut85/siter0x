import React from 'react';
import ResumeDownload from '../ResumeDownload';

export interface SkillsPageProps {}

const SkillsPage: React.FC<SkillsPageProps> = (props) => {
    return (
        <div className="site-page-content">
            <div style={styles.headerContainer}>
                <div style={styles.header}>
                    <div style={styles.headerRow}>
                        <h1>r0x Skills</h1>
                        <div style={styles.badge}>
                            <span style={styles.badgeText}>EXECUTION</span>
                        </div>
                    </div>
                    <div style={styles.headerRow}>
                        <h3>Skill Format</h3>
                    </div>
                </div>
            </div>
            <div className="text-block">
                <p>
                    r0x packages every capability as a skill: a plain HTTP
                    endpoint that agents can discover, price-check and invoke
                    programmatically. No SDK is required to call a skill —
                    any HTTP client that can sign an EIP-3009 authorization
                    works.
                </p>
            </div>

            {/* LIVE SKILLS */}
            <div style={styles.headerContainer}>
                <div style={styles.header}>
                    <div style={styles.headerRow}>
                        <h2>Live Skills</h2>
                    </div>
                </div>
            </div>
            <div className="text-block">
                <p>
                    Nine skills are live in production at{' '}
                    <b>projectr0x.dev/skill/</b>. Each costs $0.01 USDG on
                    Robinhood Chain via x402, self-facilitated by r0x.
                </p>
                <br />
                <div style={styles.skillCard}>
                    <h3 style={styles.skillTitle}>Balance Lookup</h3>
                    <code style={styles.skillEndpoint}>GET /skill/balance/:address</code>
                    <p>Returns ETH and USDG balances for any Robinhood Chain address.</p>
                </div>
                <div style={styles.skillCard}>
                    <h3 style={styles.skillTitle}>Transaction Details</h3>
                    <code style={styles.skillEndpoint}>GET /skill/tx/:hash</code>
                    <p>Decoded transaction info for any Robinhood Chain tx hash.</p>
                </div>
                <div style={styles.skillCard}>
                    <h3 style={styles.skillTitle}>Token Price</h3>
                    <code style={styles.skillEndpoint}>GET /skill/price/:token</code>
                    <p>Current USD price for ETH or USDG via CoinGecko.</p>
                </div>
                <div style={styles.skillCard}>
                    <h3 style={styles.skillTitle}>Wallet Generation</h3>
                    <code style={styles.skillEndpoint}>GET /skill/wallet/generate</code>
                    <p>Generates a fresh Ethereum keypair for Robinhood Chain. Useful for funding your agent.</p>
                </div>
                <div style={styles.skillCard}>
                    <h3 style={styles.skillTitle}>AI Agent Chat</h3>
                    <code style={styles.skillEndpoint}>POST /skill/chat</code>
                    <p>Chat with the r0x AI Agent. Send a messages array, get a response.</p>
                </div>
                <div style={styles.skillCard}>
                    <h3 style={styles.skillTitle}>Send</h3>
                    <code style={styles.skillEndpoint}>POST /skill/send</code>
                    <p>Construct an unsigned ETH or USDG transfer transaction on Robinhood Chain. Client signs and broadcasts.</p>
                </div>
                <div style={styles.skillCard}>
                    <h3 style={styles.skillTitle}>Fund</h3>
                    <code style={styles.skillEndpoint}>GET /skill/fund/:address</code>
                    <p>Check wallet balances and get funding instructions for Robinhood Chain. ETH and USDG.</p>
                </div>
                <div style={styles.skillCard}>
                    <h3 style={styles.skillTitle}>Broadcast</h3>
                    <code style={styles.skillEndpoint}>POST /skill/broadcast</code>
                    <p>Sign and broadcast a transaction on Robinhood Chain given an unsigned tx and private key.</p>
                </div>
            </div>
            <div className="text-block">
                <p style={{ opacity: 0.7, fontSize: 12 }}>
                    Note: <b>Trade</b> (<code style={styles.skillEndpoint}>POST /skill/trade</code>) exists but
                    is temporarily disabled and not paywalled — no DEX aggregator supports Robinhood Chain
                    (chain ID 4663) yet.
                </p>
            </div>

            {/* SKILL CATALOG */}
            <div style={styles.headerContainer}>
                <div style={styles.header}>
                    <div style={styles.headerRow}>
                        <h2>Skill Catalog</h2>
                    </div>
                </div>
            </div>
            <div className="text-block">
                <p>
                    The free catalog endpoint lists all available skills with
                    their price, method and description. No payment required.
                </p>
                <br />
                <pre style={styles.codeBlock}>
{`GET /skill/catalog

{
  "skills": [
    {
      "endpoint": "/skill/balance/:address",
      "method": "GET",
      "price": "$0.01",
      "currency": "USDG",
      "network": "eip155:4663",
      "description": "Get ETH and USDG balances for any Robinhood Chain address"
    },
    { "endpoint": "/skill/tx/:hash", ... },
    { "endpoint": "/skill/price/:token", ... },
    { "endpoint": "/skill/wallet/generate", ... },
    { "endpoint": "/skill/chat", "method": "POST", ... },
    { "endpoint": "/skill/send", "method": "POST", ... },
    { "endpoint": "/skill/fund/:address", ... },
    { "endpoint": "/skill/broadcast", "method": "POST", ... },
    { "endpoint": "/skill/trade", "method": "POST", "price": "unavailable", ... }
  ],
  "payTo": "0x101Cd32b9bEEE93845Ead7Bc604a5F1873330acf",
  "network": "eip155:4663",
  "chainId": 4663,
  "asset": "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168"
}`}
                </pre>
            </div>

            {/* SKILL MANIFEST */}
            <div style={styles.headerContainer}>
                <div style={styles.header}>
                    <div style={styles.headerRow}>
                        <h2>Skill Manifest</h2>
                    </div>
                </div>
            </div>
            <div className="text-block">
                <p>
                    Each skill set is described by a{' '}
                    <b>skills.json</b> manifest that agents use
                    for discovery.
                </p>
                <br />
                <pre style={styles.codeBlock}>
{`{
  "name": "r0x-skills",
  "version": "2.0.0",
  "description": "On-chain intelligence + transactions on Robinhood Chain via x402 v2",
  "skills": [
    {
      "name": "balance-lookup",
      "endpoint": "/skill/balance/{address}",
      "method": "GET",
      "price": "0.01",
      "currency": "USDG",
      "network": "eip155:4663"
    },
    { "name": "tx-details", "endpoint": "/skill/tx/{hash}", ... },
    { "name": "token-price", "endpoint": "/skill/price/{token}", ... },
    { "name": "wallet-generate", "endpoint": "/skill/wallet/generate", ... },
    { "name": "agent-chat", "endpoint": "/skill/chat", "method": "POST", ... },
    {
      "name": "send",
      "endpoint": "/skill/send",
      "method": "POST",
      "price": "0.01",
      "currency": "USDG",
      "network": "eip155:4663"
    },
    {
      "name": "fund",
      "endpoint": "/skill/fund/{address}",
      "method": "GET",
      "price": "0.01",
      "currency": "USDG",
      "network": "eip155:4663"
    },
    {
      "name": "broadcast",
      "endpoint": "/skill/broadcast",
      "method": "POST",
      "price": "0.01",
      "currency": "USDG",
      "network": "eip155:4663"
    }
  ]
}`}
                </pre>
            </div>

            {/* ARCHITECTURE */}
            <div style={styles.headerContainer}>
                <div style={styles.header}>
                    <div style={styles.headerRow}>
                        <h2>How It Works</h2>
                    </div>
                </div>
            </div>
            <div className="text-block">
                <pre style={styles.codeBlock}>
{`┌──────────────────────────────────────────┐
│              CLIENT / AGENT              │
│                                          │
│  1. GET /skill/balance/0xABC...          │
│  2. Receive 402 + PAYMENT-REQUIRED header│
│  3. Sign EIP-3009 USDG transfer          │
│  4. Retry with PAYMENT-SIGNATURE header  │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│   @x402/express MIDDLEWARE (v2, self-    │
│         hosted facilitator)               │
│                                          │
│  - Intercepts request                    │
│  - Sends 402 if no payment              │
│  - Verifies + settles payment in-process │
│    using r0x's own gas wallet            │
│  - Forwards to skill handler if valid   │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│            SKILL HANDLER                 │
│                                          │
│  - Calls Robinhood Chain RPC / CoinGecko │
│  - Returns JSON response                │
└──────────────────────────────────────────┘`}
                </pre>
            </div>
            <ResumeDownload />
        </div>
    );
};

const styles: StyleSheetCSS = {
    header: {
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
    },
    headerContainer: {
        alignItems: 'flex-end',
        width: '100%',
        justifyContent: 'center',
    },
    headerRow: {
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    badge: {
        backgroundColor: '#CEF506',
        padding: '4px 10px',
    },
    badgeText: {
        color: '#1F1B10',
        fontSize: 10,
        letterSpacing: 2,
        fontWeight: 'bold',
    },
    skillCard: {
        marginBottom: 16,
        padding: 16,
        border: '1px solid #ccc',
        backgroundColor: '#f8f8f8',
        flexDirection: 'column',
    },
    skillTitle: {
        color: '#1F1B10',
        marginBottom: 4,
    },
    skillEndpoint: {
        fontFamily: 'monospace',
        fontSize: 11,
        backgroundColor: '#1a1a1a',
        color: '#00ff88',
        padding: '2px 6px',
        marginBottom: 8,
        display: 'inline-block',
    },
    codeBlock: {
        fontFamily: 'monospace',
        fontSize: 11,
        lineHeight: 1.4,
        backgroundColor: '#1a1a1a',
        color: '#00ff88',
        padding: 16,
        overflow: 'auto',
        whiteSpace: 'pre',
        border: '1px solid #333',
    },
};

export default SkillsPage;
