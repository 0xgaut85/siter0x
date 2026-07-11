import React from 'react';
import Window from '../os/Window';
import Wordle from '../wordle/Wordle';

export interface PinordleAppProps extends WindowAppProps {}

const PinordleApp: React.FC<PinordleAppProps> = (props) => {
    return (
        <Window
            top={20}
            left={300}
            width={600}
            height={860}
            windowBarIcon="windowGameIcon"
            windowTitle="Pinordle"
            closeWindow={props.onClose}
            onInteract={props.onInteract}
            minimizeWindow={props.onMinimize}
            bottomLeftText={'© 2026 r0x'}
        >
            <div className="site-page">
                <Wordle />
            </div>
        </Window>
    );
};

export default PinordleApp;
