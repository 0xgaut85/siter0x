import React, { useState } from 'react';
import Window from '../os/Window';

export interface PinionTokenProps extends WindowAppProps {}

const PinionToken: React.FC<PinionTokenProps> = (props) => {
    const [width, setWidth] = useState(800);
    const [height, setHeight] = useState(600);

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
                    <p style={styles.fallbackTitle}>$r0x listing coming soon</p>
                    <p style={styles.fallbackSubtitle}>The $r0x token is not live yet.</p>
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
};

export default PinionToken;
