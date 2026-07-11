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
            windowTitle="$r0x — DEX Screener"
            windowBarIcon="pinionTokenIcon"
            windowBarColor="#0d0d0d"
            closeWindow={props.onClose}
            onInteract={props.onInteract}
            minimizeWindow={props.onMinimize}
            onWidthChange={setWidth}
            onHeightChange={setHeight}
            bottomLeftText="dexscreener.com"
        >
            <div style={styles.container}>
                <iframe
                    src="https://dexscreener.com/robinhood/0x5c46b4b4f62c91980a8f4008cd82d32921e786e2?embed=1&theme=dark&trades=0&info=0"
                    title="$r0x DEX Screener"
                    width="100%"
                    height="100%"
                    style={styles.iframe}
                />
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
    iframe: {
        border: 'none',
    },
};

export default PinionToken;
