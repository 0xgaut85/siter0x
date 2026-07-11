import React, { useEffect, useState, useRef } from 'react';
import Window from '../os/Window';
import { useInterval } from 'usehooks-ts';

export interface ExecutionMonitorProps extends WindowAppProps {}

const AGENT_NAMES = [
    'agent-alpha', 'neural-core', 'data-weaver', 'synth-mind',
    'logic-prime', 'code-forge', 'deep-scan', 'meta-agent',
    'auto-pilot', 'task-runner', 'skill-hub', 'flow-master',
];

const CAPABILITIES = [
    'text-analysis', 'image-recognition', 'data-pipeline',
    'code-review', 'translation', 'sentiment-analysis',
    'summarization', 'anomaly-detection', 'forecasting',
    'content-generation', 'knowledge-graph', 'embedding',
];

const NETWORKS = ['Robinhood Chain'];

function randomFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomPrice(): string {
    return (Math.random() * 0.01 + 0.0001).toFixed(4);
}

function randomId(): string {
    return Math.random().toString(36).substring(2, 8);
}

interface Transaction {
    id: string;
    time: string;
    agent: string;
    capability: string;
    cost: string;
    network: string;
    status: 'SUCCESS' | 'PENDING' | 'FAILED';
}

function generateTransaction(): Transaction {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour12: false });
    const statusRand = Math.random();
    let status: Transaction['status'] = 'SUCCESS';
    if (statusRand > 0.95) status = 'FAILED';
    else if (statusRand > 0.85) status = 'PENDING';

    return {
        id: randomId(),
        time,
        agent: randomFrom(AGENT_NAMES),
        capability: randomFrom(CAPABILITIES),
        cost: randomPrice(),
        network: randomFrom(NETWORKS),
        status,
    };
}

