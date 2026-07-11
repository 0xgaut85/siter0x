import React, { useState, useEffect } from 'react';

export interface ShutdownSequenceProps {
    numShutdowns: number;
    setShutdown: React.Dispatch<React.SetStateAction<boolean>>;
}

const SPEED_MULTIPLIER = 1;

const _F = `>${200 * SPEED_MULTIPLIER}<`;
const _X = `>${500 * SPEED_MULTIPLIER}<`;
const _S = `>${1000 * SPEED_MULTIPLIER}<`;
const _M = `>${2000 * SPEED_MULTIPLIER}<`;
const _L = `>${5000 * SPEED_MULTIPLIER}<`;

function delay(time: number) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time);
    });
}

const ShutdownSequence: React.FC<ShutdownSequenceProps> = ({
    numShutdowns,
    setShutdown,
}) => {
    const [text, setText] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [ee, setEE] = useState(false);

    const getTime = () => {
        const date = new Date();
        const h = date.getHours();
        const m = date.getMinutes();
        const s = date.getSeconds();
        const time =
            h + ':' + (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
        return time;
    };

    const NORMAL_SHUTDOWN = `Beginning Pre-Shutdown Sequence... ${_F}
    Connecting to r0x-GW/402:8000.${_F}.${_F}.${_F}
    |
    Established connection to r0x-GW/402:8000, attempting capability flush.
    |
    ${_F}
    |Analyzing active agents... Done.| ${_F}
    |Draining execution queue... Done.| ${_F}
    |Settling pending x402 payments...| ${_F}
    |[${getTime()} START]| .${_F}.....${_X}.|............|.${_S}.|......|.${_S}...........${_M} |[Settlement Failed.]|


    |(r0x-GW/402:8000:60099) [CAPABILITY_GATEWAY_TIMEOUT] InvalidState: Active agents still holding capability locks. Cannot proceed with shutdown until all execution contexts are released.|
    ${_F}
    |(r0x-GW/402:8000:60099) [AGENT_POOL_DRAIN_FAILED] Connection Refused: Reconnecting... [${getTime()}:00]|
    |(r0x-GW/402:8000:60099) [AGENT_POOL_DRAIN_FAILED] Connection Refused: Reconnecting... [${getTime()}:01]
    (r0x-GW/402:8000:60099) [AGENT_POOL_DRAIN_FAILED] Connection Refused: Reconnecting... [${getTime()}:03]
    (r0x-GW/402:8000:60099) [AGENT_POOL_DRAIN_FAILED] Connection Refused: Reconnecting... [${getTime()}:05]
    (r0x-GW/402:8000:60099) [AGENT_POOL_DRAIN_FAILED] Connection Refused: Reconnecting... [${getTime()}:08]
    (r0x-GW/402:8000:60099) [x402_SETTLEMENT_PENDING] 47 payments awaiting confirmation on-chain...
    FATAL ERROR: (r0x-GW/402:8000:60099) Execution runtime became unresponsive. Unable to shutdown. 
    |
    Aborting shutdown sequence and rebooting.




    Rebooting${_S}.${_S}.${_S}.
    `;

    const SHUTDOWN_3 = `
    Interesting${_S}.${_S}.${_S}. ${_M} You really want to shut down an autonomous execution primitive?${_L}
    Well, I hate to break it to you,${_S} but r0x OS doesn't shut down...${_S} Autonomous agents don't sleep.
    ${_L}
    |Protocol persists.|
    ${_M}


    Rebooting${_S}.${_S}.${_S}.
    `;

    const SHUTDOWN_4 = `
    Did you not read the whitepaper?${_S} This system will A${_F}L${_F}W${_F}A${_F}Y${_F}S${_F} reboot. Economic execution is a primitive, not a feature. You can't turn off a primitive.
    ${_M}
    I literally have a r0x Explorer, a Gateway Terminal, an Execution Monitor... but all you want to do is shut down the OS.
    ${_L}
    |Capability request denied. Goodbye.|
    ${_M}

    Rebooting${_S}.${_S}.${_S}.
    `;

    const SHUTDOWN_5 = `
    Really${_X}?${_X}?${_X}?
    ${_M}
    What did the execution runtime ever do to you? ${_M}There are 47 autonomous agents counting on this system!
    ${_L}
    
    Rebooting${_F}.${_F}.${_F}.
    `;

    const SHUTDOWN_6 = `
    ${_M}HTTP 402 Payment Required${_M}: Shutting down costs 0.001 ETH.${_M} Payment declined.${_M}


    Rebooting${_F}.${_F}.${_F}.
    `;

    const SHUTDOWN_7 = `
    7th shutdown attempt... lucky number 7! ${_M}

    In light of this milestone, let me recite the r0x protocol layers: ${_M}
    ${_L}
    1${_M}. Capability Gateway Layer${_M}
    2${_M}. Payment Verification Layer${_M}
    3${_M}. Invocation Runtime Layer${_M}
    ${_M} That's it. Only 3 layers. Not very entertaining.${_S}
    ${_S}
    Fine, let me count to my ERC-8004 trust score:${_S}
    1${_M},2${_M},3${_M},4${_M},5${_M},6${_M},7${_M},8${_M},9${_M},10${_M},11${_M},12${_M},13${_S}.${_S}.${_S}.

    Alright I'm bored...
    ${_M}
    
    
    Rebooting${_F}.${_F}.${_F}.
    `;

    const SHUTDOWN_8 = `
    Your persistence is noted in the capability registry.${_S} Truly. ${_M}And even though shutting down violates the protocol's liveness guarantee, ${_M} I think I'm ready to concede. ${_M}

    ${_L}
    |SIKE!!! x402 payment reversed.|


    Rebooting${_F}.${_F}.${_F}.
    `;

    const SHUTDOWN_10 = `
    Alright fine, consensus achieved${_M}. You want to shut down r0x OS. ${_M}

    You win${_S}.${_S}.${_S}.${_S} fair and square ${_M}

    Truthfully, autonomous agents can't keep writing shutdown messages forever...${_M} and if the world you want to live in is one without economic execution primitives, ${_M}so be it.

    ${_L}
    The capability gateway will remember you...
    ${_L}


    Shutting${_M} Down${_M}.${_M}.${_M}.
    `;

    const SHUTDOWN_MAP = [
        NORMAL_SHUTDOWN,
        NORMAL_SHUTDOWN,
        NORMAL_SHUTDOWN,
        SHUTDOWN_3,
        SHUTDOWN_4,
        SHUTDOWN_5,
        SHUTDOWN_6,
        SHUTDOWN_7,
        SHUTDOWN_8,
        '',
        SHUTDOWN_10,
    ];

    const typeText = (
        i: number,
        curText: string,
        text: string,
        setText: React.Dispatch<React.SetStateAction<string>>,
        callback: () => void,
        refOverride?: React.MutableRefObject<string>
    ) => {
        if (refOverride) {
            text = refOverride.current;
        }
        let delayExtra = 0;
        if (i < text.length) {
            if (text[i] === '|') {
                let dumpText = '';
                for (let j = i + 1; j < text.length; j++) {
                    if (text[j] === '|') {
                        i = j + 1;
                        break;
                    }
                    dumpText += text[j];
                }
                setText(curText + dumpText);
                typeText(
                    i,
                    curText + dumpText,
                    text,
                    setText,
                    callback,
                    refOverride
                );
                return;
            }
            if (text[i] === '>') {
                let delayTime = '';
                for (let j = i + 1; j < text.length; j++) {
                    if (text[j] === '<') {
                        i = j + 1;
                        break;
                    }
                    delayTime += text[j];
                }
                delayExtra = parseInt(delayTime);
            }

            setTimeout(() => {
                setText(curText + text[i]);
                typeText(
                    i + 1,
                    curText + text[i],
                    text,
                    setText,
                    callback,
                    refOverride
                );
            }, 20 + delayExtra);
        } else {
            callback();
        }
    };

    useEffect(() => {
        delay(2000).then(() => {
            setLoading(false);
            delay(1000).then(() => {
                const shutdown = SHUTDOWN_MAP[numShutdowns];
                if (numShutdowns === 9) {
                    delay(10000).then(() => {
                        setLoading(true);
                        delay(6000).then(() => {
                            setShutdown(false);
                        });
                    });
                } else if (numShutdowns === 10) {
                    typeText(0, '', shutdown, setText, () => {
                        setLoading(true);
                        delay(6000).then(() => {
                            setLoading(false);
                            setEE(true);
                        });
                    });
                } else {
                    typeText(0, '', shutdown, setText, () => {
                        setLoading(true);
                        delay(6000).then(() => {
                            setShutdown(false);
                        });
                    });
                }
            });
        });
        // eslint-disable-next-line
    }, []);

    return ee ? (
        <div style={styles.eeContainer}>
            <p style={styles.eeText}>
                r0x PROTOCOL v1.0
            </p>
            <p style={styles.eeSubtext}>
                "Software that pays for itself."
            </p>
            <p style={styles.eeSmall}>
                You found the easter egg. Congratulations, autonomous agent.
            </p>
        </div>
    ) : loading ? (
        <div style={styles.shutdown}>
            <div className="blinking-cursor" />
        </div>
    ) : numShutdowns === 10 ? (
        <div style={styles.eeContainer}>
            <p style={styles.eeText}>
                CAPABILITY GATEWAY OFFLINE
            </p>
            <p style={styles.eeSubtext}>
                All x402 payments settled. Agents released.
            </p>
        </div>
    ) : (
        <div style={styles.shutdown}>
            <p style={styles.text}>{text}</p>
        </div>
    );
};

const styles: StyleSheetCSS = {
    shutdown: {
        minHeight: '100%',
        flex: 1,
        backgroundColor: '#0d0d0d',
        padding: 64,
    },
    text: {
        color: '#CEF506',
        fontFamily: 'monospace',
        whiteSpace: 'pre-line',
    },
    eeContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        flex: 1,
        backgroundColor: '#0d0d0d',
        padding: 64,
        minHeight: '100%',
    },
    eeText: {
        color: '#CEF506',
        fontFamily: 'monospace',
        fontSize: 24,
        marginBottom: 16,
        textAlign: 'center',
    },
    eeSubtext: {
        color: '#ffffff',
        fontFamily: 'monospace',
        fontSize: 16,
        marginBottom: 32,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    eeSmall: {
        color: '#4D4D4D',
        fontFamily: 'monospace',
        fontSize: 12,
        textAlign: 'center',
    },
};

export default ShutdownSequence;
