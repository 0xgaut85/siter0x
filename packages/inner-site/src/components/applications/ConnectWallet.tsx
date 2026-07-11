import React, { useCallback, useEffect, useState } from 'react';
import Window from '../os/Window';

export interface ConnectWalletProps extends WindowAppProps {
    onWalletChange?: (address: string | null) => void;
}

const ROBINHOOD_CHAIN_ID = '0x1237'; // 4663
// USDG (Global Dollar) — verified on-chain: name "Global Dollar", 6 decimals, EIP-712 version "1"
const USDG_ADDRESS = '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168';
const USDG_DECIMALS = 6;

// Minimal ERC-20 balanceOf ABI encoded: balanceOf(address)
const encodeBalanceOf = (address: string): string => {
    const clean = address.toLowerCase().replace('0x', '').padStart(64, '0');
    return '0x70a08231' + clean;
};

const formatEth = (weiHex: string): string => {
    const wei = BigInt(weiHex);
    const eth = Number(wei) / 1e18;
    if (eth === 0) return '0';
    if (eth < 0.0001) return '<0.0001';
    return eth.toFixed(4);
};

const formatUsdg = (rawHex: string): string => {
    const raw = BigInt(rawHex);
    const usdg = Number(raw) / 10 ** USDG_DECIMALS;
    if (usdg === 0) return '0';
    if (usdg < 0.01) return '<0.01';
    return usdg.toFixed(2);
};

const truncateAddress = (addr: string): string => {
    return addr.slice(0, 6) + '...' + addr.slice(-4);
};

