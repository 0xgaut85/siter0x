import React, { useEffect, useState, useCallback, useRef } from 'react';
import Window from '../os/Window';
import { buildPaymentSignatureHeader, getApiBase } from '../../utils/x402';

export interface PinionAgentProps extends WindowAppProps {}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

const renderMarkdown = (text: string): React.ReactNode => {
    // Split by **bold** markers. Odd indices are bold text.
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) => {
        if (i % 2 === 1) {
            return <strong key={i}>{part}</strong>;
        }
        return part;
    });
};

const PinionAgent: React.FC<PinionAgentProps> = (props) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'assistant',
            content:
                'im the r0x agent. ask me anything about the protocol, how x402 works, the skill catalog, erc-8004 identity stuff... whatever you want to know.',
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop =
                containerRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    // Focus input on mount
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    // Detect connected wallet
    useEffect(() => {
        const provider = (window as any).ethereum;
        if (!provider) return;

        provider.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
            if (accounts.length > 0) setWalletAddress(accounts[0]);
        }).catch(() => {});

        const handleAccountsChanged = (accounts: string[]) => {
            setWalletAddress(accounts.length > 0 ? accounts[0] : null);
        };
        provider.on('accountsChanged', handleAccountsChanged);
        return () => {
            provider.removeListener('accountsChanged', handleAccountsChanged);
        };
    }, []);

    const sendMessage = useCallback(async () => {
        const trimmed = input.trim();
        if (!trimmed || isLoading) return;
        if (!walletAddress) {
            setError('connect your wallet first to chat ($0.01 USDG per message)');
            return;
        }

        const provider = (window as any).ethereum;
        if (!provider) {
            setError('no wallet provider found');
            return;
        }

        const userMessage: ChatMessage = { role: 'user', content: trimmed };
        const updatedMessages = [...messages, userMessage];

        setMessages(updatedMessages);
        setInput('');
        setIsLoading(true);
        setError(null);
        setPaymentStatus(null);

        try {
            const chatUrl = `${getApiBase()}/skill/chat`;

            // Step 1: Send initial request (will get 402)
            setPaymentStatus('requesting...');
            const initialRes = await fetch(chatUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ messages: updatedMessages }),
            });

            if (initialRes.status !== 402) {
                // Somehow didn't get 402 (shouldn't happen)
                if (initialRes.ok) {
                    const data = await initialRes.json();
                    const assistantMessage: ChatMessage = {
                        role: 'assistant',
                        content: data.response,
                    };
                    setMessages((prev) => [...prev, assistantMessage]);
                    setPaymentStatus(null);
                    setIsLoading(false);
                    return;
                }
                throw new Error(`server returned ${initialRes.status}`);
            }

            // Step 2: Parse the PAYMENT-REQUIRED header and sign the payment
            setPaymentStatus('sign payment in wallet...');
            const { header: paymentHeader } = await buildPaymentSignatureHeader(provider, walletAddress, initialRes);

            // Step 3: Retry with the PAYMENT-SIGNATURE header
            setPaymentStatus('verifying payment...');
            const paidRes = await fetch(chatUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'PAYMENT-SIGNATURE': paymentHeader,
                },
                body: JSON.stringify({ messages: updatedMessages }),
            });

            if (!paidRes.ok) {
                const errData = await paidRes.json().catch(() => ({ error: 'unknown' }));
                throw new Error(errData.error || errData.invalidReason || `server returned ${paidRes.status}`);
            }

            const data = await paidRes.json();
            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: data.response,
            };

            setMessages((prev) => [...prev, assistantMessage]);
            setPaymentStatus(null);
        } catch (err: any) {
            if (err.message?.includes('User denied') || err.message?.includes('user rejected')) {
                setError('payment rejected');
                // Remove the user message since payment was rejected
                setMessages(messages);
            } else {
                setError(err.message || 'failed to reach the agent');
            }
            setPaymentStatus(null);
        } finally {
            setIsLoading(false);
        }
    }, [input, messages, isLoading, walletAddress]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <Window
            top={40}
            left={100}
            width={600}
            height={500}
            windowTitle="r0x Agent"
            windowBarIcon="agentIcon"
            windowBarColor="#0d0d0d"
            closeWindow={props.onClose}
            onInteract={props.onInteract}
            minimizeWindow={props.onMinimize}
            bottomLeftText={walletAddress ? 'x402 gated | $0.01 USDG/msg' : 'connect wallet to chat'}
        >
            <div style={styles.container}>
                {/* Messages area */}
                <div ref={containerRef} style={styles.messagesArea}>
                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            style={Object.assign(
                                {},
                                styles.messageRow,
                                msg.role === 'user'
                                    ? styles.userRow
                                    : styles.agentRow
                            )}
                        >
                            <span
                                style={
                                    msg.role === 'user'
                                        ? styles.userLabel
                                        : styles.agentLabel
                                }
                            >
                                {msg.role === 'user' ? 'you' : 'agent'}
                            </span>
                            <span
                                style={
                                    msg.role === 'user'
                                        ? styles.userText
                                        : styles.agentText
                                }
                            >
                                {renderMarkdown(msg.content)}
                            </span>
                        </div>
                    ))}

                    {/* Typing indicator */}
                    {isLoading && (
                        <div style={Object.assign({}, styles.messageRow, styles.agentRow)}>
                            <span style={styles.agentLabel}>agent</span>
                            <span style={styles.typingIndicator}>
                                {paymentStatus || 'thinking'}
                                <span className="typing-dots">...</span>
                            </span>
                        </div>
                    )}

                    {/* Error display */}
                    {error && (
                        <div style={styles.errorRow}>
                            <span style={styles.errorText}>
                                [error] {error}
                            </span>
                        </div>
                    )}
                </div>

                {/* Input area */}
                <div style={styles.inputArea}>
                    {!walletAddress ? (
                        <div style={styles.walletWarning}>
                            <span style={styles.walletWarningText}>
                                connect wallet to chat ($0.01 USDG/msg via x402)
                            </span>
                        </div>
                    ) : (
                        <>
                            <span style={styles.prompt}>{'>'}</span>
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="ask me anything about r0x..."
                                style={styles.input}
                                disabled={isLoading}
                            />
                            <div
                                onMouseDown={sendMessage}
                                style={Object.assign(
                                    {},
                                    styles.sendButton,
                                    isLoading && styles.sendButtonDisabled
                                )}
                            >
                                <span style={styles.sendText}>send</span>
                            </div>
                        </>
                    )}
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
    messagesArea: {
        flex: 1,
        padding: 12,
        overflowY: 'auto',
        flexDirection: 'column',
        gap: 8,
    },
    messageRow: {
        flexDirection: 'column',
        marginBottom: 12,
    },
    userRow: {},
    agentRow: {},
    userLabel: {
        fontFamily: 'monospace',
        fontSize: 10,
        color: '#00ff88',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    agentLabel: {
        fontFamily: 'monospace',
        fontSize: 10,
        color: '#CEF506',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    userText: {
        fontFamily: 'monospace',
        fontSize: 12,
        lineHeight: 1.6,
        color: '#d0d0d0',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
    },
    agentText: {
        fontFamily: 'monospace',
        fontSize: 12,
        lineHeight: 1.6,
        color: '#f0f0f0',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
    },
    typingIndicator: {
        fontFamily: 'monospace',
        fontSize: 12,
        color: '#CEF506',
        fontStyle: 'italic',
    },
    errorRow: {
        marginBottom: 8,
    },
    errorText: {
        fontFamily: 'monospace',
        fontSize: 11,
        color: '#ff4444',
    },
    inputArea: {
        borderTop: '1px solid #333',
        padding: '8px 12px',
        alignItems: 'center',
        flexShrink: 0,
    },
    walletWarning: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: '4px 0',
    },
    walletWarningText: {
        fontFamily: 'monospace',
        fontSize: 11,
        color: '#ffaa00',
        textAlign: 'center',
    },
    prompt: {
        fontFamily: 'monospace',
        fontSize: 14,
        color: '#CEF506',
        marginRight: 8,
        fontWeight: 'bold',
    },
    input: {
        flex: 1,
        backgroundColor: 'transparent',
        border: 'none',
        outline: 'none',
        fontFamily: 'monospace',
        fontSize: 12,
        color: '#d0d0d0',
        padding: '6px 0',
    },
    sendButton: {
        padding: '4px 14px',
        border: '1px solid #CEF506',
        cursor: 'pointer',
        marginLeft: 8,
        flexShrink: 0,
    },
    sendButtonDisabled: {
        opacity: 0.4,
        cursor: 'default',
    },
    sendText: {
        fontFamily: 'monospace',
        fontSize: 11,
        color: '#CEF506',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
};

export default PinionAgent;
