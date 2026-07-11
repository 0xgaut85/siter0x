import React, { useEffect, useState, useCallback, useRef } from 'react';
import Window from '../os/Window';

export interface GatewayTerminalProps extends WindowAppProps {}

const DEMO_SCRIPT = [
    { text: '$ r0x discover --capability "text-analysis"', delay: 50 },
    { text: '', delay: 500 },
    { text: '[GATEWAY] Querying capability registry...', delay: 30 },
    { text: '[GATEWAY] Found 3 providers for "text-analysis":', delay: 30 },
    { text: '', delay: 200 },
    { text: '  ID          PROVIDER        PRICE       TRUST   LATENCY', delay: 10 },
    { text: '  ────────    ────────────    ─────────   ─────   ───────', delay: 10 },
    { text: '  cap-7a21    agent-alpha     0.001 ETH   92/100  45ms', delay: 100 },
    { text: '  cap-3f09    neural-core     0.002 ETH   87/100  32ms', delay: 100 },
    { text: '  cap-9c44    data-weaver     0.0008 ETH  71/100  89ms', delay: 100 },
    { text: '', delay: 500 },
    { text: '$ r0x invoke cap-7a21 --input "Analyze Q4 market trends"', delay: 50 },
    { text: '', delay: 300 },
    { text: '[POLICY] Evaluating spending policy...', delay: 30 },
    { text: '[POLICY] Budget remaining: 0.47 ETH (daily limit: 1.0 ETH)', delay: 30 },
    { text: '[POLICY] Trust threshold: 50 | Provider score: 92 ✓', delay: 30 },
    { text: '[POLICY] Rate limit: 100/hr | Current: 23/hr ✓', delay: 30 },
    { text: '[POLICY] Authorization: APPROVED', delay: 30 },
    { text: '', delay: 400 },
    { text: '[x402] Initiating payment negotiation...', delay: 30 },
    { text: '[x402] → GET /api/analyze', delay: 30 },
    { text: '[x402] ← 402 Payment Required', delay: 30 },
    { text: '[x402]   x-payment-amount: 0.001 ETH', delay: 20 },
    { text: '[x402]   x-payment-address: 0x7a21...f309', delay: 20 },
    { text: '[x402]   x-payment-network: eip155:4663 (Robinhood Chain)', delay: 20 },
    { text: '[x402]   x-payment-token: ETH', delay: 20 },
    { text: '', delay: 300 },
    { text: '[x402] Submitting payment on Robinhood Chain...', delay: 30 },
    { text: '[x402] Transaction hash: 0xd4e5f6...a1b2c3', delay: 30 },
    { text: '[x402] Settlement confirmed (block #18,442,017)', delay: 30 },
    { text: '', delay: 400 },
    { text: '[x402] → GET /api/analyze (with payment proof)', delay: 30 },
    { text: '[x402] ← 200 OK', delay: 30 },
    { text: '', delay: 300 },
    { text: '[RUNTIME] Executing capability: text-analysis v2.1.0', delay: 30 },
    { text: '[RUNTIME] Provider: agent-alpha (0x7a21...f309)', delay: 30 },
    { text: '[RUNTIME] Execution time: 1,247ms', delay: 30 },
    { text: '[RUNTIME] Status: SUCCESS', delay: 30 },
    { text: '', delay: 200 },
    { text: '┌─────────────────────────────────────────────────┐', delay: 10 },
    { text: '│  EXECUTION RESULT                               │', delay: 10 },
    { text: '├─────────────────────────────────────────────────┤', delay: 10 },
    { text: '│  Summary: Q4 shows 23% growth in autonomous     │', delay: 10 },
    { text: '│  agent deployments with infrastructure spend     │', delay: 10 },
    { text: '│  increasing 41% YoY. Key drivers: x402 adoption │', delay: 10 },
    { text: '│  (+156%), skill runtime expansion and             │', delay: 10 },
    { text: '│  enterprise policy automation.                   │', delay: 10 },
    { text: '│                                                  │', delay: 10 },
    { text: '│  Confidence: 0.94 | Tokens: 2,847               │', delay: 10 },
    { text: '└─────────────────────────────────────────────────┘', delay: 10 },
    { text: '', delay: 300 },
    { text: '┌─────────────────────────────────────────────────┐', delay: 10 },
    { text: '│  TRANSACTION RECEIPT                             │', delay: 10 },
    { text: '├─────────────────────────────────────────────────┤', delay: 10 },
    { text: '│  Capability:   text-analysis                     │', delay: 10 },
    { text: '│  Provider:     agent-alpha                       │', delay: 10 },
    { text: '│  Cost:         0.001 ETH ($2.47)                 │', delay: 10 },
    { text: '│  Network:      Robinhood Chain                   │', delay: 10 },
    { text: '│  Tx Hash:      0xd4e5f6...a1b2c3                │', delay: 10 },
    { text: '│  Trust Score:  92 → 92 (no change)               │', delay: 10 },
    { text: '│  Timestamp:    2026-02-08T14:32:17Z              │', delay: 10 },
    { text: '└─────────────────────────────────────────────────┘', delay: 10 },
    { text: '', delay: 500 },
    { text: '[GATEWAY] Execution complete. Budget remaining: 0.469 ETH', delay: 30 },
    { text: '', delay: 1000 },
    { text: '$ _', delay: 0 },
];

