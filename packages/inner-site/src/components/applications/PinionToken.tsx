import React, { useState } from 'react';
import Window from '../os/Window';

export interface PinionTokenProps extends WindowAppProps {}

const R0X_CONTRACT_ADDRESS = '0x8e2de1cd12f1c780c575365b82167eaddff890e8';
const EXPLORER_URL = `https://robinhoodchain.blockscout.com/token/${R0X_CONTRACT_ADDRESS}`;

const PinionToken: React.FC<PinionTokenProps> = (props) => {
    const [width, setWidth] = useState(800);
    const [height, setHeight] = useState(600);
    const [copied, setCopied] = useState(false);

    const copyAddress = () => {
        navigator.clipboard.writeText(R0X_CONTRACT_ADDRESS).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <Window
            top={50}
            left={120}
            width={width}
            height={height}
            windowTitle="$r0x"
            windowBarIcon="pinionTokenIcon"
            windowBarColor="#0d0d0d"
            closeWindow={props.onClose}
            onInteract={props.onInteract}
            minimizeWindow={props.onMinimize}
            onWidthChange={setWidth}
            onHeightChange={setHeight}
        >
            <div style={styles.container}>
                <div style={styles.fallback}>
                    <p style={styles.fallbackTitle}>$r0x</p>
                    <p style={styles.fallbackSubtitle}>official contract address</p>
                    <div style={styles.addressRow}>
                        <span style={styles.address}>{R0X_CONTRACT_ADDRESS}</span>
                        <button style={styles.copyButton} onClick={copyAddress}>
                            {copied ? 'copied' : 'copy'}
                        </button>
                    </div>
                    <a style={styles.explorerLink} href={EXPLORER_URL} target="_blank" rel="noreferrer">
                        view on explorer &rarr;
                    </a>
                </div>
            </div>
        </Window>
    );
};

const styles: StyleSheetCSS = {
    container: {
        flex: 1,
        backgroundColor: '#0d0d0d',
        overflow: 'hidden',
    },
    fallback: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    fallbackTitle: {
        fontFamily: 'monospace',
        fontSize: 14,
        color: '#CEF506',
    },
    fallbackSubtitle: {
        fontFamily: 'monospace',
        fontSize: 12,
        color: '#ccc',
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: 4,
        padding: '8px 12px',
    },
    address: {
        fontFamily: 'monospace',
        fontSize: 12,
        color: '#CEF506',
    },
    copyButton: {
        fontFamily: 'monospace',
        fontSize: 11,
        color: '#0d0d0d',
        backgroundColor: '#CEF506',
        border: 'none',
        borderRadius: 3,
        padding: '3px 8px',
        cursor: 'pointer',
    },
    explorerLink: {
        fontFamily: 'monospace',
        fontSize: 12,
        color: '#ccc',
        marginTop: 12,
        textDecoration: 'none',
    },
};

export default PinionToken;
