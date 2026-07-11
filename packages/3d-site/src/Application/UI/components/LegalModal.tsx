import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type ModalType = 'privacy' | 'terms' | null;

interface LegalModalProps {
    activeModal: ModalType;
    onClose: () => void;
}

const LegalModal: React.FC<LegalModalProps> = ({ activeModal, onClose }) => {
    // Lock scroll and close on Escape
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (activeModal) {
            document.addEventListener('keydown', onKeyDown);
        }
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [activeModal, onClose]);


    return (
        <AnimatePresence>
            {activeModal && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="legal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        style={styles.backdrop}
                        onClick={onClose}
                    />

                    {/* Centering wrapper */}
                    <motion.div
                        key="legal-wrapper"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                        style={styles.modalWrapper}
                    >
                        {/* Modal */}
                        <motion.div
                            initial={{ y: 40 }}
                            animate={{ y: 0 }}
                            exit={{ y: 40 }}
                            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                            style={styles.modal}
                        >
                            {/* Header */}
                            <div style={styles.header}>
                                <h2 style={styles.title}>
                                    {activeModal === 'privacy'
                                        ? 'Privacy Policy'
                                        : 'Terms of Use'}
                                </h2>
                                <button
                                    style={styles.closeBtn}
                                    onClick={onClose}
                                    aria-label="Close"
                                >
                                    <span style={styles.closeX}>×</span>
                                </button>
                            </div>

                            {/* Scrollable content */}
                            <div style={styles.content} className="legal-modal-content">
                                {activeModal === 'privacy' ? (
                                    <PrivacyPolicyContent />
                                ) : (
                                    <TermsOfUseContent />
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

/* ========================= */
/* PRIVACY POLICY CONTENT    */
/* ========================= */
const PrivacyPolicyContent: React.FC = () => (
    <div>
        <p style={s.meta}>Last Updated: February 7, 2026</p>

        <p style={s.body}>
            r0x ("we," "us," or "our") is committed to protecting the privacy of our users
            ("you" or "your"). This Privacy Policy explains how we collect, use, disclose, and
            safeguard your information when you visit our website and use our decentralized
            protocol services (collectively, the "Services").
        </p>

        <h3 style={s.heading}>1. Information We Collect</h3>

        <h4 style={s.subheading}>1.1 Information You Provide</h4>
        <ul style={s.list}>
            <li style={s.listItem}>
                <strong>Wallet Addresses:</strong> When you connect your cryptocurrency wallet
                to our Services, we collect your public wallet address(es).
            </li>
            <li style={s.listItem}>
                <strong>Contact Information:</strong> If you contact us directly, we may receive
                your name, email address, and the contents of your message.
            </li>
            <li style={s.listItem}>
                <strong>Newsletter Subscriptions:</strong> If you subscribe to updates, we
                collect your email address.
            </li>
        </ul>

        <h4 style={s.subheading}>1.2 Information Collected Automatically</h4>
        <ul style={s.list}>
            <li style={s.listItem}>
                <strong>Usage Data:</strong> Browser type, operating system, pages visited,
                time spent, and referring URLs.
            </li>
            <li style={s.listItem}>
                <strong>Device Information:</strong> Device type, screen resolution, and
                language preferences.
            </li>
            <li style={s.listItem}>
                <strong>IP Address:</strong> Your IP address may be collected and used for
                analytics and security purposes.
            </li>
        </ul>

        <h4 style={s.subheading}>1.3 On-Chain Data</h4>
        <p style={s.body}>
            Blockchain transactions are publicly visible. We may access publicly available
            on-chain data associated with your wallet address, including transaction history,
            token balances, staking activity, and governance participation. This data is
            inherently public and is not collected by us. It is recorded on the blockchain.
        </p>

        <h3 style={s.heading}>2. How We Use Your Information</h3>
        <ul style={s.list}>
            <li style={s.listItem}>To provide, maintain, and improve our Services.</li>
            <li style={s.listItem}>To process transactions and interact with smart contracts on your behalf.</li>
            <li style={s.listItem}>To send you updates, technical notices, and security alerts.</li>
            <li style={s.listItem}>To respond to your inquiries and provide customer support.</li>
            <li style={s.listItem}>To monitor and analyze usage patterns and trends.</li>
            <li style={s.listItem}>To detect, prevent, and address fraud, abuse, and technical issues.</li>
            <li style={s.listItem}>To comply with applicable legal obligations.</li>
        </ul>

        <h3 style={s.heading}>3. Cookies and Tracking Technologies</h3>
        <p style={s.body}>
            We use cookies and similar tracking technologies to enhance your experience.
            These may include:
        </p>
        <ul style={s.list}>
            <li style={s.listItem}>
                <strong>Strictly Necessary Cookies:</strong> Required for the website to
                function properly.
            </li>
            <li style={s.listItem}>
                <strong>Analytics Cookies:</strong> Help us understand how visitors interact
                with our website (e.g., Google Analytics).
            </li>
            <li style={s.listItem}>
                <strong>Functional Cookies:</strong> Remember your preferences and settings.
            </li>
        </ul>
        <p style={s.body}>
            You can manage cookie preferences through your browser settings. Disabling
            certain cookies may affect the functionality of our Services.
        </p>

        <h3 style={s.heading}>4. Third-Party Services</h3>
        <p style={s.body}>We may integrate with or rely on the following third-party services:</p>
        <ul style={s.list}>
            <li style={s.listItem}>
                <strong>Blockchain Networks:</strong> Interactions with Ethereum and other
                blockchain networks involve RPC providers (e.g., Infura, Alchemy) that may
                log your IP address.
            </li>
            <li style={s.listItem}>
                <strong>Analytics Providers:</strong> We use analytics services to understand
                usage patterns. These services may collect information through their own
                tracking technologies.
            </li>
            <li style={s.listItem}>
                <strong>Wallet Providers:</strong> Third-party wallet applications (MetaMask,
                WalletConnect, etc.) are governed by their own privacy policies.
            </li>
        </ul>

        <h3 style={s.heading}>5. Data Sharing and Disclosure</h3>
        <p style={s.body}>
            We do not sell your personal information. We may share information in the
            following circumstances:
        </p>
        <ul style={s.list}>
            <li style={s.listItem}>With service providers who assist in operating our Services.</li>
            <li style={s.listItem}>To comply with legal obligations, court orders, or government requests.</li>
            <li style={s.listItem}>To protect the rights, safety, and property of r0x and our users.</li>
            <li style={s.listItem}>In connection with a merger, acquisition, or sale of assets.</li>
        </ul>

        <h3 style={s.heading}>6. Data Retention</h3>
        <p style={s.body}>
            We retain your personal information only for as long as necessary to fulfill the
            purposes outlined in this policy, unless a longer retention period is required or
            permitted by law. On-chain data is immutable and cannot be deleted from the
            blockchain.
        </p>

        <h3 style={s.heading}>7. Your Rights</h3>
        <p style={s.body}>
            Depending on your jurisdiction, you may have the following rights:
        </p>
        <ul style={s.list}>
            <li style={s.listItem}><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
            <li style={s.listItem}><strong>Rectification:</strong> Request correction of inaccurate data.</li>
            <li style={s.listItem}><strong>Deletion:</strong> Request deletion of your personal data (excluding on-chain data).</li>
            <li style={s.listItem}><strong>Portability:</strong> Request transfer of your data in a structured format.</li>
            <li style={s.listItem}><strong>Objection:</strong> Object to certain processing of your personal data.</li>
            <li style={s.listItem}><strong>Withdraw Consent:</strong> Where processing is based on consent, you may withdraw at any time.</li>
        </ul>
        <p style={s.body}>
            <strong>GDPR (EU/EEA):</strong> If you are located in the European Economic Area,
            you have additional rights under the General Data Protection Regulation.
        </p>
        <p style={s.body}>
            <strong>CCPA (California):</strong> California residents have the right to know what
            personal information is collected and to request its deletion.
        </p>
        <p style={s.body}>
            To exercise any of these rights, please contact us at privacy@projectr0x.dev.
        </p>

        <h3 style={s.heading}>8. Security</h3>
        <p style={s.body}>
            We implement reasonable technical and organizational measures to protect your
            information. However, no method of transmission over the Internet or electronic
            storage is 100% secure. We cannot guarantee absolute security.
        </p>

        <h3 style={s.heading}>9. International Transfers</h3>
        <p style={s.body}>
            Your information may be transferred to and processed in countries other than your
            country of residence. We take appropriate safeguards to ensure your data is
            protected in accordance with this policy.
        </p>

        <h3 style={s.heading}>10. Children's Privacy</h3>
        <p style={s.body}>
            Our Services are not directed to individuals under the age of 18. We do not
            knowingly collect personal information from children. If we become aware that
            we have collected data from a child, we will take steps to delete it.
        </p>

        <h3 style={s.heading}>11. Changes to This Policy</h3>
        <p style={s.body}>
            We may update this Privacy Policy from time to time. We will notify you of
            material changes by posting the updated policy on our website with a revised
            "Last Updated" date. Your continued use of the Services after any changes
            constitutes acceptance of the updated policy.
        </p>

        <h3 style={s.heading}>12. Contact Us</h3>
        <p style={s.body}>
            If you have questions or concerns about this Privacy Policy, please contact us:
        </p>
        <p style={s.body}>
            Email: privacy@projectr0x.dev
        </p>
    </div>
);

/* ========================= */
/* TERMS OF USE CONTENT      */
/* ========================= */
const TermsOfUseContent: React.FC = () => (
    <div>
        <p style={s.meta}>Last Updated: February 7, 2026</p>

        <p style={s.body}>
            These Terms of Use ("Terms") govern your access to and use of the r0x website,
            decentralized protocol, and related services (collectively, the "Services")
            provided by r0x ("we," "us," or "our"). By accessing or using the Services,
            you agree to be bound by these Terms. If you do not agree, you must not use
            the Services.
        </p>

        <h3 style={s.heading}>1. Eligibility</h3>
        <p style={s.body}>
            You must be at least 18 years of age (or the age of majority in your jurisdiction)
            to use the Services. By using the Services, you represent and warrant that you
            meet this requirement and that you are not located in, or a citizen or resident
            of, any jurisdiction where access to or use of the Services would be prohibited
            or restricted by applicable law, regulation, or sanctions.
        </p>

        <h3 style={s.heading}>2. Description of Services</h3>
        <p style={s.body}>
            r0x provides a decentralized protocol and related tools that allow users to
            interact with blockchain-based services, including but not limited to staking,
            governance participation, and token management. The Services are provided on an
            "as-is" and "as-available" basis.
        </p>

        <h3 style={s.heading}>3. Wallet Connection and Responsibility</h3>
        <p style={s.body}>
            To use certain features of the Services, you must connect a compatible
            cryptocurrency wallet. You are solely responsible for:
        </p>
        <ul style={s.list}>
            <li style={s.listItem}>Maintaining the security of your wallet and private keys.</li>
            <li style={s.listItem}>All transactions initiated from your wallet.</li>
            <li style={s.listItem}>Ensuring you have sufficient funds to cover transaction fees (gas fees).</li>
        </ul>
        <p style={s.body}>
            We do not have access to your private keys and cannot recover lost or stolen
            assets. You acknowledge that blockchain transactions are irreversible.
        </p>

        <h3 style={s.heading}>4. Crypto Risk Disclaimer</h3>
        <p style={s.body}>
            <strong>
                THE FOLLOWING IS AN IMPORTANT NOTICE REGARDING THE RISKS ASSOCIATED WITH
                DIGITAL ASSETS AND BLOCKCHAIN TECHNOLOGY:
            </strong>
        </p>
        <ul style={s.list}>
            <li style={s.listItem}>
                <strong>Not Financial Advice:</strong> Nothing in the Services constitutes
                financial, investment, tax, or legal advice. You should consult qualified
                professionals before making any financial decisions.
            </li>
            <li style={s.listItem}>
                <strong>Volatility:</strong> Digital assets are highly volatile. The value of
                tokens can fluctuate significantly and you may lose some or all of your
                investment.
            </li>
            <li style={s.listItem}>
                <strong>Loss of Funds:</strong> Interactions with smart contracts carry inherent
                risks, including but not limited to bugs, exploits, and loss of funds.
            </li>
            <li style={s.listItem}>
                <strong>Regulatory Risk:</strong> The regulatory landscape for digital assets
                is evolving. Changes in laws or regulations may adversely affect the Services
                or your ability to use them.
            </li>
            <li style={s.listItem}>
                <strong>No Guarantee of Returns:</strong> Past performance does not guarantee
                future results. Staking rewards and governance outcomes are not guaranteed.
            </li>
        </ul>

        <h3 style={s.heading}>5. Token and Protocol Disclaimers</h3>
        <p style={s.body}>
            Any tokens associated with the r0x protocol are utility tokens intended for
            use within the protocol ecosystem. They are not securities, shares, or other
            forms of investment. The protocol operates through decentralized smart contracts
            that, once deployed, may not be fully within our control.
        </p>

        <h3 style={s.heading}>6. Prohibited Activities</h3>
        <p style={s.body}>You agree not to:</p>
        <ul style={s.list}>
            <li style={s.listItem}>Use the Services for any unlawful purpose.</li>
            <li style={s.listItem}>Attempt to exploit, hack, or disrupt the Services or any smart contracts.</li>
            <li style={s.listItem}>Use the Services to launder money or finance terrorism.</li>
            <li style={s.listItem}>Circumvent any access restrictions or security measures.</li>
            <li style={s.listItem}>Use bots, scrapers, or automated tools without authorization.</li>
            <li style={s.listItem}>Impersonate any person or entity.</li>
            <li style={s.listItem}>Violate any applicable laws, rules, or regulations.</li>
        </ul>

        <h3 style={s.heading}>7. Intellectual Property</h3>
        <p style={s.body}>
            All content, trademarks, logos, and other intellectual property displayed on
            the website are owned by or licensed to r0x. You may not reproduce,
            distribute, modify, or create derivative works without our prior written consent.
            Open-source components of the protocol are governed by their respective licenses.
        </p>

        <h3 style={s.heading}>8. Third-Party Links and Services</h3>
        <p style={s.body}>
            The Services may contain links to third-party websites, protocols, or services.
            We are not responsible for the content, policies, or practices of any third-party
            services. Your use of third-party services is at your own risk.
        </p>

        <h3 style={s.heading}>9. Limitation of Liability</h3>
        <p style={s.body}>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, r0x AND ITS AFFILIATES,
            DIRECTORS, OFFICERS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT,
            INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED
            TO LOSS OF PROFITS, DATA, GOODWILL, OR DIGITAL ASSETS, WHETHER BASED ON WARRANTY,
            CONTRACT, TORT, OR ANY OTHER LEGAL THEORY, EVEN IF WE HAVE BEEN ADVISED OF THE
            POSSIBILITY OF SUCH DAMAGES.
        </p>
        <p style={s.body}>
            IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED THE GREATER OF (A) THE AMOUNT YOU
            PAID TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED
            U.S. DOLLARS ($100).
        </p>

        <h3 style={s.heading}>10. Indemnification</h3>
        <p style={s.body}>
            You agree to indemnify, defend, and hold harmless r0x and its affiliates from
            and against any claims, damages, losses, liabilities, costs, and expenses
            (including reasonable attorneys' fees) arising from your use of the Services,
            violation of these Terms, or infringement of any rights of a third party.
        </p>

        <h3 style={s.heading}>11. Disclaimers</h3>
        <p style={s.body}>
            THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY
            KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF
            MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO
            NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE, OR
            THAT ANY DEFECTS WILL BE CORRECTED.
        </p>

        <h3 style={s.heading}>12. Governing Law and Dispute Resolution</h3>
        <p style={s.body}>
            These Terms shall be governed by and construed in accordance with the laws of the
            State of Delaware, United States, without regard to its conflict of law provisions.
            Any dispute arising out of or relating to these Terms shall be resolved through
            binding arbitration in accordance with the rules of the American Arbitration
            Association, except that either party may seek injunctive relief in any court of
            competent jurisdiction.
        </p>

        <h3 style={s.heading}>13. Modification of Terms</h3>
        <p style={s.body}>
            We reserve the right to modify these Terms at any time. We will notify you of
            material changes by posting the updated Terms on our website with a revised
            "Last Updated" date. Your continued use of the Services following any changes
            constitutes acceptance of the modified Terms. It is your responsibility to review
            these Terms periodically.
        </p>

        <h3 style={s.heading}>14. Severability</h3>
        <p style={s.body}>
            If any provision of these Terms is found to be invalid or unenforceable, that
            provision shall be enforced to the maximum extent permissible, and the remaining
            provisions shall remain in full force and effect.
        </p>

        <h3 style={s.heading}>15. Entire Agreement</h3>
        <p style={s.body}>
            These Terms, together with our Privacy Policy, constitute the entire agreement
            between you and r0x regarding the use of the Services and supersede all
            prior agreements and understandings.
        </p>

        <h3 style={s.heading}>16. Contact Us</h3>
        <p style={s.body}>
            If you have questions about these Terms, please contact us:
        </p>
        <p style={s.body}>
            Email: legal@projectr0x.dev
        </p>
    </div>
);

/* ===== Content text styles ===== */
const s = {
    meta: {
        fontFamily: "'Space Mono', monospace",
        fontSize: 12,
        color: '#8B8B8B',
        marginBottom: 24,
    } as React.CSSProperties,
    heading: {
        fontFamily: "'Inter', sans-serif",
        fontSize: 20,
        fontWeight: 600,
        color: '#FFFFFF',
        marginTop: 32,
        marginBottom: 12,
    } as React.CSSProperties,
    subheading: {
        fontFamily: "'Inter', sans-serif",
        fontSize: 16,
        fontWeight: 600,
        color: '#B9B9B9',
        marginTop: 20,
        marginBottom: 8,
    } as React.CSSProperties,
    body: {
        fontFamily: "'Inter', sans-serif",
        fontSize: 14,
        fontWeight: 400,
        color: '#B9B9B9',
        lineHeight: '22px',
        marginBottom: 12,
    } as React.CSSProperties,
    list: {
        margin: '0 0 12px 0',
        padding: '0 0 0 24px',
    } as React.CSSProperties,
    listItem: {
        fontFamily: "'Inter', sans-serif",
        fontSize: 14,
        fontWeight: 400,
        color: '#B9B9B9',
        lineHeight: '22px',
        marginBottom: 6,
    } as React.CSSProperties,
};

/* ===== Modal styles ===== */
const styles: StyleSheetCSS = {
    backdrop: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        zIndex: 500,
        pointerEvents: 'auto',
    },
    modalWrapper: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 501,
        pointerEvents: 'none',
    },
    modal: {
        width: '90vw',
        maxWidth: 720,
        maxHeight: '90vh',
        backgroundColor: '#1F1B10',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid #4D4D4D',
        pointerEvents: 'auto',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px 32px 16px',
        borderBottom: '1px solid #4D4D4D',
        flexShrink: 0,
    },
    title: {
        fontFamily: "'Inter', sans-serif",
        fontSize: 24,
        fontWeight: 600,
        color: '#FFFFFF',
        margin: 0,
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        outline: 'none',
        padding: '4px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeX: {
        fontSize: 28,
        color: '#8B8B8B',
        lineHeight: 1,
        transition: 'color 0.2s ease',
    },
    content: {
        padding: '24px 32px 32px',
        overflowY: 'auto',
        flex: 1,
    },
};

export default LegalModal;