const GatewayTerminal: React.FC<GatewayTerminalProps> = (props) => {
    const [lines, setLines] = useState<string[]>([]);
    const [isRunning, setIsRunning] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const cancelRef = useRef(false);

    const runDemo = useCallback(async () => {
        cancelRef.current = false;
        setLines([]);
        setIsRunning(true);

        for (let i = 0; i < DEMO_SCRIPT.length; i++) {
            if (cancelRef.current) return;
            const step = DEMO_SCRIPT[i];

            // Typewriter for command lines (lines starting with $)
            if (step.text.startsWith('$')) {
                for (let j = 0; j <= step.text.length; j++) {
                    if (cancelRef.current) return;
                    const partial = step.text.substring(0, j);
                    setLines((prev) => {
                        const newLines = [...prev];
                        if (newLines.length > 0 && i > 0) {
                            newLines[newLines.length - 1] = partial;
                        } else {
                            newLines.push(partial);
                        }
                        return newLines;
                    });
                    await new Promise((r) => setTimeout(r, step.delay));
                }
                // Add a new empty line for the next entry
                setLines((prev) => [...prev, '']);
            } else {
                setLines((prev) => {
                    const newLines = [...prev];
                    newLines[newLines.length - 1] = step.text;
                    newLines.push('');
                    return newLines;
                });
                await new Promise((r) => setTimeout(r, step.delay));
            }
        }
        setIsRunning(false);
    }, []);

    useEffect(() => {
        runDemo();
        return () => {
            cancelRef.current = true;
        };
    }, [runDemo]);

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [lines]);

    const handleRestart = () => {
        cancelRef.current = true;
        setTimeout(() => {
            runDemo();
        }, 100);
    };

    return (
        <Window
            top={20}
            left={20}
            width={700}
            height={600}
            windowTitle="Gateway Terminal"
            windowBarIcon="windowGameIcon"
            windowBarColor="#0d0d0d"
            closeWindow={props.onClose}
            onInteract={props.onInteract}
            minimizeWindow={props.onMinimize}
            bottomLeftText={'r0x Capability Gateway v1.0'}
        >
            <div style={styles.terminal}>
                <div style={styles.header}>
                    <span style={styles.headerText}>r0x GATEWAY TERMINAL</span>
                    {!isRunning && (
                        <div
                            onMouseDown={handleRestart}
                            style={styles.restartButton}
                        >
                            <span style={styles.restartText}>↻ Restart Demo</span>
                        </div>
                    )}
                </div>
                <div ref={containerRef} style={styles.output}>
                    {lines.map((line, i) => (
                        <div key={i} style={styles.line}>
                            <span
                                style={Object.assign(
                                    {},
                                    styles.lineText,
                                    line.startsWith('$') && styles.command,
                                    line.startsWith('[x402]') && styles.payment,
                                    line.startsWith('[POLICY]') && styles.policy,
                                    line.startsWith('[RUNTIME]') && styles.runtime,
                                    line.startsWith('[GATEWAY]') && styles.gateway,
                                    (line.startsWith('┌') ||
                                        line.startsWith('│') ||
                                        line.startsWith('├') ||
                                        line.startsWith('└')) && styles.box
                                )}
                            >
                                {line}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </Window>
    );
};

const styles: StyleSheetCSS = {
    terminal: {
        flex: 1,
        backgroundColor: '#0d0d0d',
        flexDirection: 'column',
        overflow: 'hidden',
    },
    header: {
        padding: '8px 16px',
        borderBottom: '1px solid #333',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerText: {
        color: '#CEF506',
        fontFamily: 'monospace',
        fontSize: 11,
        letterSpacing: 2,
    },
    restartButton: {
        padding: '4px 12px',
        border: '1px solid #CEF506',
        cursor: 'pointer',
    },
    restartText: {
        color: '#CEF506',
        fontFamily: 'monospace',
        fontSize: 11,
    },
    output: {
        flex: 1,
        padding: 16,
        overflowY: 'auto',
        flexDirection: 'column',
    },
    line: {
        minHeight: 18,
    },
    lineText: {
        fontFamily: 'monospace',
        fontSize: 12,
        lineHeight: 1.5,
        color: '#999',
        whiteSpace: 'pre',
    },
    command: {
        color: '#00ff88',
        fontWeight: 'bold',
    },
    payment: {
        color: '#FFD700',
    },
    policy: {
        color: '#87CEEB',
    },
    runtime: {
        color: '#CEF506',
    },
    gateway: {
        color: '#BB86FC',
    },
    box: {
        color: '#CEF506',
    },
};

export default GatewayTerminal;
