import React, { useEffect, useState } from 'react';
import { Link } from '../general';
import { useLocation, useNavigate } from 'react-router';

export interface VerticalNavbarProps {}

const VerticalNavbar: React.FC<VerticalNavbarProps> = (props) => {
    const location = useLocation();
    const [integrationsExpanded, setIntegrationsExpanded] = useState(false);
    const [isHome, setIsHome] = useState(false);

    const navigate = useNavigate();
    const goToDevelopers = () => {
        navigate('/developers');
    };

    useEffect(() => {
        if (location.pathname.includes('/integrations')) {
            setIntegrationsExpanded(true);
        } else {
            setIntegrationsExpanded(false);
        }
        if (location.pathname === '/') {
            setIsHome(true);
        } else {
            setIsHome(false);
        }
        return () => {};
    }, [location.pathname]);

    return !isHome ? (
        <div style={styles.navbar}>
            <div style={styles.header}>
                <h1 style={styles.headerText}>r0x</h1>
                <h3 style={styles.headerShowcase}>r0x Explorer</h3>
            </div>
            <div style={styles.links}>
                <Link containerStyle={styles.link} to="" text="HOME" />
                <Link containerStyle={styles.link} to="overview" text="OVERVIEW" />
                <Link
                    containerStyle={styles.link}
                    to="architecture"
                    text="ARCHITECTURE"
                />
                <Link
                    containerStyle={Object.assign(
                        {},
                        styles.link,
                        integrationsExpanded && styles.expandedLink
                    )}
                    to="integrations"
                    text="INTEGRATIONS"
                />
                {
                    integrationsExpanded && (
                        <div style={styles.insetLinks}>
                            <Link
                                containerStyle={styles.insetLink}
                                to="integrations/skills"
                                text="SKILLS"
                            />
                            <Link
                                containerStyle={styles.insetLink}
                                to="integrations/x402"
                                text="x402"
                            />
                            <Link
                                containerStyle={styles.insetLink}
                                to="integrations/erc8004"
                                text="ERC-8004"
                            />
                        </div>
                    )
                }
                <Link
                    containerStyle={styles.link}
                    to="developers"
                    text="DEVELOPERS"
                />
            </div>
            <div style={styles.spacer} />
            <div style={styles.forHireContainer} onMouseDown={goToDevelopers}>
            </div>
        </div>
    ) : (
        <></>
    );
};

const styles: StyleSheetCSS = {
    navbar: {
        width: 300,
        height: '100%',
        flexDirection: 'column',
        padding: 48,
        boxSizing: 'border-box',
        position: 'fixed',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'column',
        marginBottom: 64,
    },
    headerText: {
        fontSize: 38,
        lineHeight: 1,
    },
    headerShowcase: {
        marginTop: 12,
    },
    logo: {
        width: '100%',
        marginBottom: 8,
    },
    link: {
        marginBottom: 32,
    },
    expandedLink: {
        marginBottom: 16,
    },
    insetLinks: {
        flexDirection: 'column',
        marginLeft: 32,
        marginBottom: 16,
    },
    insetLink: {
        marginBottom: 8,
    },
    links: {
        flexDirection: 'column',
        flex: 1,
        justifyContent: 'center',
    },
    image: {
        width: '80%',
    },
    spacer: {
        flex: 1,
    },
    forHireContainer: {
        cursor: 'pointer',
        width: '100%',
    },
};

export default VerticalNavbar;
