import React, { useRef, useState, useEffect, useCallback } from 'react';
import Window from '../os/Window';

export interface VideoPlayerProps extends WindowAppProps {}

function formatTime(seconds: number): string {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const VideoPlayer: React.FC<VideoPlayerProps> = (props) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(0.8);
    const [isMuted, setIsMuted] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isSeeking, setIsSeeking] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const videoSrc = process.env.PUBLIC_URL + '/ad.mp4';

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onTimeUpdate = () => {
            if (!isSeeking) setCurrentTime(video.currentTime);
        };
        const onLoadedMetadata = () => {
            setDuration(video.duration);
            setIsLoaded(true);
        };
        const onEnded = () => setIsPlaying(false);
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);

        video.addEventListener('timeupdate', onTimeUpdate);
        video.addEventListener('loadedmetadata', onLoadedMetadata);
        video.addEventListener('ended', onEnded);
        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);

        return () => {
            video.removeEventListener('timeupdate', onTimeUpdate);
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('ended', onEnded);
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
        };
    }, [isSeeking]);

    const togglePlay = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    }, []);

    const toggleMute = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        video.muted = !video.muted;
        setIsMuted(!isMuted);
    }, [isMuted]);

    const handleVolumeChange = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const video = videoRef.current;
        const target = e.currentTarget;
        if (!video || !target) return;
        const rect = target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const newVol = Math.max(0, Math.min(1, x / rect.width));
        video.volume = newVol;
        setVolume(newVol);
        if (newVol > 0 && isMuted) {
            video.muted = false;
            setIsMuted(false);
        }
    }, [isMuted]);

    const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const video = videoRef.current;
        const target = e.currentTarget;
        if (!video || !target) return;
        const rect = target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = Math.max(0, Math.min(1, x / rect.width));
        video.currentTime = pct * video.duration;
        setCurrentTime(pct * video.duration);
    }, []);

    const handleSeekStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        setIsSeeking(true);
        handleSeek(e);

        const onMove = (ev: MouseEvent) => {
            const target = progressRef.current;
            const video = videoRef.current;
            if (!target || !video) return;
            const rect = target.getBoundingClientRect();
            const x = ev.clientX - rect.left;
            const pct = Math.max(0, Math.min(1, x / rect.width));
            video.currentTime = pct * video.duration;
            setCurrentTime(pct * video.duration);
        };

        const onUp = () => {
            setIsSeeking(false);
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [handleSeek]);

    const skipBack = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        video.currentTime = Math.max(0, video.currentTime - 10);
    }, []);

    const skipForward = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        video.currentTime = Math.min(video.duration, video.currentTime + 10);
    }, []);

    const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <Window
            top={50}
            left={150}
            width={720}
            height={520}
            windowTitle="intro.mp4"
            windowBarIcon="windowVideoIcon"
            windowBarColor="#0d0d0d"
            closeWindow={props.onClose}
            onInteract={props.onInteract}
            minimizeWindow={props.onMinimize}
            bottomLeftText={'r0x Media Player'}
        >
            <div style={styles.container}>
                {/* Video area */}
                <div style={styles.videoWrapper} onMouseDown={togglePlay}>
                    <video
                        ref={videoRef}
                        src={videoSrc}
                        style={styles.video}
                        preload="metadata"
                        playsInline
                    />
                    {!isPlaying && isLoaded && (
                        <div style={styles.playOverlay}>
                            <div style={styles.playOverlayIcon}>▶</div>
                        </div>
                    )}
                    {!isLoaded && (
                        <div style={styles.loadingOverlay}>
                            <span style={styles.loadingText}>Loading...</span>
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div style={styles.controls}>
                    {/* Progress bar */}
                    <div
                        ref={progressRef}
                        style={styles.progressBar}
                        onMouseDown={handleSeekStart}
                    >
                        <div style={styles.progressTrack}>
                            <div
                                style={{
                                    ...styles.progressFill,
                                    width: `${progressPct}%`,
                                }}
                            />
                            <div
                                style={{
                                    ...styles.progressThumb,
                                    left: `${progressPct}%`,
                                }}
                            />
                        </div>
                    </div>

                    {/* Button row */}
                    <div style={styles.buttonRow}>
                        <div style={styles.leftControls}>
                            {/* Skip back */}
                            <div
                                style={styles.controlBtn}
                                onMouseDown={skipBack}
                                title="Back 10s"
                            >
                                <span style={styles.controlBtnText}>⏪</span>
                            </div>

                            {/* Play / Pause */}
                            <div
                                style={styles.playPauseBtn}
                                onMouseDown={togglePlay}
                            >
                                <span style={styles.playPauseBtnText}>
                                    {isPlaying ? '⏸' : '▶'}
                                </span>
                            </div>

                            {/* Skip forward */}
                            <div
                                style={styles.controlBtn}
                                onMouseDown={skipForward}
                                title="Forward 10s"
                            >
                                <span style={styles.controlBtnText}>⏩</span>
                            </div>

                            {/* Time display */}
                            <span style={styles.timeText}>
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </span>
                        </div>

                        <div style={styles.rightControls}>
                            {/* Volume */}
                            <div
                                style={styles.controlBtn}
                                onMouseDown={toggleMute}
                                title={isMuted ? 'Unmute' : 'Mute'}
                            >
                                <span style={styles.controlBtnText}>
                                    {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
                                </span>
                            </div>
                            <div
                                style={styles.volumeBar}
                                onMouseDown={handleVolumeChange}
                            >
                                <div style={styles.volumeTrack}>
                                    <div
                                        style={{
                                            ...styles.volumeFill,
                                            width: `${(isMuted ? 0 : volume) * 100}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
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
    videoWrapper: {
        flex: 1,
        backgroundColor: '#000',
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        cursor: 'pointer',
    },
    video: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        display: 'block',
    },
    playOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    playOverlayIcon: {
        width: 60,
        height: 60,
        borderRadius: 0,
        backgroundColor: 'rgba(232, 101, 26, 0.85)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: 28,
        color: '#fff',
        border: '2px solid rgba(255,255,255,0.3)',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0d0d0d',
    },
    loadingText: {
        color: '#CEF506',
        fontFamily: 'monospace',
        fontSize: 14,
        letterSpacing: 2,
    },
    controls: {
        flexDirection: 'column',
        backgroundColor: '#1a1a1a',
        borderTop: '1px solid #333',
        padding: '6px 8px',
        flexShrink: 0,
    },
    progressBar: {
        height: 16,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        paddingBottom: 4,
    },
    progressTrack: {
        flex: 1,
        height: 6,
        backgroundColor: '#333',
        position: 'relative',
        border: '1px solid #555',
        borderTopColor: '#222',
        borderLeftColor: '#222',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#CEF506',
        position: 'absolute',
        top: 0,
        left: 0,
    },
    progressThumb: {
        width: 10,
        height: 14,
        backgroundColor: '#c3c6ca',
        position: 'absolute',
        top: -4,
        marginLeft: -5,
        border: '1px solid #fff',
        borderBottomColor: '#86898d',
        borderRightColor: '#86898d',
    },
    buttonRow: {
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 2,
    },
    leftControls: {
        alignItems: 'center',
        gap: 4,
    },
    rightControls: {
        alignItems: 'center',
        gap: 4,
    },
    controlBtn: {
        width: 28,
        height: 24,
        backgroundColor: '#c3c6ca',
        border: '1px solid #fff',
        borderBottomColor: '#86898d',
        borderRightColor: '#86898d',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer',
        flexShrink: 0,
    },
    controlBtnText: {
        fontSize: 12,
        lineHeight: 1,
    },
    playPauseBtn: {
        width: 36,
        height: 28,
        backgroundColor: '#c3c6ca',
        border: '2px solid #fff',
        borderBottomColor: '#86898d',
        borderRightColor: '#86898d',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer',
        flexShrink: 0,
    },
    playPauseBtnText: {
        fontSize: 14,
        lineHeight: 1,
    },
    timeText: {
        color: '#ccc',
        fontFamily: 'monospace',
        fontSize: 11,
        marginLeft: 8,
        whiteSpace: 'nowrap',
    },
    volumeBar: {
        width: 60,
        height: 16,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
    },
    volumeTrack: {
        flex: 1,
        height: 4,
        backgroundColor: '#333',
        position: 'relative',
        border: '1px solid #555',
        borderTopColor: '#222',
        borderLeftColor: '#222',
    },
    volumeFill: {
        height: '100%',
        backgroundColor: '#CEF506',
        position: 'absolute',
        top: 0,
        left: 0,
    },
};

export default VideoPlayer;
