import React, { useState } from 'react';
import Window from '../os/Window';

export interface PinionTokenProps extends WindowAppProps {}

const R0X_CONTRACT_ADDRESS = '0x8e2de1cd12f1c780c575365b82167eaddff890e8';
const DEXSCREENER_URL = `https://dexscreener.com/robinhood/${R0X_CONTRACT_ADDRESS}`;
const DEXSCREENER_EMBED_URL = `${DEXSCREENER_URL}?embed=1&theme=dark&trades=0&info=0`;

const PinionToken: React.FC<PinionTokenProps> = (props) => {
    const [width, setWidth] = useState(900);
    const [height, setHeight] = useState(650);
    const [copied, setCopied] = useState(false);

    const copyAddress = () => {
        navigator.clipboard.writeText(R0X_CONTRACT_ADDRESS).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <Window
            top={40}
            left={100}
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
                <div style={styles.header}>
                    <span style={styles.headerLabel}>CA:</span>
                    <span style={styles.address}>{R0X_CONTRACT_ADDRESS}</span>
                    <button style={styles.copyButton} onClick={copyAddress}>
                        {copied ? 'copied' : 'copy'}
                    </button>
                    <a style={styles.explorerLink} href={DEXSCREENER_URL} target="_blank" rel="noreferrer">
                        view on dexscreener &rarr;
                    </a>
                </div>
                <iframe
                    src={DEXSCREENER_EMBED_URL}
                    style={styles.iframe}
                    title="$r0x on DexScreener"
                />
            </div>
        </Window>
    );
};

const styles: StyleSheetCSS = {
    container: {
        flex: 1,
        flexDirection: 'column',
        backgroundColor: '#0d0d0d',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderBottom: '1px solid #333',
    },
    headerLabel: {
        fontFamily: 'monospace',
        fontSize: 12,
        color: '#ccc',
    },
    address: {
        fontFamily: 'monospace',
        fontSize: 12,
        color: '#CEF506',
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
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
        textDecoration: 'none',
        whiteSpace: 'nowrap',
    },
    iframe: {
        flex: 1,
        border: 'none',
        width: '100%',
        height: '100%',
    },
};

export default PinionToken;
