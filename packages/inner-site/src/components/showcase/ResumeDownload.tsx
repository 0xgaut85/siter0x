import React from 'react';

export interface ResumeDownloadProps {
    altText?: string;
}

const ResumeDownload: React.FC<ResumeDownloadProps> = ({ altText }) => {
    return (
        <div style={styles.resumeContainer}>
            <div style={styles.docIcon}>
                <span style={styles.docIconText}>📄</span>
            </div>
            <div style={styles.resumeContainerText}>
                <h3>{altText ? altText : 'Read the Whitepaper'}</h3>
                <p style={styles.subtext}>
                    Full protocol specification and technical details.
                </p>
            </div>
        </div>
    );
};

const styles: StyleSheetCSS = {
    resumeContainer: {
        backgroundColor: '#f8f8f8',
        padding: 12,
        boxSizing: 'border-box',
        border: '2px solid #1F1B10',
        borderLeftWidth: 0,
        borderRightWidth: 0,
        width: '100%',
        alignItems: 'center',
        cursor: 'pointer',
    },
    resumeContainerText: {
        flexDirection: 'column',
    },
    subtext: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    docIcon: {
        width: 56,
        height: 48,
        paddingRight: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    docIconText: {
        fontSize: 32,
    },
};

export default ResumeDownload;
