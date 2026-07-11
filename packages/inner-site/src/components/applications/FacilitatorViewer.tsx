import React, { useState } from 'react';
import Window from '../os/Window';

export interface FacilitatorViewerProps extends WindowAppProps {}

const FacilitatorViewer: React.FC<FacilitatorViewerProps> = (props) => {
    const [width, setWidth] = useState(700);
    const [height, setHeight] = useState(560);

    return (
        <Window
            top={40}
            left={100}
            width={width}
            height={height}
            windowTitle="r0x Facilitator"
            windowBarIcon="windowFacilitatorIcon"
            windowBarColor="#0d0d0d"
            closeWindow={props.onClose}
            onInteract={props.onInteract}
            minimizeWindow={props.onMinimize}
            onWidthChange={setWidth}
            onHeightChange={setHeight}
            bottomLeftText={'r0x Facilitator v1.0'}
        >
            <div style={styles.container}>
                <div style={styles.header}>
                    <span style={styles.headerTitle}>x402 FACILITATOR</span>
                    <span style={styles.headerStatus}>
                        <span style={styles.statusDot}>●</span> ONLINE
                    </span>
                </div>

                <div style={styles.body}>
                    <p style={styles.paragraph}>
                        r0x runs its own <b style={styles.bold}>self-hosted x402 facilitator</b> — no
                        third-party facilitator (Coinbase CDP, PayAI) supports Robinhood Chain yet, so
                        r0x verifies and settles every payment itself.
                    </p>

                    <div style={styles.grid}>
                        <div style={styles.statCard}>
                            <span style={styles.statLabel}>NETWORK</span>
                            <span style={styles.statValue}>Robinhood Chain</span>
                        </div>
                        <div style={styles.statCard}>
                            <span style={styles.statLabel}>SCHEME</span>
                            <span style={styles.statValue}>exact (EIP-3009)</span>
                        </div>
                        <div style={styles.statCard}>
                            <span style={styles.statLabel}>ASSET</span>
                            <span style={styles.statValue}>USDG</span>
                        </div>
                        <div style={styles.statCard}>
                            <span style={styles.statLabel}>MODE</span>
                            <span style={styles.statValue}>Self-Hosted</span>
                        </div>
                    </div>

                    <p style={styles.sectionTitle}>HOW IT WORKS</p>
                    <div style={styles.stepList}>
                        <div style={styles.step}>
                            <span style={styles.stepNum}>01</span>
                            <span style={styles.stepText}>
                                Client requests a paywalled skill and receives a 402 challenge.
                            </span>
                        </div>
                        <div style={styles.step}>
                            <span style={styles.stepNum}>02</span>
                            <span style={styles.stepText}>
                                Client signs an EIP-3009 transfer and retries with a{' '}
                                <code style={styles.code}>PAYMENT-SIGNATURE</code> header.
                            </span>
                        </div>
                        <div style={styles.step}>
                            <span style={styles.stepNum}>03</span>
                            <span style={styles.stepText}>
                                The facilitator verifies the signature and settles the transfer on-chain.
                            </span>
                        </div>
                        <div style={styles.step}>
                            <span style={styles.stepNum}>04</span>
                            <span style={styles.stepText}>
                                Once settled, the skill server returns the requested data.
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Window>
    );
};

const styles: StyleSheetCSS = {
    container: {
        flex: 1,
        backgroundColor: '#0d0d0d',
        flexDirection: 'column',
        overflow: 'auto',
    },
    header: {
        padding: '8px 16px',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #333',
    },
    headerTitle: {
        color: '#CEF506',
        fontFamily: 'monospace',
        fontSize: 11,
        letterSpacing: 2,
    },
    headerStatus: {
        color: '#00ff88',
        fontFamily: 'monospace',
        fontSize: 11,
    },
    statusDot: {
        color: '#00ff88',
        marginRight: 4,
        fontSize: 8,
    },
    body: {
        flexDirection: 'column',
        padding: '16px 20px',
    },
    paragraph: {
        fontFamily: 'monospace',
        fontSize: 12,
        lineHeight: '18px',
        color: '#ccc',
        marginBottom: 20,
    },
    bold: {
        color: '#fff',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flexDirection: 'column',
        border: '1px solid #222',
        backgroundColor: '#111',
        padding: '10px 12px',
        borderRadius: 4,
    },
    statLabel: {
        color: '#666',
        fontFamily: 'monospace',
        fontSize: 9,
        letterSpacing: 1,
        marginBottom: 4,
    },
    statValue: {
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: 13,
        fontWeight: 'bold',
    },
    sectionTitle: {
        color: '#666',
        fontFamily: 'monospace',
        fontSize: 10,
        letterSpacing: 1,
        marginBottom: 10,
    },
    stepList: {
        flexDirection: 'column',
        gap: 10,
    },
    step: {
        alignItems: 'flex-start',
        gap: 10,
    },
    stepNum: {
        color: '#CEF506',
        fontFamily: 'monospace',
        fontSize: 11,
        fontWeight: 'bold',
        minWidth: 22,
    },
    stepText: {
        color: '#bbb',
        fontFamily: 'monospace',
        fontSize: 11,
        lineHeight: '16px',
        flex: 1,
    },
    code: {
        color: '#CEF506',
        fontFamily: 'monospace',
        fontSize: 11,
    },
};

export default FacilitatorViewer;