const ConnectWallet: React.FC<ConnectWalletProps> = (props) => {
    const [address, setAddress] = useState<string | null>(null);
    const [ethBalance, setEthBalance] = useState<string | null>(null);
    const [usdgBalance, setUsdgBalance] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [chainId, setChainId] = useState<string | null>(null);

    const getProvider = (): any => {
        return (window as any).ethereum;
    };

    const fetchBalances = useCallback(async (addr: string) => {
        const provider = getProvider();
        if (!provider) return;

        try {
            // ETH balance
            const ethHex = await provider.request({
                method: 'eth_getBalance',
                params: [addr, 'latest'],
            });
            setEthBalance(formatEth(ethHex));

            // USDG balance via ERC-20 balanceOf
            const usdgHex = await provider.request({
                method: 'eth_call',
                params: [
                    {
                        to: USDG_ADDRESS,
                        data: encodeBalanceOf(addr),
                    },
                    'latest',
                ],
            });
            setUsdgBalance(formatUsdg(usdgHex));
        } catch (err: any) {
            console.error('balance fetch error:', err);
        }
    }, []);

    const switchToRobinhoodChain = useCallback(async () => {
        const provider = getProvider();
        if (!provider) return;

        try {
            await provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: ROBINHOOD_CHAIN_ID }],
            });
        } catch (switchError: any) {
            // Chain not added - try adding it
            if (switchError.code === 4902) {
                try {
                    await provider.request({
                        method: 'wallet_addEthereumChain',
                        params: [
                            {
                                chainId: ROBINHOOD_CHAIN_ID,
                                chainName: 'Robinhood Chain',
                                nativeCurrency: {
                                    name: 'Ether',
                                    symbol: 'ETH',
                                    decimals: 18,
                                },
                                rpcUrls: ['https://rpc.mainnet.chain.robinhood.com'],
                                blockExplorerUrls: ['https://robinhoodchain.blockscout.com'],
                            },
                        ],
                    });
                } catch (addError: any) {
                    setError('failed to add Robinhood Chain network');
                }
            }
        }
    }, []);

    const connect = useCallback(async () => {
        const provider = getProvider();
        if (!provider) {
            setError('no wallet detected. install metamask or rabby.');
            return;
        }

        setIsConnecting(true);
        setError(null);

        try {
            const accounts: string[] = await provider.request({
                method: 'eth_requestAccounts',
            });

            if (accounts.length > 0) {
                const addr = accounts[0];
                setAddress(addr);
                props.onWalletChange?.(addr);

                // Switch to Robinhood Chain
                await switchToRobinhoodChain();

                // Get current chain
                const currentChain = await provider.request({
                    method: 'eth_chainId',
                });
                setChainId(currentChain);

                // Fetch balances
                await fetchBalances(addr);
            }
        } catch (err: any) {
            if (err.code === 4001) {
                setError('connection rejected by user');
            } else {
                setError(err.message || 'connection failed');
            }
        } finally {
            setIsConnecting(false);
        }
    }, [switchToRobinhoodChain, fetchBalances, props]);

    const disconnect = useCallback(() => {
        setAddress(null);
        setEthBalance(null);
        setUsdgBalance(null);
        setChainId(null);
        setError(null);
        props.onWalletChange?.(null);
    }, [props]);

    const refreshBalances = useCallback(() => {
        if (address) {
            fetchBalances(address);
        }
    }, [address, fetchBalances]);

    // Listen for account and chain changes
    useEffect(() => {
        const provider = getProvider();
        if (!provider) return;

        const handleAccountsChanged = (accounts: string[]) => {
            if (accounts.length === 0) {
                disconnect();
            } else {
                const addr = accounts[0];
                setAddress(addr);
                props.onWalletChange?.(addr);
                fetchBalances(addr);
            }
        };

        const handleChainChanged = (newChainId: string) => {
            setChainId(newChainId);
            if (address) {
                fetchBalances(address);
            }
        };

        provider.on('accountsChanged', handleAccountsChanged);
        provider.on('chainChanged', handleChainChanged);

        return () => {
            provider.removeListener('accountsChanged', handleAccountsChanged);
            provider.removeListener('chainChanged', handleChainChanged);
        };
    }, [address, disconnect, fetchBalances, props]);

    const isOnRobinhoodChain = chainId === ROBINHOOD_CHAIN_ID;

    return (
        <Window
            top={80}
            left={180}
            width={420}
            height={360}
            windowTitle="Connect Wallet"
            windowBarIcon="walletIcon"
            windowBarColor="#0d0d0d"
            closeWindow={props.onClose}
            onInteract={props.onInteract}
            minimizeWindow={props.onMinimize}
            bottomLeftText={'Wallet v1.0'}
        >
            <div style={styles.container}>
                {!address ? (
                    // Not connected state
                    <div style={styles.disconnectedContainer}>
                        <div style={styles.walletArt}>
                            <span style={styles.walletEmoji}>{'{ }'}</span>
                        </div>
                        <p style={styles.statusText}>no wallet connected</p>
                        <p style={styles.subtitleText}>
                            connect metamask, rabby, coinbase wallet or any eip-1193 provider
                        </p>

                        <div
                            onMouseDown={isConnecting ? undefined : connect}
                            style={Object.assign(
                                {},
                                styles.connectButton,
                                isConnecting && styles.buttonDisabled
                            )}
                        >
                            <span style={styles.connectButtonText}>
                                {isConnecting ? 'connecting...' : 'connect wallet'}
                            </span>
                        </div>

                        {error && (
                            <p style={styles.errorText}>[error] {error}</p>
                        )}
                    </div>
                ) : (
                    // Connected state
                    <div style={styles.connectedContainer}>
                        {/* Address */}
                        <div style={styles.addressRow}>
                            <span style={styles.addressLabel}>address</span>
                            <span style={styles.addressValue}>
                                {truncateAddress(address)}
                            </span>
                        </div>

                        {/* Network */}
                        <div style={styles.networkRow}>
                            <span style={styles.networkLabel}>network</span>
                            <span
                                style={Object.assign(
                                    {},
                                    styles.networkValue,
                                    isOnRobinhoodChain
                                        ? styles.networkOnChain
                                        : styles.networkOffChain
                                )}
                            >
                                {isOnRobinhoodChain ? 'robinhood chain' : `chain ${parseInt(chainId || '0', 16)}`}
                            </span>
                            {!isOnRobinhoodChain && (
                                <div
                                    onMouseDown={switchToRobinhoodChain}
                                    style={styles.switchButton}
                                >
                                    <span style={styles.switchButtonText}>
                                        switch network
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Divider */}
                        <div style={styles.divider} />

                        {/* ETH Balance */}
                        <div style={styles.balanceRow}>
                            <span style={styles.balanceLabel}>ETH</span>
                            <span style={styles.balanceValue}>
                                {ethBalance !== null ? ethBalance : '...'}
                            </span>
                        </div>

                        {/* USDG Balance */}
                        <div style={styles.balanceRow}>
                            <span style={styles.balanceLabel}>USDG</span>
                            <span style={styles.balanceValue}>
                                {usdgBalance !== null ? usdgBalance : '...'}
                            </span>
                        </div>

                        {/* Divider */}
                        <div style={styles.divider} />

                        {/* Actions */}
                        <div style={styles.actionsRow}>
                            <div
                                onMouseDown={refreshBalances}
                                style={styles.actionButton}
                            >
                                <span style={styles.actionButtonText}>
                                    refresh
                                </span>
                            </div>
                            <div
                                onMouseDown={disconnect}
                                style={styles.disconnectButton}
                            >
                                <span style={styles.disconnectButtonText}>
                                    disconnect
                                </span>
                            </div>
                        </div>

                        {error && (
                            <p style={styles.errorText}>[error] {error}</p>
                        )}
                    </div>
                )}
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
        padding: 16,
    },
    disconnectedContainer: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
    },
    walletArt: {
        marginBottom: 16,
    },
    walletEmoji: {
        fontSize: 36,
        fontFamily: 'monospace',
        color: '#CEF506',
    },
    statusText: {
        fontFamily: 'monospace',
        fontSize: 14,
        color: '#f0f0f0',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitleText: {
        fontFamily: 'monospace',
        fontSize: 10,
        color: '#666',
        marginBottom: 24,
        textAlign: 'center',
        maxWidth: 280,
        lineHeight: 1.5,
    },
    connectButton: {
        padding: '10px 28px',
        border: '1px solid #CEF506',
        cursor: 'pointer',
        backgroundColor: '#CEF506',
    },
    connectButtonText: {
        fontFamily: 'monospace',
        fontSize: 12,
        color: '#1F1B10',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    buttonDisabled: {
        opacity: 0.5,
        cursor: 'default',
    },
    errorText: {
        fontFamily: 'monospace',
        fontSize: 10,
        color: '#ff4444',
        marginTop: 12,
        textAlign: 'center',
    },
    connectedContainer: {
        flex: 1,
        flexDirection: 'column',
    },
    addressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    addressLabel: {
        fontFamily: 'monospace',
        fontSize: 10,
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    addressValue: {
        fontFamily: 'monospace',
        fontSize: 13,
        color: '#CEF506',
        letterSpacing: 0.5,
    },
    networkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    networkLabel: {
        fontFamily: 'monospace',
        fontSize: 10,
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginRight: 8,
    },
    networkValue: {
        fontFamily: 'monospace',
        fontSize: 12,
    },
    networkOnChain: {
        color: '#00ff88',
    },
    networkOffChain: {
        color: '#ffaa00',
    },
    switchButton: {
        padding: '2px 8px',
        border: '1px solid #CEF506',
        cursor: 'pointer',
        marginLeft: 8,
    },
    switchButtonText: {
        fontFamily: 'monospace',
        fontSize: 9,
        color: '#CEF506',
        textTransform: 'uppercase',
    },
    divider: {
        height: 1,
        backgroundColor: '#222',
        marginTop: 8,
        marginBottom: 16,
    },
    balanceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
        paddingLeft: 4,
        paddingRight: 4,
    },
    balanceLabel: {
        fontFamily: 'monospace',
        fontSize: 13,
        color: '#888',
        fontWeight: 'bold',
    },
    balanceValue: {
        fontFamily: 'monospace',
        fontSize: 16,
        color: '#f0f0f0',
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
    },
    actionButton: {
        padding: '6px 16px',
        border: '1px solid #444',
        cursor: 'pointer',
    },
    actionButtonText: {
        fontFamily: 'monospace',
        fontSize: 10,
        color: '#aaa',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    disconnectButton: {
        padding: '6px 16px',
        border: '1px solid #ff4444',
        cursor: 'pointer',
    },
    disconnectButtonText: {
        fontFamily: 'monospace',
        fontSize: 10,
        color: '#ff4444',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
};

export default ConnectWallet;
