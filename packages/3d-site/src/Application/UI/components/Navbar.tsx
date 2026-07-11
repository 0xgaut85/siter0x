import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavbarProps {
    visible: boolean;
}

interface NavItem {
    label: string;
    href?: string;
    children?: { label: string; href: string }[];
}

const NAV_ITEMS: NavItem[] = [
    {
        label: 'r0x OS',
        children: [
            { label: 'GitHub', href: 'https://github.com/nhevers/project-r0x' },
            { label: 'X/Twitter', href: 'https://x.com/projectR0X' },
            { label: 'Community', href: '#' },
            { label: 'Docs', href: '/os/' },
            { label: 'x402 Server', href: 'https://www.x402scan.com/server/49a688db-0234-4609-948c-c3eee1719e5d' },
        ],
    },
];

const Navbar: React.FC<NavbarProps> = ({ visible }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [expandedItem, setExpandedItem] = useState<string | null>(null);

    const toggleMenu = useCallback(() => {
        setMenuOpen((prev) => !prev);
        setExpandedItem(null);
    }, []);

    const toggleExpand = useCallback((label: string) => {
        setExpandedItem((prev) => (prev === label ? null : label));
    }, []);

    if (!visible) return null;

    return (
        <>
            {/* ===== Top bar (always visible) ===== */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut', delay: 0.3 }}
                style={styles.desktopMenu}
            >
                <div style={styles.menuContent}>
                    {/* Logo */}
                    <a href="/" style={styles.logoLink}>
                        <img src="/logo.svg" alt="r0x" style={styles.logoImg} />
                    </a>

                    {/* Burger button */}
                    <button
                        style={styles.burger}
                        onClick={toggleMenu}
                        aria-label={menuOpen ? 'Close Navigation' : 'Open Navigation'}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.03)';
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                        }}
                    >
                        {/* Burger lines */}
                        <span style={styles.burgerLines}>
                            <motion.span
                                style={styles.burgerLine1}
                                animate={
                                    menuOpen
                                        ? {
                                              width: 16,
                                              transform:
                                                  'translateY(4px) translateX(8px) rotate(45deg)',
                                          }
                                        : { width: 24, transform: 'none' }
                                }
                                transition={{ duration: 0.5 }}
                            />
                            <motion.span
                                style={styles.burgerLine2}
                                animate={
                                    menuOpen
                                        ? {
                                              width: 16,
                                              transform:
                                                  'translateY(-4px) translateX(-8px) rotate(-45deg)',
                                              alignSelf: 'auto',
                                          }
                                        : {
                                              width: 24,
                                              transform: 'none',
                                              alignSelf: 'flex-end',
                                          }
                                }
                                transition={{ duration: 0.5 }}
                            />
                        </span>

                        {/* Labels */}
                        <span style={styles.burgerLabelWrapper}>
                            <motion.span
                                style={styles.burgerLabel}
                                animate={{ opacity: menuOpen ? 0 : 1 }}
                                transition={{ duration: 0.2 }}
                            >
                                Menu
                            </motion.span>
                            <motion.span
                                style={{
                                    ...styles.burgerLabel,
                                    ...styles.burgerLabelClose,
                                }}
                                animate={{ opacity: menuOpen ? 1 : 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                Close
                            </motion.span>
                        </span>
                    </button>
                </div>
            </motion.div>

            {/* ===== Menu panel ===== */}
            <AnimatePresence>
                {menuOpen && (
                    <>
                        {/* Dimmed backdrop */}
                        <motion.div
                            key="nav-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            style={styles.backdrop}
                            onClick={toggleMenu}
                        />

                        {/* Panel */}
                        <motion.div
                            key="nav-panel"
                            initial={{ opacity: 0, scale: 0.95, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20 }}
                            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                            style={styles.menuPanel}
                        >
                            {/* Panel background layer */}
                            <div style={styles.mobileBg} />

                            {/* Close button */}
                            <button
                                style={styles.panelCloseBtn}
                                onClick={toggleMenu}
                                aria-label="Close Navigation"
                                onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.opacity = '0.6';
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.opacity = '1';
                                }}
                            >
                                <span style={styles.panelCloseIcon}>×</span>
                            </button>

                            {/* Content */}
                            <div style={styles.mobileContent}>
                                <nav style={styles.menuNav}>
                                    <ul style={styles.menuList}>
                                        {NAV_ITEMS.map((item, i) => (
                                            <motion.li
                                                key={item.label}
                                                style={styles.menuItem}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{
                                                    delay: 0.1 + i * 0.06,
                                                    duration: 0.4,
                                                    ease: 'easeOut',
                                                }}
                                            >
                                                {item.children ? (
                                                    /* Expandable submenu item */
                                                    <>
                                                        <button
                                                            style={styles.submenuTitle}
                                                            onClick={() =>
                                                                toggleExpand(item.label)
                                                            }
                                                        >
                                                            {item.label}
                                                            <sup style={styles.submenuCount}>
                                                                {item.children.length}
                                                            </sup>
                                                            <motion.span
                                                                style={styles.expandArrow}
                                                                animate={{
                                                                    rotate:
                                                                        expandedItem ===
                                                                        item.label
                                                                            ? 90
                                                                            : 0,
                                                                }}
                                                                transition={{ duration: 0.2 }}
                                                            >
                                                                ›
                                                            </motion.span>
                                                        </button>
                                                        <AnimatePresence>
                                                            {expandedItem === item.label && (
                                                                <motion.ul
                                                                    style={styles.submenuList}
                                                                    initial={{
                                                                        height: 0,
                                                                        opacity: 0,
                                                                    }}
                                                                    animate={{
                                                                        height: 'auto',
                                                                        opacity: 1,
                                                                    }}
                                                                    exit={{
                                                                        height: 0,
                                                                        opacity: 0,
                                                                    }}
                                                                    transition={{
                                                                        duration: 0.3,
                                                                        ease: 'easeOut',
                                                                    }}
                                                                >
                                                                    {item.children.map(
                                                                        (child) => (
                                                                            <li
                                                                                key={child.label}
                                                                                style={
                                                                                    styles.submenuItem
                                                                                }
                                                                            >
                                                                                <a
                                                                                    href={
                                                                                        child.href
                                                                                    }
                                                                                    style={
                                                                                        styles.submenuItemLink
                                                                                    }
                                                                                    onClick={
                                                                                        toggleMenu
                                                                                    }
                                                                                >
                                                                                    <span
                                                                                        style={
                                                                                            styles.submenuArrow
                                                                                        }
                                                                                    >
                                                                                        ›
                                                                                    </span>
                                                                                    {child.label}
                                                                                </a>
                                                                            </li>
                                                                        )
                                                                    )}
                                                                </motion.ul>
                                                            )}
                                                        </AnimatePresence>
                                                    </>
                                                ) : (
                                                    /* Simple link item */
                                                    <a
                                                        href={item.href}
                                                        style={styles.itemLink}
                                                        onClick={toggleMenu}
                                                    >
                                                        {item.label}
                                                    </a>
                                                )}
                                            </motion.li>
                                        ))}
                                    </ul>
                                </nav>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

/* ===== Styles (pixel-matched to Shift5) ===== */
const styles: StyleSheetCSS = {
    /* --- Top bar --- */
    desktopMenu: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: 40,
        zIndex: 10,
        pointerEvents: 'none',
    },
    menuContent: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 40px',
        height: 40,
        pointerEvents: 'none',
    },
    logoLink: {
        display: 'block',
        width: 175,
        height: 40,
        textDecoration: 'none',
        cursor: 'pointer',
        pointerEvents: 'auto',
        lineHeight: '40px',
    },
    logoImg: {
        height: 28,
        width: 'auto',
        display: 'block',
    },
    logoText: {
        fontFamily: "'Inter', sans-serif",
        fontSize: 28,
        fontWeight: 700,
        color: '#FFFFFF',
        letterSpacing: 0,
    },

    /* --- Burger button --- */
    burger: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        width: 100,
        height: 40,
        padding: 0,
        border: 'none',
        borderRadius: 24,
        backgroundColor: '#CEF506',
        cursor: 'pointer',
        outline: 'none',
        pointerEvents: 'auto',
        transition: 'transform 0.15s ease',
    },
    burgerLines: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        width: 32,
        height: 10,
        pointerEvents: 'none',
    },
    burgerLine1: {
        width: 24,
        height: 2,
        backgroundColor: '#1F1B10',
        borderRadius: 1,
        transformOrigin: 'center',
    },
    burgerLine2: {
        width: 24,
        height: 2,
        backgroundColor: '#1F1B10',
        borderRadius: 1,
        alignSelf: 'flex-end',
        transformOrigin: 'center',
    },
    burgerLabelWrapper: {
        position: 'relative',
        display: 'block',
        width: 35,
        height: 16,
        pointerEvents: 'none',
    },
    burgerLabel: {
        position: 'absolute',
        top: 0,
        left: 0,
        fontFamily: "'Space Mono', monospace",
        fontSize: 12,
        fontWeight: 400,
        color: '#1F1B10',
        letterSpacing: -0.24,
    },
    burgerLabelClose: {
        // same position, toggled via opacity
    },

    /* --- Backdrop --- */
    backdrop: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
        zIndex: 100,
        pointerEvents: 'auto',
    },

    /* --- Menu panel --- */
    menuPanel: {
        position: 'fixed',
        top: 24,
        right: 24,
        minWidth: 420,
        width: '38vw',
        maxWidth: 540,
        minHeight: 380,
        paddingTop: 32,
        clipPath: 'polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 24px 100%, 0 calc(100% - 24px))',
        overflow: 'hidden',
        zIndex: 101,
        pointerEvents: 'auto',
    },
    mobileBg: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#B9B9B9',
        pointerEvents: 'none',
    },
    mobileContent: {
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: '0 40px 24px',
        minHeight: 348,
        boxSizing: 'border-box',
    },
    menuNav: {
        display: 'block',
    },
    menuList: {
        listStyle: 'none',
        margin: 0,
        padding: 0,
    },

    /* --- Nav items --- */
    menuItem: {
        listStyle: 'none',
    },
    itemLink: {
        display: 'block',
        fontFamily: "'Inter', sans-serif",
        fontSize: 48,
        fontWeight: 400,
        color: '#1F1B10',
        textDecoration: 'none',
        lineHeight: '56px',
        cursor: 'pointer',
        transition: 'opacity 0.2s ease',
    },

    /* --- Expandable submenu --- */
    submenuTitle: {
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 4,
        background: 'none',
        border: 'none',
        padding: 0,
        margin: 0,
        fontFamily: "'Inter', sans-serif",
        fontSize: 48,
        fontWeight: 400,
        color: '#1F1B10',
        cursor: 'pointer',
        lineHeight: '56px',
        outline: 'none',
        transition: 'opacity 0.2s ease',
    },
    submenuCount: {
        fontFamily: "'Space Mono', monospace",
        fontSize: 14,
        color: '#1F1B10',
        verticalAlign: 'super',
        marginLeft: 2,
    },
    expandArrow: {
        display: 'inline-block',
        fontSize: 32,
        color: '#1F1B10',
        marginLeft: 8,
        lineHeight: 1,
    },
    submenuList: {
        listStyle: 'none',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
    },
    submenuItem: {
        listStyle: 'none',
    },
    submenuItemLink: {
        display: 'block',
        fontFamily: "'Inter', sans-serif",
        fontSize: 24,
        fontWeight: 400,
        color: '#1F1B10',
        textDecoration: 'none',
        paddingLeft: 32,
        lineHeight: '32px',
        cursor: 'pointer',
        transition: 'opacity 0.2s ease',
    },
    submenuArrow: {
        display: 'inline-block',
        marginRight: 8,
        fontSize: 18,
        color: '#1F1B10',
    },

    /* --- Panel close button --- */
    panelCloseBtn: {
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
    panelCloseIcon: {
        fontSize: 22,
        color: '#1F1B10',
        lineHeight: 1,
        fontFamily: "'Inter', sans-serif",
        fontWeight: 300,
    },
};

export default Navbar;
