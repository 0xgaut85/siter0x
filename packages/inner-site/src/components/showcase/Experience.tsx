import React from 'react';
import ResumeDownload from './ResumeDownload';

export interface ArchitectureProps {}

const Architecture: React.FC<ArchitectureProps> = (props) => {
    return (
        <div className="site-page-content">
            <div style={styles.headerContainer}>
                <div style={styles.header}>
                    <div style={styles.headerRow}>
                        <h1>Architecture</h1>
                    </div>
                    <div style={styles.headerRow}>
                        <h3>Three-Layer System Design</h3>
                    </div>
                </div>
            </div>
            <div className="text-block">
                <p>
                    r0x is organized around three discrete functional layers
                    that together form the USDG-native operating system for
                    AI agents on Robinhood Chain. Each layer is responsible
                    for a clearly defined stage of the economic execution
                    cycle. Capability discovery, payment verification and
                    execution invocation happen atomically and reliably.
                </p>
            </div>

            {/* LAYER 1 */}
            <div style={styles.layerCard}>
                <div style={styles.layerHeader}>
                    <div style={styles.layerBadge}>
                        <h3 style={styles.layerBadgeText}>LAYER 1</h3>
                    </div>
                    <h2 style={styles.layerTitle}>Capability Gateway</h2>
                </div>
                <div style={styles.layerContent}>
                    <p>
                        The Capability Gateway Layer is the entry point for all
                        economic execution requests. It handles:
                    </p>
                    <br />
                    <ul style={styles.featureList}>
                        <li style={styles.featureItem}>
                            <b>Service Discovery</b>: agents discover available
                            capabilities through a unified registry. Each
                            capability publishes its interface, pricing model
                            and trust requirements.
                        </li>
                        <li style={styles.featureItem}>
                            <b>Price Negotiation</b>: dynamic pricing based on
                            resource demand, execution complexity and real-time
                            market conditions.
                        </li>
                        <li style={styles.featureItem}>
                            <b>Request Routing</b>: incoming capability
                            requests are validated, normalized and routed to
                            the appropriate execution provider.
                        </li>
                        <li style={styles.featureItem}>
                            <b>Rate Limiting & Access Control</b>: policy-based
                            access control ensures that only authorized agents
                            with sufficient trust scores can invoke capabilities.
                        </li>
                    </ul>
                </div>
            </div>

            {/* LAYER 2 */}
            <div style={styles.layerCard}>
                <div style={styles.layerHeader}>
                    <div style={styles.layerBadge}>
                        <h3 style={styles.layerBadgeText}>LAYER 2</h3>
                    </div>
                    <h2 style={styles.layerTitle}>Payment Verification</h2>
                </div>
                <div style={styles.layerContent}>
                    <p>
                        The Payment Verification Layer ensures that value
                        exchange happens correctly and securely within the
                        execution flow:
                    </p>
                    <br />
                    <ul style={styles.featureList}>
                        <li style={styles.featureItem}>
                            <b>x402 Protocol Integration</b>: implements the
                            HTTP 402 Payment Required standard for seamless
                            machine-to-machine payment negotiation.
                        </li>
                        <li style={styles.featureItem}>
                            <b>Payment Authorization</b>: automatic evaluation
                            of spending policies, budget constraints and
                            per-transaction limits before authorizing payment.
                        </li>
                        <li style={styles.featureItem}>
                            <b>Settlement Verification</b>: cryptographic
                            verification of payment completion before execution
                            proceeds.
                        </li>
                        <li style={styles.featureItem}>
                            <b>Escrow & Dispute Resolution</b>: optional escrow
                            mechanisms for high-value transactions with
                            built-in dispute resolution paths.
                        </li>
                    </ul>
                </div>
            </div>

            {/* LAYER 3 */}
            <div style={styles.layerCard}>
                <div style={styles.layerHeader}>
                    <div style={styles.layerBadge}>
                        <h3 style={styles.layerBadgeText}>LAYER 3</h3>
                    </div>
                    <h2 style={styles.layerTitle}>Invocation Runtime</h2>
                </div>
                <div style={styles.layerContent}>
                    <p>
                        The Invocation Runtime Layer handles the actual
                        execution of capabilities after payment is verified:
                    </p>
                    <br />
                    <ul style={styles.featureList}>
                        <li style={styles.featureItem}>
                            <b>Execution Orchestration</b>: manages the
                            lifecycle of capability invocations including
                            initialization, execution and result delivery.
                        </li>
                        <li style={styles.featureItem}>
                            <b>Observability</b>: full execution tracing with
                            cost attribution, latency measurement and audit
                            logging for every transaction.
                        </li>
                        <li style={styles.featureItem}>
                            <b>Error Recovery</b>: automatic retry with
                            payment rollback on execution failure. Partial
                            execution refunds are handled transparently.
                        </li>
                        <li style={styles.featureItem}>
                            <b>Result Caching</b>: intelligent caching of
                            execution results to reduce cost for repeated
                            capability invocations.
                        </li>
                    </ul>
                </div>
            </div>

            {/* FLOW DIAGRAM */}
            <div style={styles.headerContainer}>
                <div style={styles.header}>
                    <div style={styles.headerRow}>
                        <h1>Execution Flow</h1>
                    </div>
                </div>
            </div>
            <div className="text-block">
                <pre style={styles.diagram}>
{`  ┌───────────────────────────────────────┐
  │         AGENT / SYSTEM                │
  │   Issues capability request           │
  └──────────────────┬────────────────────┘
                     │
                     ▼
  ┌───────────────────────────────────────┐
  │    LAYER 1: CAPABILITY GATEWAY        │
  │  - Discover capability                │
  │  - Validate request                   │
  │  - Resolve pricing                    │
  └──────────────────┬────────────────────┘
                     │
                     ▼
  ┌───────────────────────────────────────┐
  │   LAYER 2: PAYMENT VERIFICATION       │
  │  - Evaluate spending policy           │
  │  - Authorize payment (x402)           │
  │  - Verify settlement                  │
  └──────────────────┬────────────────────┘
                     │
                     ▼
  ┌───────────────────────────────────────┐
  │    LAYER 3: INVOCATION RUNTIME        │
  │  - Execute capability                 │
  │  - Record observability data          │
  │  - Return result to caller            │
  └───────────────────────────────────────┘`}
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
    layerCard: {
        marginBottom: 24,
        border: '1px solid #ccc',
        flexDirection: 'column',
    },
    layerHeader: {
        padding: 16,
        backgroundColor: '#f0f0f0',
        alignItems: 'center',
        borderBottom: '1px solid #ccc',
    },
    layerBadge: {
        backgroundColor: '#CEF506',
        padding: '4px 12px',
        marginRight: 16,
    },
    layerBadgeText: {
        color: '#1F1B10',
        fontSize: 11,
        letterSpacing: 1,
    },
    layerTitle: {
        fontSize: 20,
    },
    layerContent: {
        padding: 16,
        flexDirection: 'column',
    },
    featureList: {
        flexDirection: 'column',
        paddingLeft: 16,
    },
    featureItem: {
        marginBottom: 12,
        lineHeight: 1.5,
    },
    diagram: {
        fontFamily: 'monospace',
        fontSize: 11,
        lineHeight: 1.4,
        backgroundColor: '#1a1a1a',
        color: '#CEF506',
        padding: 16,
        overflow: 'auto',
        whiteSpace: 'pre',
    },
};

export default Architecture;
