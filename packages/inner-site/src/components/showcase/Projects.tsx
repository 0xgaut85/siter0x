import React, { useState } from 'react';
import { useNavigate } from 'react-router';

export interface IntegrationsProps {}

interface IntegrationBoxProps {
    title: string;
    subtitle: string;
    description: string;
    route: string;
    badge: string;
}

const IntegrationBox: React.FC<IntegrationBoxProps> = ({
    title,
    subtitle,
    description,
    route,
    badge,
}) => {
    const [, setIsHovering] = useState(false);
    const navigation = useNavigate();

    const handleClick = () => {
        navigation(`/integrations/${route}`);
    };

    return (
        <div
            onMouseDown={handleClick}
            className="big-button-container"
            style={styles.integrationLink}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            <div style={styles.integrationLinkLeft}>
                <div style={styles.badge}>
                    <span style={styles.badgeText}>{badge}</span>
                </div>
                <div style={styles.integrationText}>
                    <h1 style={{ fontSize: 36 }}>{title}</h1>
                    <h3>{subtitle}</h3>
                </div>
            </div>
            <div style={styles.integrationDescription}>
                <p style={styles.descriptionText}>{description}</p>
            </div>
        </div>
    );
};

const Integrations: React.FC<IntegrationsProps> = (props) => {
    return (
        <div className="site-page-content">
            <h1>Integrations</h1>
            <h3>What r0x Runs On</h3>
            <br />
            <p>
                r0x is built on top of real protocols that are live in
                production today, all settling in <b>USDG on Robinhood
                Chain</b>. Every capability is a plain HTTP skill. x402
                handles payment at the HTTP layer. ERC-8004 is next on the
                roadmap for on-chain agent identity.
            </p>
            <br />
            <div style={styles.integrationLinksContainer}>
                <IntegrationBox
                    badge="EXECUTION"
                    title="r0x Skills"
                    subtitle="SKILL FORMAT"
                    description="Each skill has a manifest, a price and a handler. The full catalog is browsable at /skill/catalog."
                    route="skills"
                />
                <IntegrationBox
                    badge="PAYMENT"
                    title="x402"
                    subtitle="HTTP 402 PAYMENTS"
                    description="Every skill call is paywalled with a self-hosted x402 v2 facilitator. Clients sign an EIP-3009 USDG transfer on Robinhood Chain and retry with the PAYMENT-SIGNATURE header. $0.01 per call."
                    route="x402"
                />
                <IntegrationBox
                    badge="SDK"
                    title="r0x OS"
                    subtitle="NPM PACKAGE + CLAUDE PLUGIN"
                    description="TypeScript SDK and Claude Code plugin. Handles x402 payment signing, wallet setup and all eight skills out of the box. Install via npm install r0x-os or /plugin marketplace add nhevers/project-r0x."
                    route="skills"
                />
                <IntegrationBox
                    badge="ROADMAP"
                    title="ERC-8004"
                    subtitle="AGENT IDENTITY"
                    description="On-chain identity and trust scoring for autonomous agents. Not yet in production. Planned to complement the existing x402 + skill stack."
                    route="erc8004"
                />
            </div>
        </div>
    );
};

const styles: StyleSheetCSS = {
    integrationLinksContainer: {
        flexDirection: 'column',
        width: '100%',
        display: 'flex',
        flex: 1,
    },
    integrationLink: {
        marginBottom: 24,
        cursor: 'pointer',
        width: '100%',
        boxSizing: 'border-box',
        flexDirection: 'column',
        padding: 0,
    },
    integrationText: {
        justifyContent: 'center',
        flexDirection: 'column',
    },
    integrationLinkLeft: {
        marginLeft: 16,
        alignItems: 'center',
        marginBottom: 12,
    },
    badge: {
        backgroundColor: '#CEF506',
        padding: '4px 10px',
        marginRight: 16,
    },
    badgeText: {
        color: '#1F1B10',
        fontSize: 10,
        letterSpacing: 2,
        fontWeight: 'bold',
    },
    integrationDescription: {
        marginLeft: 16,
        marginRight: 16,
        marginBottom: 8,
    },
    descriptionText: {
        fontSize: 13,
        lineHeight: 1.5,
        color: '#666',
    },
};

export default Integrations;
