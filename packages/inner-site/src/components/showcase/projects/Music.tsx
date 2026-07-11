import React from 'react';
import ResumeDownload from '../ResumeDownload';

export interface X402PageProps {}

const X402Page: React.FC<X402PageProps> = (props) => {
    return (
        <div className="site-page-content">
            <div style={styles.headerContainer}>
                <div style={styles.header}>
                    <div style={styles.headerRow}>
                        <h1>x402</h1>
                        <div style={styles.badge}>
                            <span style={styles.badgeText}>PAYMENT</span>
                        </div>
                    </div>
                    <div style={styles.headerRow}>
                        <h3>HTTP 402 Payments</h3>
                    </div>
                </div>
            </div>
            <div className="text-block">
                <p>
                    x402 uses the HTTP 402 status code to gate API endpoints
                    behind on-chain payments. When a server responds with 402
                    it includes structured payment requirements. The client
                    signs a USDG transfer and retries with proof attached.
                    No accounts, no API keys. r0x runs x402 protocol v2 with a
                    self-hosted facilitator, since no third-party facilitator
                    supports Robinhood Chain yet.
                </p>
            </div>

            {/* PROTOCOL FLOW */}
            <div style={styles.headerContainer}>
                <div style={styles.header}>
                    <div style={styles.headerRow}>
                        <h2>Protocol Flow (v2)</h2>
                    </div>
                </div>
            </div>
            <div className="text-block">
                <pre style={styles.codeBlock}>
{`CLIENT                                SERVER
  │                                      │
  │── GET /skill/balance/0xABC... ─────▶│
  │                                      │
  │◀── 402 Payment Required ───────────│
  │    PAYMENT-REQUIRED: base64({        │
  │      x402Version: 2,                 │
  │      resource: { url, description }, │
  │      accepts: [{                     │
  │        scheme: "exact",              │
  │        network: "eip155:4663",       │
  │        amount: "10000",              │
  │        asset: "0x5fc536...d168",     │
  │        payTo: "0x101C...0acf",       │
  │        maxTimeoutSeconds: 900,       │
  │        extra: { name, version }      │
  │      }]                              │
  │    })                                │
  │                                      │
  │  [wallet signs EIP-3009 transfer]    │
  │                                      │
  │── GET /skill/balance/0xABC... ─────▶│
  │   PAYMENT-SIGNATURE: base64({        │
  │     x402Version: 2,                  │
  │     resource, accepted,              │
  │     payload: { signature, auth }     │
  │   })                                 │
  │                                      │
  │◀── 200 OK ─────────────────────────│
  │    PAYMENT-RESPONSE: base64({...})   │
  │    { "eth": "0.042", "usdg": "12" }  │`}
                </pre>
            </div>

            {/* HOW IT WORKS */}
            <div style={styles.headerContainer}>
                <div style={styles.header}>
                    <div style={styles.headerRow}>
                        <h2>How r0x Uses x402</h2>
                    </div>
                </div>
            </div>
            <div className="text-block">
                <p>
                    Every r0x skill endpoint is protected by
                    @x402/express middleware backed by r0x's own facilitator.
                    Here is the step-by-step flow for a real request.
                </p>
                <br />
                <div style={styles.stepCard}>
                    <div style={styles.stepNumber}>
                        <h3>1</h3>
                    </div>
                    <div style={styles.stepContent}>
                        <h3>Initial Request</h3>
                        <p>
                            The client calls a skill endpoint with no payment.
                            The middleware intercepts and returns HTTP 402 with
                            a PAYMENT-REQUIRED header containing the payment
                            requirements: amount, asset (USDG), network
                            (Robinhood Chain, eip155:4663) and payTo address.
                        </p>
                    </div>
                </div>
                <div style={styles.stepCard}>
                    <div style={styles.stepNumber}>
                        <h3>2</h3>
                    </div>
                    <div style={styles.stepContent}>
                        <h3>Wallet Signature</h3>
                        <p>
                            The client constructs an EIP-3009
                            TransferWithAuthorization typed data object and
                            signs it with eth_signTypedData_v4. This
                            authorizes a $0.01 USDG transfer from the user
                            to the payTo address on Robinhood Chain.
                        </p>
                    </div>
                </div>
                <div style={styles.stepCard}>
                    <div style={styles.stepNumber}>
                        <h3>3</h3>
                    </div>
                    <div style={styles.stepContent}>
                        <h3>Payment Verification &amp; Settlement</h3>
                        <p>
                            The client retries the same request with a
                            PAYMENT-SIGNATURE header containing a base64-encoded
                            JSON payload (signature + authorization params).
                            r0x's self-hosted facilitator verifies the signature,
                            settles the transferWithAuthorization call on-chain
                            using its own gas wallet, then the server returns
                            the skill result.
                        </p>
                    </div>
                </div>
            </div>

            {/* PAYMENT-SIGNATURE HEADER */}
            <div style={styles.headerContainer}>
                <div style={styles.header}>
                    <div style={styles.headerRow}>
                        <h2>PAYMENT-SIGNATURE Header Format</h2>
                    </div>
                </div>
            </div>
            <div className="text-block">
                <pre style={styles.codeBlock}>
{`// The PAYMENT-SIGNATURE header is a base64-encoded JSON string:
{
  "x402Version": 2,
  "resource": { "url": "https://projectr0x.dev/skill/balance/0x..." },
  "accepted": {
    "scheme": "exact",
    "network": "eip155:4663",
    "asset": "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
    "amount": "10000",
    "payTo": "0x101Cd32b...0acf",
    "maxTimeoutSeconds": 900,
    "extra": { "name": "Global Dollar", "version": "1" }
  },
  "payload": {
    "signature": "0xABC...DEF",
    "authorization": {
      "from": "0xUSER_ADDRESS",
      "to": "0x101Cd32b...0acf",
      "value": "10000",
      "validAfter": "0",
      "validBefore": "1738000900",
      "nonce": "0xRANDOM_32_BYTES"
    }
  }
}

// Sent as:
// PAYMENT-SIGNATURE: eyJ4NDAyVmVyc2lvbiI6Mixi...`}
                </pre>
            </div>

            {/* SERVER SETUP */}
            <div style={styles.headerContainer}>
                <div style={styles.header}>
                    <div style={styles.headerRow}>
                        <h2>Server Setup</h2>
                    </div>
                </div>
            </div>
            <div className="text-block">
                <p>
                    On the server side, a single middleware call protects
                    all routes, backed by a self-hosted resource server +
                    facilitator. Bracket syntax marks dynamic segments.
                </p>
                <br />
                <pre style={styles.codeBlock}>
{`const { paymentMiddleware } = require('@x402/express');
// resourceServer wraps a self-hosted x402Facilitator, see the
// "Server: Self-Hosted Facilitator" section on the Developers page.

app.use(
  paymentMiddleware(
    {
      'GET /balance/[address]': {
        accepts: { scheme: 'exact', network: 'eip155:4663', payTo, price: usdgPrice(0.01) },
      },
      'POST /chat': {
        accepts: { scheme: 'exact', network: 'eip155:4663', payTo, price: usdgPrice(0.01) },
      },
    },
    resourceServer,
  )
);`}
                </pre>
            </div>

            {/* NETWORK */}
            <div style={styles.headerContainer}>
                <div style={styles.header}>
                    <div style={styles.headerRow}>
                        <h2>Network</h2>
                    </div>
                </div>
            </div>
            <div className="text-block">
                <div style={styles.networkCard}>
                    <h3>Robinhood Chain</h3>
                    <p>
                        All r0x skills settle on Robinhood Chain (chain ID 4663,
                        an Arbitrum Orbit L2). USDG (Global Dollar) contract:
                        0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168 (6 decimals).
                        No managed facilitator supports this chain yet, so r0x
                        verifies and settles its own payments.
                    </p>
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
    stepCard: {
        marginBottom: 16,
        padding: 16,
        border: '1px solid #ccc',
        backgroundColor: '#f8f8f8',
    },
    stepNumber: {
        marginRight: 16,
        minWidth: 30,
        color: '#1F1B10',
    },
    stepContent: {
        flexDirection: 'column',
        flex: 1,
    },
    networkCard: {
        padding: 12,
        marginBottom: 8,
        border: '1px solid #ccc',
        flexDirection: 'column',
    },
};

export default X402Page;
