import React, { useCallback, useEffect, useState } from 'react';
import { useInterval } from 'usehooks-ts';
import Window from '../os/Window';
import { getApiBase } from '../../utils/x402';

export interface ScanViewerProps extends WindowAppProps {}

interface ScanTransaction {
    txHash: string;
    network: string | null;
    endpoint: string | null;
    payer: string | null;
    payTo: string | null;
    asset: string | null;
    amountUsdg: number | null;
    createdAt: string;
}

interface ScanStats {
    totalCount: number;
    totalVolumeUsdg: number;
    avgAmountUsdg: number;
    last24hCount: number;
    dbConnected: boolean;
    enabled: boolean;
}

const EXPLORER_BASE = 'https://robinhoodchain.blockscout.com/tx/';
const POLL_MS = 5000;

function shorten(value: string | null, head = 6, tail = 4): string {
    if (!value) return '—';
    if (value.length <= head + tail + 2) return value;
    return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

function timeAgo(iso: string): string {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

const ScanViewer: React.FC<ScanViewerProps> = (props) => {
    const [width, setWidth] = useState(760);
    const [height, setHeight] = useState(600);
    const [stats, setStats] = useState<ScanStats | null>(null);
    const [transactions, setTransactions] = useState<ScanTransaction[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const base = getApiBase();
            const [statsRes, txRes] = await Promise.all([
                fetch(`${base}/api/scan/stats`),
                fetch(`${base}/api/scan/transactions?limit=50`),
            ]);
            if (!statsRes.ok || !txRes.ok) throw new Error('scan API unavailable');
            const statsData: ScanStats = await statsRes.json();
            const txData: { transactions: ScanTransaction[] } = await txRes.json();
            setStats(statsData);
            setTransactions(txData.transactions);
            setError(null);
            setLastUpdated(new Date());
        } catch (err) {
            setError('could not reach r0x Scan API');
        }
    }, []);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useInterval(fetchData, POLL_MS);

    const isLive = !error && stats?.dbConnected;

    return (
        <Window
            top={36}
            left={90}
            width={width}
            height={height}
            windowTitle="r0x Scan"
            windowBarIcon="windowR0xScanIcon"
            windowBarColor="#0d0d0d"
            closeWindow={props.onClose}
            onInteract={props.onInteract}
            minimizeWindow={props.onMinimize}
            onWidthChange={setWidth}
            onHeightChange={setHeight}
            bottomLeftText={'r0x Scan v1.0 — live facilitator settlements'}
        >
            <div style={styles.container}>
                <div style={styles.header}>
                    <span style={styles.headerTitle}>R0X SCAN</span>
                    <span style={styles.headerStatus}>
                        <span
                            style={Object.assign(
                                {},
                                styles.statusDot,
                                !isLive && styles.statusDotOffline
                            )}
                        >
                            ●
                        </span>{' '}
                        {isLive ? 'LIVE' : 'OFFLINE'}
                    </span>
                </div>

                <p style={styles.subtitle}>
                    Every real payment settled through the self-hosted x402 facilitator on
                    Robinhood Chain, tracked as it happens. No sample data — this table is
                    empty until the first real transaction clears.
                </p>

                <div style={styles.statsBar}>
                    <div style={styles.statCard}>
                        <span style={styles.statLabel}>TOTAL TXNS</span>
                        <span style={styles.statValue}>
                            {stats ? stats.totalCount.toLocaleString() : '—'}
                        </span>
                    </div>
                    <div style={styles.statCard}>
                        <span style={styles.statLabel}>TOTAL VOLUME</span>
                        <span style={styles.statValue}>
                            {stats ? `${stats.totalVolumeUsdg.toFixed(2)} USDG` : '—'}
                        </span>
                    </div>
                    <div style={styles.statCard}>
                        <span style={styles.statLabel}>AVG TXN</span>
                        <span style={styles.statValue}>
                            {stats ? `${stats.avgAmountUsdg.toFixed(4)} USDG` : '—'}
                        </span>
                    </div>
                    <div style={styles.statCard}>
                        <span style={styles.statLabel}>LAST 24H</span>
                        <span style={styles.statValue}>
                            {stats ? stats.last24hCount.toLocaleString() : '—'}
                        </span>
                    </div>
                </div>

                <div style={styles.feedHeader}>
                    <span style={Object.assign({}, styles.feedCol, styles.feedColTime)}>TIME</span>
                    <span style={Object.assign({}, styles.feedCol, styles.feedColEndpoint)}>ENDPOINT</span>
                    <span style={Object.assign({}, styles.feedCol, styles.feedColAddr)}>PAYER</span>
                    <span style={Object.assign({}, styles.feedCol, styles.feedColAmount)}>AMOUNT</span>
                    <span style={Object.assign({}, styles.feedCol, styles.feedColTx)}>TX HASH</span>
                </div>
                <div style={styles.feed}>
                    {error && (
                        <div style={styles.emptyState}>
                            {error}. retrying every {POLL_MS / 1000}s...
                        </div>
                    )}
                    {!error && stats && !stats.dbConnected && (
                        <div style={styles.emptyState}>
                            r0x Scan storage is not configured yet.
                        </div>
                    )}
                    {!error && stats?.dbConnected && transactions.length === 0 && (
                        <div style={styles.emptyState}>
                            no transactions yet — waiting for the first real payment to settle.
                        </div>
                    )}
                    {transactions.map((tx, i) => (
                        <div
                            key={tx.txHash}
                            style={Object.assign(
                                {},
                                styles.feedRow,
                                i % 2 === 0 && styles.feedRowAlt
                            )}
                        >
                            <span style={Object.assign({}, styles.feedCell, styles.feedColTime)}>
                                {timeAgo(tx.createdAt)}
                            </span>
                            <span style={Object.assign({}, styles.feedCellEndpoint, styles.feedColEndpoint)}>
                                {tx.endpoint || '—'}
                            </span>
                            <span style={Object.assign({}, styles.feedCell, styles.feedColAddr)}>
                                {shorten(tx.payer)}
                            </span>
                            <span style={Object.assign({}, styles.feedCellAmount, styles.feedColAmount)}>
                                {tx.amountUsdg !== null ? `${tx.amountUsdg.toFixed(4)} USDG` : '—'}
                            </span>
                            <a
                                href={`${EXPLORER_BASE}${tx.txHash}`}
                                target="_blank"
                                rel="noreferrer"
                                style={Object.assign({}, styles.feedCellLink, styles.feedColTx)}
                            >
                                {shorten(tx.txHash)}
                            </a>
                        </div>
                    ))}
                </div>

                <div style={styles.footer}>
                    <span style={styles.footerText}>
                        {lastUpdated
                            ? `updated ${lastUpdated.toLocaleTimeString('en-US', { hour12: false })}`
                            : 'connecting...'}
                    </span>
                    <span style={styles.footerText}>facilitator: self-hosted · network: Robinhood Chain · asset: USDG</span>
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
        overflow: 'hidden',
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
    statusDotOffline: {
        color: '#ff4444',
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
    feedHeader: {
        padding: '6px 16px',
        borderBottom: '1px solid #444',
    },
    feedCol: {
        color: '#666',
        fontFamily: 'monospace',
        fontSize: 9,
        letterSpacing: 1,
    },
    feedColTime: { flex: '0 0 70px' },
    feedColEndpoint: { flex: '0 0 130px' },
    feedColAddr: { flex: '0 0 110px' },
    feedColAmount: { flex: '0 0 100px' },
    feedColTx: { flex: 1 },
    feed: {
        flex: 1,
        flexDirection: 'column',
        overflowY: 'auto',
        padding: '0 16px',
    },
    emptyState: {
        color: '#555',
        fontFamily: 'monospace',
        fontSize: 11,
        padding: '24px 0',
        textAlign: 'center',
        justifyContent: 'center',
    },
    feedRow: {
        padding: '6px 0',
        borderBottom: '1px solid #1a1a1a',
        alignItems: 'center',
    },
    feedRowAlt: {
        backgroundColor: '#111',
    },
    feedCell: {
        color: '#999',
        fontFamily: 'monospace',
        fontSize: 11,
    },
    feedCellEndpoint: {
        color: '#BB86FC',
        fontFamily: 'monospace',
        fontSize: 11,
    },
    feedCellAmount: {
        color: '#FFD700',
        fontFamily: 'monospace',
        fontSize: 11,
    },
    feedCellLink: {
        color: '#00ff88',
        fontFamily: 'monospace',
        fontSize: 11,
        textDecoration: 'none',
    },
    footer: {
        padding: '8px 16px',
        borderTop: '1px solid #222',
        justifyContent: 'space-between',
    },
    footerText: {
        color: '#555',
        fontFamily: 'monospace',
        fontSize: 9,
    },
};

export default ScanViewer;