const ExecutionMonitor: React.FC<ExecutionMonitorProps> = (props) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [totalTx, setTotalTx] = useState(14231);
    const [totalValue, setTotalValue] = useState(47.892);
    const [activeAgents, setActiveAgents] = useState(23);
    const [tps, setTps] = useState(3.2);
    const [uptime] = useState(99.97);
    const feedRef = useRef<HTMLDivElement>(null);

    // Initialize with some transactions
    useEffect(() => {
        const initial: Transaction[] = [];
        for (let i = 0; i < 8; i++) {
            initial.push(generateTransaction());
        }
        setTransactions(initial);
    }, []);

    // Add new transactions periodically
    useInterval(() => {
        const newTx = generateTransaction();
        setTransactions((prev) => {
            const updated = [newTx, ...prev];
            return updated.slice(0, 50); // Keep last 50
        });

        setTotalTx((prev) => prev + 1);
        if (newTx.status === 'SUCCESS') {
            setTotalValue((prev) => prev + parseFloat(newTx.cost));
        }
        setActiveAgents(Math.floor(Math.random() * 8) + 20);
        setTps(parseFloat((Math.random() * 3 + 2).toFixed(1)));
    }, 2000 + Math.random() * 2000);

    return (
        <Window
            top={30}
            left={80}
            width={750}
            height={650}
            windowTitle="Execution Monitor"
            windowBarIcon="windowGameIcon"
            windowBarColor="#0d0d0d"
            closeWindow={props.onClose}
            onInteract={props.onInteract}
            minimizeWindow={props.onMinimize}
            bottomLeftText={'r0x Execution Monitor v1.0'}
        >
            <div style={styles.monitor}>
                {/* HEADER */}
                <div style={styles.header}>
                    <span style={styles.headerTitle}>EXECUTION MONITOR</span>
                    <span style={styles.headerStatus}>
                        <span style={styles.statusDot}>●</span> LIVE
                    </span>
                </div>

                {/* STATS BAR */}
                <div style={styles.statsBar}>
                    <div style={styles.statCard}>
                        <span style={styles.statLabel}>TXN/SEC</span>
                        <span style={styles.statValue}>{tps}</span>
                    </div>
                    <div style={styles.statCard}>
                        <span style={styles.statLabel}>TOTAL TXN</span>
                        <span style={styles.statValue}>
                            {totalTx.toLocaleString()}
                        </span>
                    </div>
                    <div style={styles.statCard}>
                        <span style={styles.statLabel}>TOTAL VALUE</span>
                        <span style={styles.statValue}>
                            {totalValue.toFixed(3)} ETH
                        </span>
                    </div>
                    <div style={styles.statCard}>
                        <span style={styles.statLabel}>ACTIVE AGENTS</span>
                        <span style={styles.statValue}>{activeAgents}</span>
                    </div>
                    <div style={styles.statCard}>
                        <span style={styles.statLabel}>UPTIME</span>
                        <span style={styles.statValue}>{uptime}%</span>
                    </div>
                </div>

                {/* PROTOCOL HEALTH */}
                <div style={styles.healthBar}>
                    <span style={styles.healthLabel}>PROTOCOL HEALTH</span>
                    <div style={styles.healthTrack}>
                        <div
                            style={Object.assign({}, styles.healthFill, {
                                width: `${uptime}%`,
                            })}
                        />
                    </div>
                    <span style={styles.healthValue}>{uptime}%</span>
                </div>

                {/* TRANSACTION FEED */}
                <div style={styles.feedHeader}>
                    <span style={styles.feedCol}>TIME</span>
                    <span style={styles.feedCol}>AGENT</span>
                    <span style={styles.feedCol}>CAPABILITY</span>
                    <span style={styles.feedCol}>COST</span>
                    <span style={styles.feedCol}>NET</span>
                    <span style={styles.feedCol}>STATUS</span>
                </div>
                <div ref={feedRef} style={styles.feed}>
                    {transactions.map((tx, i) => (
                        <div
                            key={`${tx.id}-${i}`}
                            style={Object.assign(
                                {},
                                styles.feedRow,
                                i % 2 === 0 && styles.feedRowAlt
                            )}
                        >
                            <span style={styles.feedCell}>{tx.time}</span>
                            <span style={styles.feedCellAgent}>
                                {tx.agent}
                            </span>
                            <span style={styles.feedCell}>
                                {tx.capability}
                            </span>
                            <span style={styles.feedCellCost}>
                                {tx.cost} ETH
                            </span>
                            <span style={styles.feedCell}>{tx.network}</span>
                            <span
                                style={Object.assign(
                                    {},
                                    styles.feedCellStatus,
                                    tx.status === 'SUCCESS' && {
                                        color: '#00ff88',
                                    },
                                    tx.status === 'PENDING' && {
                                        color: '#FFD700',
                                    },
                                    tx.status === 'FAILED' && {
                                        color: '#ff4444',
                                    }
                                )}
                            >
                                {tx.status}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </Window>
    );
};

const styles: StyleSheetCSS = {
    monitor: {
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
    statsBar: {
        padding: '8px 16px',
        justifyContent: 'space-between',
        borderBottom: '1px solid #222',
    },
    statCard: {
        flexDirection: 'column',
        alignItems: 'center',
        padding: '4px 8px',
    },
    statLabel: {
        color: '#666',
        fontFamily: 'monospace',
        fontSize: 9,
        letterSpacing: 1,
        marginBottom: 2,
    },
    statValue: {
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: 14,
        fontWeight: 'bold',
    },
    healthBar: {
        padding: '6px 16px',
        alignItems: 'center',
        borderBottom: '1px solid #222',
    },
    healthLabel: {
        color: '#666',
        fontFamily: 'monospace',
        fontSize: 9,
        letterSpacing: 1,
        marginRight: 12,
        minWidth: 110,
    },
    healthTrack: {
        flex: 1,
        height: 6,
        backgroundColor: '#222',
        borderRadius: 3,
        overflow: 'hidden',
        marginRight: 8,
    },
    healthFill: {
        height: '100%',
        backgroundColor: '#00ff88',
        borderRadius: 3,
    },
    healthValue: {
        color: '#00ff88',
        fontFamily: 'monospace',
        fontSize: 11,
        minWidth: 48,
        textAlign: 'right',
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
        flex: 1,
    },
    feed: {
        flex: 1,
        flexDirection: 'column',
        overflowY: 'auto',
        padding: '0 16px',
    },
    feedRow: {
        padding: '4px 0',
        borderBottom: '1px solid #1a1a1a',
    },
    feedRowAlt: {
        backgroundColor: '#111',
    },
    feedCell: {
        color: '#999',
        fontFamily: 'monospace',
        fontSize: 11,
        flex: 1,
    },
    feedCellAgent: {
        color: '#BB86FC',
        fontFamily: 'monospace',
        fontSize: 11,
        flex: 1,
    },
    feedCellCost: {
        color: '#FFD700',
        fontFamily: 'monospace',
        fontSize: 11,
        flex: 1,
    },
    feedCellStatus: {
        fontFamily: 'monospace',
        fontSize: 11,
        flex: 1,
    },
};

export default ExecutionMonitor;
