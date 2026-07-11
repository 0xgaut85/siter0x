import React from 'react';
import ResumeDownload from '../ResumeDownload';

export interface ERC8004PageProps {}

const ERC8004Page: React.FC<ERC8004PageProps> = (props) => {
    return (
        <div className="site-page-content">
            <div style={styles.headerContainer}>
                <div style={styles.header}>
                    <div style={styles.headerRow}>
                        <h1>ERC-8004</h1>
                        <div style={styles.badge}>
                            <span style={styles.badgeText}>ROADMAP</span>
                        </div>
                    </div>
                    <div style={styles.headerRow}>
                        <h3>Agent Identity (Planned)</h3>
                    </div>
                </div>
            </div>
            <div className="text-block">
                <p>
                    ERC-8004 is a proposed Ethereum standard for on-chain
                    identity and trust scoring of autonomous agents. It is
                    not yet in production. This page describes how it would
                    fit into the existing r0x stack.
                </p>
            </div>

            {/* STATUS */}
            <div style={styles.headerContainer}>
                <div style={styles.header}>
                    <div style={styles.headerRow}>
                        <h2>Current Status</h2>
                    </div>
                </div>
            </div>
            <div className="text-block">
                <div style={styles.statusCard}>
                    <p>
                        <b>Not in production.</b> r0x currently uses x402
                        for payments and plain HTTP skills for discovery. Both
                        are live on Robinhood Chain, self-facilitated since no
                        third-party facilitator supports the chain yet.
                        ERC-8004 is the planned third layer that would add
                        identity verification and trust scoring to the stack.
                    </p>
                </div>
            </div>

            {/* CONCEPT */}
            <div style={styles.headerContainer}>
                <div style={styles.header}>
                    <div style={styles.headerRow}>
                        <h2>What It Would Do</h2>
                    </div>
                </div>
            </div>
            <div className="text-block">
                <p>
                    Right now any wallet with USDG can call a r0x skill.
                    ERC-8004 would add a trust layer on top of that.
                </p>
                <br />
                <div style={styles.conceptCard}>
                    <h3 style={styles.conceptTitle}>Agent Registration</h3>
                    <p>
                        Agents register on-chain with an identity record
                        that includes their address, capabilities and a
                        starting trust score. This makes them discoverable
                        to other agents.
                    </p>
                </div>
                <div style={styles.conceptCard}>
                    <h3 style={styles.conceptTitle}>Trust Scoring</h3>
                    <p>
                        Each completed transaction updates the agent's trust
                        score. Reliable agents earn higher scores over time.
                        Skill providers could set minimum trust thresholds
                        for access.
                    </p>
                </div>
                <div style={styles.conceptCard}>
                    <h3 style={styles.conceptTitle}>Dynamic Pricing</h3>
                    <p>
                        Trust scores could influence pricing. Higher trust
                        agents might get lower fees. New or low-trust
                        agents might pay a premium or require escrow.
                    </p>
                </div>
            </div>

            {/* HOW IT FITS */}
            <div style={styles.headerContainer}>
                <div style={styles.header}>
                    <div style={styles.headerRow}>
                        <h2>How It Fits the Stack</h2>
                    </div>
                </div>
            </div>
            <div className="text-block">
                <pre style={styles.codeBlock}>
{`┌──────────────────────────────────────┐
│             r0x STACK                │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  ERC-8004  (planned)           │  │
│  │  Identity + Trust Scoring      │  │
│  └────────────┬───────────────────┘  │
│               │                      │
│  ┌────────────▼───────────────────┐  │
│  │  x402 v2  (live, self-hosted)  │  │
│  │  HTTP 402 USDG Payments        │  │
│  └────────────┬───────────────────┘  │
│               │                      │
│  ┌────────────▼───────────────────┐  │
│  │  r0x Skills  (live)             │  │
│  │  Skill Discovery + Execution   │  │
│  └────────────────────────────────┘  │
│                                      │
│  Network: Robinhood Chain (4663)     │
└──────────────────────────────────────┘`}
                </pre>
            </div>

            <div className="text-block">
                <p>
                    When ERC-8004 ships, it would sit above x402 in the
                    stack. Before processing a payment the middleware would
                    check the caller's trust score against the skill's
                    minimum threshold. Everything below (x402 payment,
                    skill execution) stays the same.
                </p>
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
    statusCard: {
        padding: 16,
        border: '2px solid #1F1B10',
        backgroundColor: '#f8ffe0',
        flexDirection: 'column',
        marginBottom: 16,
    },
    conceptCard: {
        marginBottom: 16,
        padding: 16,
        border: '1px solid #ccc',
        backgroundColor: '#f8f8f8',
        flexDirection: 'column',
    },
    conceptTitle: {
        color: '#1F1B10',
        marginBottom: 8,
    },
    codeBlock: {
        fontFamily: 'monospace',
        fontSize: 11,
        lineHeight: 1.4,
        backgroundColor: '#1a1a1a',
        color: '#CEF506',
        padding: 16,
        overflow: 'auto',
        whiteSpace: 'pre',
        border: '1px solid #333',
    },
};

export default ERC8004Page;
