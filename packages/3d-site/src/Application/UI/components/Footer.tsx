import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FooterProps {
    visible: boolean;
    onOpenModal?: (modal: 'privacy' | 'terms') => void;
}

interface FooterNavItem {
    label: string;
    href?: string;
    isHeader?: boolean;
    children?: { label: string; href: string }[];
}

const FOOTER_NAV: FooterNavItem[] = [
    {
        label: 'Platform',
        isHeader: true,
        children: [
            { label: 'x402 Server', href: '#' },
            { label: 'r0x Facilitator', href: '#' },
            { label: 'Docs', href: '/os/' },
            { label: 'Contact', href: '#' },
        ],
    },
    {
        label: 'Community',
        isHeader: true,
        children: [
            { label: 'Telegram', href: '#' },
            { label: 'Twitter/X', href: 'https://x.com/projectR0X' },
            { label: 'GitHub', href: 'https://github.com/nhevers/project-r0x' },
        ],
    },
];

const currentYear = new Date().getFullYear();

const Footer: React.FC<FooterProps> = ({ visible, onOpenModal }) => {
    const [expanded, setExpanded] = useState(false);

    const toggleExpand = useCallback(() => {
        setExpanded((prev) => !prev);
    }, []);

    if (!visible) return null;

    return (
        <>
            {/* ===== Collapsed footer bar (always visible) ===== */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut', delay: 0.5 }}
                style={styles.collapsedBar}
            >
                <div style={styles.collapsedInner}>
                    <span style={styles.collapsedBrand}>r0x</span>
                    <div style={styles.collapsedRight}>
                        <div style={styles.collapsedLinks}>
                            <button
                                style={styles.legalLinkBtn}
                                onClick={() => onOpenModal && onOpenModal('privacy')}
                            >
                                Privacy Policy
                            </button>
                            <span style={styles.collapsedSep}>·</span>
                            <button
                                style={styles.legalLinkBtn}
                                onClick={() => onOpenModal && onOpenModal('terms')}
                            >
                                Terms of Use
                            </button>
                        </div>
                        <span style={styles.collapsedCopy}>
                            ©{currentYear} r0x.
                        </span>
                        <button
                            style={styles.expandButton}
                            onClick={toggleExpand}
                            aria-label={expanded ? 'Collapse footer' : 'Expand footer'}
                        >
                            <motion.span
                                animate={{ rotate: expanded ? 180 : 0 }}
                                transition={{ duration: 0.3 }}
                                style={styles.expandArrow}
                            >
                                ▲
                            </motion.span>
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* ===== Expanded footer overlay ===== */}
            <AnimatePresence>
                {expanded && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            key="footer-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            style={styles.backdrop}
                            onClick={toggleExpand}
                        />

                        {/* Full footer */}
                        <motion.footer
                            key="footer-full"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{
                                type: 'tween',
                                duration: 0.5,
                                ease: [0.4, 0, 0.2, 1],
                            }}
                            style={styles.footer}
                        >
                            {/* Close button */}
                            <button
                                style={styles.footerCloseBtn}
                                onClick={toggleExpand}
                                aria-label="Close footer"
                                onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.opacity = '0.6';
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.opacity = '1';
                                }}
                            >
                                <span style={styles.footerCloseIcon}>×</span>
                            </button>

                            {/* Coral outer section */}
                            <div style={styles.footerContent}>
                                {/* Subscribe section */}
                                <div style={styles.subscribeSection}>
                                    <label
                                        htmlFor="footer-email"
                                        style={styles.subscribeLabel}
                                    >
                                        Sign up for updates
                                    </label>
                                    <div style={styles.subscribeRow}>
                                        <input
                                            id="footer-email"
                                            type="email"
                                            placeholder="Enter your email address"
                                            style={styles.subscribeInput}
                                        />
                                        <button style={styles.subscribeBtn}>
                                            Subscribe
                                        </button>
                                    </div>
                                    <div style={styles.subscribeLine} />
                                </div>

                                {/* Dark inner block */}
                                <div style={styles.footerBlock}>
                                    {/* Logo + nav columns */}
                                    <div style={styles.blockContent1}>
                                        {/* Footer logo */}
                                        <div style={styles.footerLogo}>
                                            <img src="/logo.svg" alt="r0x" style={styles.footerLogoImg} />
                                        </div>

                                        {/* Nav columns */}
                                        {renderNavColumns(onOpenModal, toggleExpand)}
                                    </div>

                                    {/* Copyright row inside dark block */}
                                    <div style={styles.copyRow1}>
                                        <span style={styles.copyItem1}>
                                            ©{currentYear} r0x.
                                        </span>
                                        <button
                                            style={styles.copyLink1}
                                            onClick={() =>
                                                onOpenModal && onOpenModal('privacy')
                                            }
                                        >
                                            Privacy Policy
                                        </button>
                                        <button
                                            style={styles.copyLink1}
                                            onClick={() =>
                                                onOpenModal && onOpenModal('terms')
                                            }
                                        >
                                            Terms of Use
                                        </button>
                                    </div>

                                    {/* Large decorative title */}
                                    <div style={styles.footerTitle}>
                                        <span style={styles.footerTitleText}>r0x</span>
                                    </div>
                                </div>

                                {/* Copyright row on coral */}
                                <div style={styles.copyRow2}>
                                    <span style={styles.copyItem2}>
                                        ©{currentYear} r0x.
                                    </span>
                                    <button
                                        style={styles.copyLink2}
                                        onClick={() =>
                                            onOpenModal && onOpenModal('privacy')
                                        }
                                    >
                                        Privacy Policy
                                    </button>
                                    <button
                                        style={styles.copyLink2}
                                        onClick={() =>
                                            onOpenModal && onOpenModal('terms')
                                        }
                                    >
                                        Terms of Use
                                    </button>
                                </div>
                            </div>
                        </motion.footer>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

