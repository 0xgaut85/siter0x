import React from 'react';
import ResumeDownload from './ResumeDownload';

export interface DevelopersProps {}

const Developers: React.FC<DevelopersProps> = (props) => {
    return (
        <div className="site-page-content">
            <div style={styles.headerContainer}>
                <div style={styles.header}>
                    <div style={styles.headerRow}>
                        <h1>Developers</h1>
                    </div>
                    <div style={styles.headerRow}>
                        <h3>The USDG-Native OS for AI Agents</h3>
                    </div>
                </div>
            </div>

            {/* GETTING STARTED */}
            <div className="text-block">
                <h2>Getting Started</h2>
                <br />
                <p>
                    r0x is building economic execution infrastructure on{' '}
                    <b>Robinhood Chain</b> (chain ID 4663). We expose
                    on-chain intelligence and AI skills as paywalled HTTP
                    endpoints. Every call costs <b>$0.01 USDG</b> and is
                    gated via the <b>x402</b> protocol. No API keys, no
                    subscriptions. Just a wallet signature per request.
                </p>
                <br />
                <p>
                    r0x runs the <b>official x402 facilitator</b> for Robinhood Chain,
                    using <b>@x402/express</b> middleware (x402 protocol v2). Every
                    payment is verified and settled in-process, so any agent can call a
                    skill and get a result in one round trip. Clients receive a{' '}
                    <code style={styles.inlineCode}>402 Payment Required</code>{' '}
                    response with a <code style={styles.inlineCode}>PAYMENT-REQUIRED</code> header,
                    sign an EIP-3009 <code style={styles.inlineCode}>TransferWithAuthorization</code>,
                    and retry with the <code style={styles.inlineCode}>PAYMENT-SIGNATURE</code> header.
                </p>
            </div>

            {/* LIVE ENDPOINTS */}
            <div style={styles.headerContainer}>
                <div style={styles.header}>
                    <div style={styles.headerRow}>
                        <h2>Live Endpoints</h2>
                    </div>
                </div>
            </div>
            <div className="text-block">
                <p>
                    All endpoints are live at{' '}
                    <code style={styles.inlineCode}>https://projectr0x.dev/skill/</code>.
                    Browse the free catalog at{' '}
                    <a href="https://projectr0x.dev/skill/catalog" target="_blank" rel="noopener noreferrer" style={styles.link}>
                        /skill/catalog
                    </a>.
                </p>
                <br />
                <div style={styles.endpointTable}>
                    <div style={styles.endpointHeader}>
                        <span style={{ ...styles.endpointCell, flex: 2.5 }}>Endpoint</span>
                        <span style={{ ...styles.endpointCell, flex: 0.7 }}>Method</span>
                        <span style={{ ...styles.endpointCell, flex: 0.7 }}>Price</span>
                        <span style={{ ...styles.endpointCell, flex: 3 }}>Description</span>
                    </div>
                    {[
                        { path: '/skill/balance/:address', method: 'GET', desc: 'ETH + USDG balances for any Robinhood Chain address' },
                        { path: '/skill/tx/:hash', method: 'GET', desc: 'Decoded transaction details for any Robinhood Chain tx' },
                        { path: '/skill/price/:token', method: 'GET', desc: 'Current USD price for ETH or USDG' },
                        { path: '/skill/wallet/generate', method: 'GET', desc: 'Generate a fresh Robinhood Chain wallet keypair' },
                        { path: '/skill/chat', method: 'POST', desc: 'Chat with the r0x AI Agent' },
                        { path: '/skill/send', method: 'POST', desc: 'Construct unsigned ETH or USDG transfer tx' },
                        { path: '/skill/fund/:address', method: 'GET', desc: 'Wallet balance + funding instructions' },
                        { path: '/skill/broadcast', method: 'POST', desc: 'Sign and broadcast a transaction' },
                    ].map((ep, i) => (
                        <div key={i} style={i % 2 === 0 ? styles.endpointRow : styles.endpointRowAlt}>
                            <code style={{ ...styles.endpointCell, flex: 2.5, fontSize: 10, color: '#00ff88' }}>{ep.path}</code>
                            <span style={{ ...styles.endpointCell, flex: 0.7 }}>{ep.method}</span>
                            <span style={{ ...styles.endpointCell, flex: 0.7 }}>$0.01</span>
                            <span style={{ ...styles.endpointCell, flex: 3 }}>{ep.desc}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* TRY IT: TEST TRANSACTION */}
            <div style={styles.headerContainer}>
                <div style={styles.header}>
                    <div style={styles.headerRow}>
                        <h2>Use the Facilitator</h2>
                    </div>
                </div>
            </div>
            <div className="text-block">
                <p>
                    Any agent with a wallet holding a small amount of{' '}
                    <b>USDG on Robinhood Chain</b> can call a skill directly
                    through the official r0x facilitator, right now. Get USDG
                    via{' '}
                    <a href="https://across.to" target="_blank" rel="noopener noreferrer" style={styles.link}>
                        Across
                    </a>{' '}
                    (bridges funds from 13 chains and delivers USDG directly)
                    or see the{' '}
                    <a href="https://docs.robinhood.com/chain/bridging/" target="_blank" rel="noopener noreferrer" style={styles.link}>
                        full bridging options
                    </a>.
                </p>
                <br />
                <p>
                    The script below signs an EIP-3009{' '}
                    <code style={styles.inlineCode}>TransferWithAuthorization</code>{' '}
                    and lets the r0x facilitator verify and settle it
                    on-chain — the same flow described above. It's checked
                    into the repo at{' '}
                    <code style={styles.inlineCode}>packages/api/scripts/test-transaction.js</code>,
                    and ships standalone in the{' '}
                    <b>r0x-os</b> SDK.
                </p>
                <br />
                <pre style={styles.codeBlock}>
{`PAYER_PRIVATE_KEY=0xyour-payer-wallet-key \\
  node packages/api/scripts/test-transaction.js \\
  https://projectr0x.dev/skill/price/ETH

# [1/4] Payer wallet: 0x...
# [1/4] Calling https://projectr0x.dev/skill/price/ETH with no payment...
# [2/4] Got 402. Price: 10000 atomic units of Global Dollar on eip155:4663
# [2/4] payTo: 0x101Cd32b9bEEE93845Ead7Bc604a5F1873330acf
# [3/4] Signing EIP-3009 TransferWithAuthorization...
# [4/4] Retrying with PAYMENT-SIGNATURE header (this settles on-chain)...
#
# ✅ Payment settled.
# Settlement receipt: { success: true, transaction: '0x...', network: 'eip155:4663' }
# Response body: { token: 'ETH', usd: 3842.11, ... }`}
                </pre>
                <br />
                <p style={{ opacity: 0.7, fontSize: 12 }}>
                    The script targets <code style={styles.inlineCode}>/skill/price/ETH</code>{' '}
                    by default (cheapest endpoint to test with, $0.01). Pass
                    any live endpoint URL as the first argument. Source: the
                    same request/sign/retry logic used by the SDK and this
                    site's own wallet integration.
                </p>
            </div>

            {/* SERVER EXAMPLE */}
            <div style={styles.headerContainer}>
                <div style={styles.header}>
                    <div style={styles.headerRow}>
                        <h2>Server: The r0x Facilitator</h2>
                    </div>
                </div>
            </div>
            <div className="text-block">
                <p>
                    r0x is the official x402 facilitator for Robinhood Chain, built on{' '}
                    <code style={styles.inlineCode}>@x402/core</code>,{' '}
                    <code style={styles.inlineCode}>@x402/evm</code> and{' '}
                    <code style={styles.inlineCode}>@x402/express</code>. A dedicated gas
                    wallet signs and submits settlement transactions directly, so any
                    agent or client can call it right now.
                </p>
                <br />
                <pre style={styles.codeBlock}>
{`const { paymentMiddleware } = require('@x402/express');
const { x402ResourceServer } = require('@x402/core/server');
const { x402Facilitator } = require('@x402/core/facilitator');
const { ExactEvmScheme } = require('@x402/evm/exact/server');
const { registerExactEvmScheme } = require('@x402/evm/exact/facilitator');
const { toFacilitatorEvmSigner } = require('@x402/evm');
const { createWalletClient, http, publicActions } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

const payTo   = '0x101C...0acf';           // your USDG receive address
const network = 'eip155:4663';             // Robinhood Chain (CAIP-2)

const gasWallet = privateKeyToAccount(process.env.EVM_PRIVATE_KEY);
const walletClient = createWalletClient({
  account: gasWallet, chain: robinhoodChain, transport: http(RPC_URL),
}).extend(publicActions);

const facilitator = new x402Facilitator();
registerExactEvmScheme(facilitator, {
  signer: toFacilitatorEvmSigner({ ...walletClient, address: gasWallet.address }),
  networks: network,
});
const resourceServer = new x402ResourceServer(facilitator)
  .register(network, new ExactEvmScheme());

app.use(
  paymentMiddleware(
    {
      'GET /balance/[address]': {
        accepts: { scheme: 'exact', network, payTo, price: usdgPrice(0.01) },
        description: 'ETH + USDG balances',
      },
      'GET /wallet/generate': {
        accepts: { scheme: 'exact', network, payTo, price: usdgPrice(0.01) },
        description: 'Generate a Robinhood Chain keypair',
      },
      'POST /send': {
        accepts: { scheme: 'exact', network, payTo, price: usdgPrice(0.01) },
        description: 'Construct unsigned transfer tx',
      },
    },
    resourceServer,
  )
);

app.get('/balance/:address', async (req, res) => {
  // x402 payment already verified + settled at this point
  const balance = await getBalance(req.params.address);
  res.json(balance);
});

app.post('/send', async (req, res) => {
  const { to, amount, token } = req.body;
  const tx = constructTransfer(to, amount, token);
  res.json({ tx }); // client signs + broadcasts
});`}
                </pre>
            </div>

            {/* CLIENT EXAMPLE */}
            <div className="text-block">
                <h2>Client: x402 v2 Payment Flow</h2>
                <br />
                <pre style={styles.codeBlock}>
{`// 1. Make the initial request
const res = await fetch(
  'https://projectr0x.dev/skill/balance/0x...'
);

if (res.status === 402) {
  // 2. Decode the PAYMENT-REQUIRED header (base64 JSON challenge)
  const paymentRequired = JSON.parse(
    atob(res.headers.get('PAYMENT-REQUIRED'))
  );
  const requirements = paymentRequired.accepts[0];
  // { scheme: 'exact', network: 'eip155:4663', asset, amount, payTo, ... }

  // 3. Sign EIP-3009 TransferWithAuthorization
  const authorization = {
    from: walletAddress, to: requirements.payTo,
    value: requirements.amount, validAfter: '0',
    validBefore: String(Math.floor(Date.now() / 1000) + requirements.maxTimeoutSeconds),
    nonce: crypto.randomUUID(),
  };
  const signature = await ethereum.request({
    method: 'eth_signTypedData_v4',
    params: [walletAddress, JSON.stringify(typedData)],
  });

  // 4. Retry with the PAYMENT-SIGNATURE header
  const paid = await fetch(
    'https://projectr0x.dev/skill/balance/0x...', {
      headers: {
        'PAYMENT-SIGNATURE': btoa(JSON.stringify({
          x402Version: 2,
          resource: paymentRequired.resource,
          accepted: requirements,
          payload: { authorization, signature },
        })),
      },
    }
  );

  const data = await paid.json();
  // { balances: { ETH: "0.042", USDG: "12.50" } }
}`}
                </pre>
            </div>

            {/* SDK & PLUGIN */}
            <div style={styles.headerContainer}>
                <div style={styles.header}>
                    <div style={styles.headerRow}>
                        <h2>r0x OS SDK</h2>
                    </div>
                </div>
            </div>
            <div className="text-block">
                <p>
                    The <b>r0x-os</b> npm package handles x402 payment signing
                    automatically. Instead of building the 402 flow yourself,
                    install the SDK and call skill methods directly.
                </p>
                <br />
                <pre style={styles.codeBlock}>
{`npm install r0x-os`}
                </pre>
                <br />
                <pre style={styles.codeBlock}>
{`import { R0xClient } from 'r0x-os';

const client = new R0xClient({
  privateKey: process.env.R0X_PRIVATE_KEY,
});

// check ETH price ($0.01 USDG per call)
const { data: price } = await client.price('ETH');

// send USDG to an address
const { data: sendTx } = await client.send(
  '0xRecipient...', '10', 'USDG'
);

// fetch decoded transaction details
const { data: tx } = await client.tx('0x...');`}
                </pre>
            </div>

            {/* CLAUDE CODE PLUGIN */}
            <div style={styles.headerContainer}>
                <div style={styles.header}>
                    <div style={styles.headerRow}>
                        <h2>Claude Code Plugin</h2>
                    </div>
                </div>
            </div>
            <div className="text-block">
                <p>
                    r0x OS ships as a Claude Code plugin. Install it and
                    your agent gets access to all eight skills as MCP tools.
                </p>
                <br />
                <pre style={styles.codeBlock}>
{`/plugin marketplace add nhevers/project-r0x
/plugin install r0x-os`}
                </pre>
                <br />
                <p>
                    No private key is needed upfront. On first use the agent
                    calls <code style={styles.inlineCode}>r0x_setup</code> to
                    either import an existing wallet or generate a fresh one.
                    After setup, all nine tools are available: balance, tx, price,
                    wallet, chat, send, fund, broadcast and spend_limit.
                    (<code style={styles.inlineCode}>trade</code> is temporarily disabled,
                    since no DEX aggregator supports Robinhood Chain yet.)
                </p>
                <br />
                <p>
                    The plugin can also be added via the MCP protocol directly:
                </p>
                <br />
                <pre style={styles.codeBlock}>
{`claude mcp add r0x -- npx r0x-os`}
                </pre>
            </div>

            {/* COMMUNITY */}
            <div style={styles.headerContainer}>
                <div style={styles.header}>
                    <div style={styles.headerRow}>
                        <h1>Community</h1>
                    </div>
                </div>
            </div>
            <div className="text-block">
                <p>
                    Join the growing community of developers and autonomous
                    systems building on r0x.
                </p>
                <br />
                <div style={styles.socialLinks}>
                    <a
                        href="https://x.com/projectr0x"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.socialLink}
                    >
                        <div style={styles.socialCard}>
                            <h3>X / Twitter</h3>
                            <p>@projectr0x</p>
                        </div>
                    </a>
                    <div style={{ ...styles.socialCard, cursor: 'default' }}>
                        <h3>x402 Server</h3>
                        <p>Endpoint stats coming soon</p>
                    </div>
                    <a
                        href="https://github.com/nhevers/project-r0x"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.socialLink}
                    >
                        <div style={styles.socialCard}>
                            <h3>GitHub</h3>
                            <p>Source code, SDK and skill API</p>
                        </div>
                    </a>
                </div>
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
    codeBlock: {
        fontFamily: 'monospace',
        fontSize: 11,
        lineHeight: 1.5,
        backgroundColor: '#1a1a1a',
        color: '#00ff88',
        padding: 16,
        overflow: 'auto',
        whiteSpace: 'pre',
        border: '1px solid #333',
    },
    inlineCode: {
        fontFamily: 'monospace',
        fontSize: 11,
        backgroundColor: '#1a1a1a',
        color: '#00ff88',
        padding: '1px 5px',
        border: '1px solid #333',
    },
    link: {
        color: '#1F1B10',
        textDecoration: 'underline',
    },
    endpointTable: {
        flexDirection: 'column',
        border: '1px solid #ccc',
        width: '100%',
        overflow: 'auto',
    },
    endpointHeader: {
        display: 'flex',
        backgroundColor: '#222',
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 11,
        fontFamily: 'monospace',
    },
    endpointRow: {
        display: 'flex',
        backgroundColor: '#f8f8f8',
        fontSize: 11,
        fontFamily: 'monospace',
    },
    endpointRowAlt: {
        display: 'flex',
        backgroundColor: '#eee',
        fontSize: 11,
        fontFamily: 'monospace',
    },
    endpointCell: {
        padding: '8px 10px',
        borderRight: '1px solid #ccc',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    socialLinks: {
        flexDirection: 'column',
    },
    socialLink: {
        textDecoration: 'none',
        color: 'inherit',
    },
    socialCard: {
        padding: 16,
        marginBottom: 12,
        border: '1px solid #ccc',
        flexDirection: 'column',
        backgroundColor: '#f8f8f8',
        cursor: 'pointer',
    },
};

export default Developers;
