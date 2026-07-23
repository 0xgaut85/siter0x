import React, { useState } from 'react';
import Window from '../os/Window';

export interface TradingViewerProps extends WindowAppProps {}

interface TradingPosition {
    asset: string;
    side: 'LONG' | 'SHORT';
    entry: string;
    current: string;
    pnl: string;
    thesis: string;
}

interface YieldPosition {
    pool: string;
    deposited: string;
    apy: string;
    rewards: string;
    thesis: string;
}

const TRADING_POSITIONS: TradingPosition[] = [];
const YIELD_POSITIONS: YieldPosition[] = [];

const TradingViewer: React.FC<TradingViewerProps> = (props) => {
    const [width, setWidth] = useState(800);
    const [height, setHeight] = useState(620);

    return (
        <Window
            top={36}
            left={90}
            width={width}
            height={height}
            windowTitle="r0x Trading"
            windowBarIcon="windowTradingIcon"
            windowBarColor="#0d0d0d"
            closeWindow={props.onClose}
            onInteract={props.onInteract}
            minimizeWindow={props.onMinimize}
            onWidthChange={setWidth}
            onHeightChange={setHeight}
            bottomLeftText={'r0x Trading v0.1 : autonomous agent dashboard'}
        >
            <div style={styles.container}>
                <div style={styles.header}>
                    <span style={styles.headerTitle}>R0X TRADING</span>
                    <span style={styles.headerStatus}>
                        <span style={styles.statusDot}>{'\u25CF'}</span> PRE-LAUNCH
                    </span>
                </div>

                <p style={styles.subtitle}>
                    Autonomous onchain agent that trades and yield farms on its own, built on
                    the Robinhood agent kit and settling every action through our own x402
                    infra. Dashboard is live, agent capital has not been deployed yet.
                </p>

                <div style={styles.statsBar}>
                    <div style={styles.statCard}>
                        <span style={styles.statLabel}>TOTAL PNL</span>
                        <span style={styles.statValue}>N/A</span>
                    </div>
                    <div style={styles.statCard}>
                        <span style={styles.statLabel}>PORTFOLIO VALUE</span>
                        <span style={styles.statValue}>$0.00</span>
                    </div>
                    <div style={styles.statCard}>
                        <span style={styles.statLabel}>BLENDED APY</span>
                        <span style={styles.statValue}>N/A</span>
                    </div>
                    <div style={styles.statCard}>
                        <span style={styles.statLabel}>ACTIVE POSITIONS</span>
                        <span style={styles.statValue}>0</span>
                    </div>
                </div>

                <div style={styles.section}>
                    <p style={styles.sectionTitle}>TRADING POSITIONS</p>
                    <div style={styles.tableHeader}>
                        <span style={Object.assign({}, styles.col, styles.colAsset)}>ASSET</span>
                        <span style={Object.assign({}, styles.col, styles.colSide)}>SIDE</span>
                        <span style={Object.assign({}, styles.col, styles.colPrice)}>ENTRY</span>
                        <span style={Object.assign({}, styles.col, styles.colPrice)}>CURRENT</span>
                        <span style={Object.assign({}, styles.col, styles.colPnl)}>PNL</span>
                        <span style={Object.assign({}, styles.col, styles.colThesis)}>THESIS</span>
                    </div>
                    <div style={styles.tableBody}>
                        {TRADING_POSITIONS.length === 0 && (
                            <div style={styles.emptyState}>
                                no positions yet. agent has not been funded.
                            </div>
                        )}
                        {TRADING_POSITIONS.map((p, i) => (
                            <div
                                key={p.asset + i}
                                style={Object.assign({}, styles.tableRow, i % 2 === 0 && styles.tableRowAlt)}
                            >
                                <span style={Object.assign({}, styles.cell, styles.colAsset)}>{p.asset}</span>
                                <span style={Object.assign({}, styles.cell, styles.colSide)}>{p.side}</span>
                                <span style={Object.assign({}, styles.cell, styles.colPrice)}>{p.entry}</span>
                                <span style={Object.assign({}, styles.cell, styles.colPrice)}>{p.current}</span>
                                <span style={Object.assign({}, styles.cell, styles.colPnl)}>{p.pnl}</span>
                                <span style={Object.assign({}, styles.cellThesis, styles.colThesis)}>{p.thesis}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={styles.section}>
                    <p style={styles.sectionTitle}>YIELD FARMING POSITIONS</p>
                    <div style={styles.tableHeader}>
                        <span style={Object.assign({}, styles.col, styles.colAsset)}>POOL</span>
                        <span style={Object.assign({}, styles.col, styles.colPrice)}>DEPOSITED</span>
                        <span style={Object.assign({}, styles.col, styles.colSide)}>APY</span>
                        <span style={Object.assign({}, styles.col, styles.colPrice)}>REWARDS</span>
                        <span style={Object.assign({}, styles.col, styles.colThesis)}>THESIS</span>
                    </div>
                    <div style={styles.tableBody}>
                        {YIELD_POSITIONS.length === 0 && (
                            <div style={styles.emptyState}>
                                no positions yet. agent has not been funded.
                            </div>
                        )}
                        {YIELD_POSITIONS.map((p, i) => (
                            <div
                                key={p.pool + i}
                                style={Object.assign({}, styles.tableRow, i % 2 === 0 && styles.tableRowAlt)}
                            >
                                <span style={Object.assign({}, styles.cell, styles.colAsset)}>{p.pool}</span>
                                <span style={Object.assign({}, styles.cell, styles.colPrice)}>{p.deposited}</span>
                                <span style={Object.assign({}, styles.cell, styles.colSide)}>{p.apy}</span>
                                <span style={Object.assign({}, styles.cell, styles.colPrice)}>{p.rewards}</span>
                                <span style={Object.assign({}, styles.cellThesis, styles.colThesis)}>{p.thesis}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={styles.footer}>
                    <span style={styles.footerText}>status: pre-launch : capital deployed: $0</span>
                    <span style={styles.footerText}>engine: Robinhood agent kit + x402 infra</span>
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
        color: '#f5a623',
        fontFamily: 'monospace',
        fontSize: 11,
    },
    statusDot: {
        color: '#f5a623',
        marginRight: 4,
        fontSize: 8,
    },
    subtitle: {
        fontFamily: 'monospace',
        fontSize: 11,
        lineHeight: '16px',
        color: '#888',
        padding: '10px 16px 0 16px',
    },
    statsBar: {
        padding: '12px 16px',
        justifyContent: 'space-between',
        borderBottom: '1px solid #222',
        gap: 8,
    },
    statCard: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        border: '1px solid #222',
        backgroundColor: '#111',
        borderRadius: 4,
        padding: '8px 6px',
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
    section: {
        flexDirection: 'column',
        padding: '14px 16px 4px 16px',
    },
    sectionTitle: {
        color: '#666',
        fontFamily: 'monospace',
        fontSize: 10,
        letterSpacing: 1,
        marginBottom: 8,
    },
    tableHeader: {
        padding: '6px 8px',
        borderBottom: '1px solid #444',
    },
    col: {
        color: '#666',
        fontFamily: 'monospace',
        fontSize: 9,
        letterSpacing: 1,
    },
    colAsset: { flex: '0 0 110px' },
    colSide: { flex: '0 0 70px' },
    colPrice: { flex: '0 0 90px' },
    colPnl: { flex: '0 0 80px' },
    colThesis: { flex: 1 },
    tableBody: {
        flexDirection: 'column',
        minHeight: 60,
    },
    emptyState: {
        color: '#555',
        fontFamily: 'monospace',
        fontSize: 11,
        padding: '20px 0',
        textAlign: 'center',
        justifyContent: 'center',
    },
    tableRow: {
        padding: '6px 8px',
        borderBottom: '1px solid #1a1a1a',
        alignItems: 'center',
    },
    tableRowAlt: {
        backgroundColor: '#111',
    },
    cell: {
        color: '#999',
        fontFamily: 'monospace',
        fontSize: 11,
    },
    cellThesis: {
        color: '#777',
        fontFamily: 'monospace',
        fontSize: 10,
        lineHeight: '14px',
    },
    footer: {
        padding: '10px 16px',
        borderTop: '1px solid #222',
        justifyContent: 'space-between',
        marginTop: 'auto',
    },
    footerText: {
        color: '#555',
        fontFamily: 'monospace',
        fontSize: 9,
    },
};

export default TradingViewer;