/* ===== Nav columns helper ===== */
function renderNavColumns(
    onOpenModal?: (modal: 'privacy' | 'terms') => void,
    onClose?: () => void
) {
    // Group: column 1 = Platform + subs, column 2 = Community + subs
    return (
        <div style={styles.navColumnsWrapper}>
            {/* Column 1 — Platform */}
            <ul style={styles.navColumn}>
                <li style={styles.navItem}>
                    <span style={styles.navItemHeader}>
                        Platform<sup style={styles.navSup}>3</sup>
                    </span>
                    <ul style={styles.subList}>
                        <li style={styles.subItem}>
                            <a href="#" style={styles.subItemLink}>
                                x402 Server
                            </a>
                        </li>
                        <li style={styles.subItem}>
                            <a href="#" style={styles.subItemLink}>
                                r0x Facilitator
                            </a>
                        </li>
                        <li style={styles.subItem}>
                            <a href="/os/" style={styles.subItemLink}>
                                Docs
                            </a>
                        </li>
                        <li style={styles.subItem}>
                            <a href="#" style={styles.subItemLink}>
                                Contact
                            </a>
                        </li>
                    </ul>
                </li>
            </ul>

            {/* Column 2 — Community */}
            <ul style={styles.navColumn}>
                <li style={styles.navItem}>
                    <span style={styles.navItemHeader}>
                        Community<sup style={styles.navSup}>3</sup>
                    </span>
                    <ul style={styles.subList}>
                        <li style={styles.subItem}>
                            <a href="#" style={styles.subItemLink}>
                                Telegram
                            </a>
                        </li>
                        <li style={styles.subItem}>
                            <a href="https://x.com/projectR0X" style={styles.subItemLink} target="_blank" rel="noopener noreferrer">
                                Twitter/X
                            </a>
                        </li>
                        <li style={styles.subItem}>
                            <a href="https://github.com/nhevers/project-r0x" style={styles.subItemLink} target="_blank" rel="noopener noreferrer">
                                GitHub
                            </a>
                        </li>
                    </ul>
                </li>
            </ul>
        </div>
    );
}

