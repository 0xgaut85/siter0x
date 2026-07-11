import React from 'react';
import { Link } from '../general';
import { useNavigate } from 'react-router';

export interface HomeProps {}

const Home: React.FC<HomeProps> = (props) => {
    const navigate = useNavigate();

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <h1 style={styles.name}>r0x</h1>
                <h2 style={styles.subtitle}>The USDG-native operating system</h2>
                <h2 style={styles.subtitle}>for AI agents</h2>
            </div>
            <div style={styles.tagline}>
                <p style={styles.taglineText}>
                    Building economic execution infrastructure on Robinhood
                    Chain. Machines discover, pay for and execute capabilities
                    in USDG in a single uninterrupted transaction cycle.
                </p>
            </div>
            <div style={styles.buttons}>
                <Link containerStyle={styles.link} to="overview" text="OVERVIEW" />
                <Link
                    containerStyle={styles.link}
                    to="architecture"
                    text="ARCHITECTURE"
                />
                <Link
                    containerStyle={styles.link}
                    to="integrations"
                    text="INTEGRATIONS"
                />
                <Link
                    containerStyle={styles.link}
                    to="developers"
                    text="DEVELOPERS"
                />
            </div>
            <div style={styles.visionContainer}>
                <p style={styles.visionHighlight}>
                    USDG-native economic execution for machine-to-machine
                    commerce on Robinhood Chain.
                </p>
            </div>
        </div>
    );
};

const styles: StyleSheetCSS = {
    page: {
        left: 0,
        right: 0,
        top: 0,
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        height: '100%',
    },
    header: {
        textAlign: 'center',
        marginBottom: 32,
        marginTop: 64,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tagline: {
        textAlign: 'center',
        marginBottom: 48,
        maxWidth: 500,
        paddingLeft: 16,
        paddingRight: 16,
    },
    taglineText: {
        fontSize: 14,
        lineHeight: 1.6,
        color: '#666',
    },
    buttons: {
        justifyContent: 'space-between',
    },
    link: {
        padding: 16,
    },
    visionContainer: {
        marginTop: 48,
        textAlign: 'center',
        flexDirection: 'column',
        alignItems: 'center',
    },
    visionHighlight: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1F1B10',
    },
    name: {
        fontSize: 72,
        marginBottom: 16,
        lineHeight: 0.9,
    },
    subtitle: {
        fontSize: 18,
        fontWeight: 'normal',
        lineHeight: 1.4,
    },
};

export default Home;
