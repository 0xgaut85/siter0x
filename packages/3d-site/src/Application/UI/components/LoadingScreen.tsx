import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import eventBus from '../EventBus';

type LoadingProps = {};

const LoadingScreen: React.FC<LoadingProps> = () => {
    const [progress, setProgress] = useState(0);
    const [toLoad, setToLoad] = useState(0);
    const [loaded, setLoaded] = useState(0);
    const [overlayOpacity, setLoadingOverlayOpacity] = useState(1);
    const [doneLoading, setDoneLoading] = useState(false);
    const [showEnter, setShowEnter] = useState(false);
    const [webGLError, setWebGLError] = useState(false);
    const [mobileWarning] = useState(window.innerWidth < 768);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('debug')) {
            start();
        } else if (!detectWebGLContext()) {
            setWebGLError(true);
        }
    }, []);

    useEffect(() => {
        eventBus.on('loadedSource', (data) => {
            setProgress(data.progress);
            setToLoad(data.toLoad);
            setLoaded(data.loaded);
        });
    }, []);

    useEffect(() => {
        if (progress >= 1 && !webGLError) {
            setDoneLoading(true);
            setTimeout(() => {
                setShowEnter(true);
            }, 800);
        }
    }, [progress]);

    const start = useCallback(() => {
        setLoadingOverlayOpacity(0);
        eventBus.dispatch('loadingScreenDone', {});
        const ui = document.getElementById('ui');
        if (ui) {
            ui.style.pointerEvents = 'none';
        }
    }, []);

    const detectWebGLContext = () => {
        var canvas = document.createElement('canvas');
        var gl =
            canvas.getContext('webgl') ||
            canvas.getContext('experimental-webgl');
        if (gl && gl instanceof WebGLRenderingContext) {
            return true;
        }
        return false;
    };

    const progressPercent = Math.round(progress * 100);

    return (
        <motion.div
            animate={{ opacity: overlayOpacity }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            style={styles.overlay}
        >
            {/* Main loading content */}
            <AnimatePresence>
                {!showEnter && !webGLError && (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        style={styles.centerContent}
                    >
                        {/* Logo spinner */}
                        <div style={styles.reticleContainer}>
                            <img
                                src="/logo.svg"
                                alt="r0x"
                                style={{
                                    height: 64,
                                    width: 'auto',
                                    opacity: 0.85,
                                }}
                            />
                        </div>

                        {/* Loading text */}
                        <p style={styles.loadingText} className="loading">
                            LOADING
                        </p>

                        {/* Progress bar */}
                        <div style={styles.progressBarContainer}>
                            <motion.div
                                style={styles.progressBarFill}
                                initial={{ width: '0%' }}
                                animate={{ width: `${progressPercent}%` }}
                                transition={{ duration: 0.3, ease: 'easeOut' }}
                            />
                        </div>

                        {/* Progress percentage */}
                        <p style={styles.progressText}>
                            {progressPercent}%
                            {toLoad > 0 && (
                                <span style={styles.progressDetail}>
                                    {' '}
                                    ({loaded}/{toLoad})
                                </span>
                            )}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Enter button */}
            <AnimatePresence>
                {showEnter && !webGLError && (
                    <motion.div
                        key="enter"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        style={styles.centerContent}
                    >
                        <img src="/logo.svg" alt="r0x" style={styles.enterLogo} />
                        {mobileWarning && (
                            <p style={styles.mobileWarning}>
                                Best viewed on desktop
                            </p>
                        )}
                        <motion.button
                            onClick={start}
                            style={styles.enterButton}
                            whileHover={{ scale: 1.05, backgroundColor: '#A9C905' }}
                            whileTap={{ scale: 0.97 }}
                        >
                            ENTER
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* WebGL Error */}
            <AnimatePresence>
                {webGLError && (
                    <motion.div
                        key="error"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        style={styles.centerContent}
                    >
                        <div style={styles.errorContainer}>
                            <p style={styles.errorTitle}>WebGL Required</p>
                            <div style={{ height: 12 }} />
                            <p style={styles.errorBody}>
                                This experience requires WebGL to run.
                            </p>
                            <p style={styles.errorBody}>
                                Please enable it or switch to a supported
                                browser.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const styles: StyleSheetCSS = {
    overlay: {
        backgroundColor: '#1F1B10',
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        boxSizing: 'border-box',
        position: 'relative',
    },
    centerContent: {
        position: 'absolute',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
    },
    enterLogo: {
        height: 48,
        width: 'auto',
        marginBottom: 32,
        opacity: 0.9,
    },
    reticleContainer: {
        marginBottom: 32,
    },
    loadingText: {
        fontFamily: "'Space Mono', monospace",
        fontSize: 14,
        letterSpacing: 4,
        color: '#B9B9B9',
        marginBottom: 24,
        textTransform: 'uppercase',
    },
    progressBarContainer: {
        width: 240,
        height: 2,
        backgroundColor: '#4D4D4D',
        borderRadius: 1,
        overflow: 'hidden',
        marginBottom: 16,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#CEF506',
        borderRadius: 1,
    },
    progressText: {
        fontFamily: "'Space Mono', monospace",
        fontSize: 12,
        color: '#8B8B8B',
        letterSpacing: 2,
    },
    progressDetail: {
        color: '#4D4D4D',
    },
    enterButton: {
        fontFamily: "'Inter', sans-serif",
        fontSize: 16,
        fontWeight: 500,
        letterSpacing: 4,
        color: '#1F1B10',
        backgroundColor: '#CEF506',
        border: 'none',
        borderRadius: 32,
        padding: '16px 56px',
        cursor: 'pointer',
        outline: 'none',
        textTransform: 'uppercase',
        transition: 'background-color 0.2s ease',
    },
    mobileWarning: {
        fontFamily: "'Inter', sans-serif",
        fontSize: 13,
        color: '#8B8B8B',
        marginBottom: 24,
        textAlign: 'center',
    },
    errorContainer: {
        textAlign: 'center',
        padding: 32,
    },
    errorTitle: {
        fontFamily: "'Inter', sans-serif",
        fontSize: 20,
        fontWeight: 600,
        color: '#CEF506',
    },
    errorBody: {
        fontFamily: "'Inter', sans-serif",
        fontSize: 14,
        color: '#B9B9B9',
        lineHeight: '1.6',
    },
};

export default LoadingScreen;