/* ===== Styles (Shift5 footer replica) ===== */
const styles: StyleSheetCSS = {
    /* --- Collapsed bar --- */
    collapsedBar: {
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        zIndex: 90,
        pointerEvents: 'none',
        padding: '0 20px 20px 20px',
        boxSizing: 'border-box',
    },
    collapsedInner: {
        backgroundColor: '#1F1B10',
        clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
        padding: '12px 24px',
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
    },
    collapsedBrand: {
        fontFamily: "'Inter', sans-serif",
        fontSize: 12,
        fontWeight: 700,
        color: '#CEF506',
        letterSpacing: 0,
    },
    collapsedRight: {
        display: 'flex',
        alignItems: 'center',
        gap: 16,
    },
    collapsedLinks: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
    },
    legalLinkBtn: {
        background: 'none',
        border: 'none',
        padding: 0,
        fontFamily: "'Space Mono', monospace",
        fontSize: 11,
        color: '#CEF506',
        cursor: 'pointer',
        outline: 'none',
        textDecoration: 'none',
        transition: 'opacity 0.2s ease',
    },
    collapsedSep: {
        color: '#4D4D4D',
        fontSize: 11,
    },
    collapsedCopy: {
        fontFamily: "'Space Mono', monospace",
        fontSize: 11,
        color: '#8B8B8B',
    },
    expandButton: {
        background: 'none',
        border: 'none',
        padding: '4px 8px',
        cursor: 'pointer',
        outline: 'none',
    },
    expandArrow: {
        display: 'inline-block',
        fontSize: 10,
        color: '#8B8B8B',
    },

    /* --- Backdrop --- */
    backdrop: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        zIndex: 89,
        pointerEvents: 'auto',
    },

    /* --- Full footer --- */
    footer: {
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        backgroundColor: '#CEF506',
        zIndex: 91,
        boxSizing: 'border-box',
        maxHeight: '90vh',
        overflowY: 'auto',
        clipPath: 'polygon(0 0, calc(100% - 32px) 0, 100% 32px, 100% 100%, 32px 100%, 0 calc(100% - 32px))',
        pointerEvents: 'auto',
    },
    footerContent: {
        position: 'relative',
        zIndex: 1,
        padding: '40px 40px 16px',
        boxSizing: 'border-box',
    },

    /* --- Subscribe --- */
    subscribeSection: {
        marginBottom: 24,
        position: 'relative',
    },
    subscribeLabel: {
        display: 'block',
        fontFamily: "'Inter', sans-serif",
        fontSize: 14,
        fontWeight: 400,
        color: '#1F1B10',
        marginBottom: 8,
    },
    subscribeRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        position: 'relative',
    },
    subscribeInput: {
        flex: 1,
        background: 'none',
        border: 'none',
        borderBottom: '1px solid #1F1B10',
        padding: '12px 0',
        fontFamily: "'Inter', sans-serif",
        fontSize: 18,
        fontWeight: 400,
        color: '#1F1B10',
        outline: 'none',
    },
    subscribeBtn: {
        backgroundColor: '#1F1B10',
        color: '#CEF506',
        fontFamily: "'Space Mono', monospace",
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: -0.24,
        border: 'none',
        borderRadius: 24,
        padding: '12px 24px',
        cursor: 'pointer',
        outline: 'none',
        whiteSpace: 'nowrap',
    },
    subscribeLine: {
        height: 1,
        backgroundColor: '#1F1B10',
        marginTop: -1,
    },

    /* --- Dark inner block --- */
    footerBlock: {
        backgroundColor: '#1F1B10',
        clipPath: 'polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 24px 100%, 0 calc(100% - 24px))',
        padding: '56px 40px 40px',
        marginBottom: 16,
        position: 'relative',
        overflow: 'hidden',
    },

    /* --- Block content row 1 (logo + navs) --- */
    blockContent1: {
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 0,
        marginBottom: 40,
    },
    footerLogo: {
        width: 160,
        marginRight: 120,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'flex-start',
    },
    footerLogoImg: {
        height: 80,
        width: 'auto',
        display: 'block',
    },

    /* --- Nav columns --- */
    navColumnsWrapper: {
        display: 'flex',
        flex: 1,
        gap: 0,
        flexWrap: 'wrap',
    },
    navColumn: {
        listStyle: 'none',
        margin: 0,
        padding: 0,
        marginRight: 80,
        minWidth: 120,
    },
    navColumnWide: {
        minWidth: 200,
        paddingRight: 40,
    },
    navItem: {
        listStyle: 'none',
        marginBottom: 0,
    },
    navItemLink: {
        display: 'block',
        fontFamily: "'Inter', sans-serif",
        fontSize: 24,
        fontWeight: 400,
        color: '#CEF506',
        textDecoration: 'none',
        lineHeight: '32px',
        transition: 'opacity 0.2s ease',
        cursor: 'pointer',
    },
    navItemHeader: {
        display: 'block',
        fontFamily: "'Inter', sans-serif",
        fontSize: 24,
        fontWeight: 400,
        color: '#CEF506',
        lineHeight: '32px',
    },
    navSup: {
        fontFamily: "'Space Mono', monospace",
        fontSize: 12,
        verticalAlign: 'super',
        marginLeft: 2,
    },
    subList: {
        listStyle: 'none',
        margin: 0,
        padding: 0,
    },
    subItem: {
        listStyle: 'none',
    },
    subItemLink: {
        display: 'block',
        fontFamily: "'Inter', sans-serif",
        fontSize: 24,
        fontWeight: 400,
        color: '#CEF506',
        textDecoration: 'none',
        paddingLeft: 32,
        lineHeight: '32px',
        transition: 'opacity 0.2s ease',
        cursor: 'pointer',
    },

    /* --- Copyright row 1 (inside dark block) --- */
    copyRow1: {
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
    },
    copyItem1: {
        fontFamily: "'Space Mono', monospace",
        fontSize: 12,
        color: '#CEF506',
    },
    copyLink1: {
        background: 'none',
        border: 'none',
        padding: 0,
        fontFamily: "'Space Mono', monospace",
        fontSize: 12,
        color: '#CEF506',
        cursor: 'pointer',
        outline: 'none',
        textDecoration: 'none',
        transition: 'opacity 0.2s ease',
    },

    /* --- Large decorative title --- */
    footerTitle: {
        overflow: 'hidden',
    },
    footerTitleText: {
        fontFamily: "'Inter', sans-serif",
        fontSize: 160,
        fontWeight: 800,
        color: '#CEF506',
        lineHeight: 0.9,
        letterSpacing: 0,
        display: 'block',
        userSelect: 'none',
        opacity: 0.2,
    },

    /* --- Copyright row 2 (on coral) --- */
    copyRow2: {
        display: 'flex',
        alignItems: 'center',
        gap: 16,
    },
    copyItem2: {
        fontFamily: "'Space Mono', monospace",
        fontSize: 12,
        color: '#1F1B10',
    },
    copyLink2: {
        background: 'none',
        border: 'none',
        padding: 0,
        fontFamily: "'Space Mono', monospace",
        fontSize: 12,
        color: '#1F1B10',
        cursor: 'pointer',
        outline: 'none',
        textDecoration: 'none',
        transition: 'opacity 0.2s ease',
    },

    /* --- Footer close button --- */
    footerCloseBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 40,
        height: 40,
        borderRadius: '50%',
        border: '1.5px solid #1F1B10',
        background: 'none',
        cursor: 'pointer',
        outline: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        transition: 'opacity 0.2s ease',
        padding: 0,
    },
    footerCloseIcon: {
        fontSize: 22,
        color: '#1F1B10',
        lineHeight: 1,
        fontFamily: "'Inter', sans-serif",
        fontWeight: 300,
    },
};

export default Footer;
