import React, { useState, useCallback } from 'react';
import Window from '../os/Window';

export interface PolicyEditorProps extends WindowAppProps {}

interface PolicyConfig {
    spendingLimits: {
        perTransaction: string;
        perHour: string;
        perDay: string;
    };
    trustRequirements: {
        minScore: number;
        requiredRegistries: string[];
    };
    capabilities: {
        textAnalysis: boolean;
        imageRecognition: boolean;
        dataPipeline: boolean;
        codeReview: boolean;
        translation: boolean;
        contentGeneration: boolean;
    };
    rateLimiting: {
        maxRequestsPerMinute: number;
        maxRequestsPerHour: number;
        cooldownSeconds: number;
    };
}

const DEFAULT_POLICY: PolicyConfig = {
    spendingLimits: {
        perTransaction: '0.01',
        perHour: '0.5',
        perDay: '2.0',
    },
    trustRequirements: {
        minScore: 50,
        requiredRegistries: ['erc8004-main'],
    },
    capabilities: {
        textAnalysis: true,
        imageRecognition: true,
        dataPipeline: true,
        codeReview: false,
        translation: true,
        contentGeneration: false,
    },
    rateLimiting: {
        maxRequestsPerMinute: 10,
        maxRequestsPerHour: 200,
        cooldownSeconds: 5,
    },
};

const PolicyEditor: React.FC<PolicyEditorProps> = (props) => {
    const [policy, setPolicy] = useState<PolicyConfig>(DEFAULT_POLICY);
    const [applied, setApplied] = useState(false);
    const [registryInput, setRegistryInput] = useState('');

    const updateSpendingLimit = useCallback(
        (field: keyof PolicyConfig['spendingLimits'], value: string) => {
            setPolicy((prev) => ({
                ...prev,
                spendingLimits: { ...prev.spendingLimits, [field]: value },
            }));
            setApplied(false);
        },
        []
    );

    const updateTrustScore = useCallback((value: number) => {
        setPolicy((prev) => ({
            ...prev,
            trustRequirements: {
                ...prev.trustRequirements,
                minScore: Math.max(0, Math.min(100, value)),
            },
        }));
        setApplied(false);
    }, []);

    const toggleCapability = useCallback(
        (cap: keyof PolicyConfig['capabilities']) => {
            setPolicy((prev) => ({
                ...prev,
                capabilities: {
                    ...prev.capabilities,
                    [cap]: !prev.capabilities[cap],
                },
            }));
            setApplied(false);
        },
        []
    );

    const updateRateLimit = useCallback(
        (field: keyof PolicyConfig['rateLimiting'], value: number) => {
            setPolicy((prev) => ({
                ...prev,
                rateLimiting: { ...prev.rateLimiting, [field]: value },
            }));
            setApplied(false);
        },
        []
    );

    const addRegistry = useCallback(() => {
        if (registryInput.trim()) {
            setPolicy((prev) => ({
                ...prev,
                trustRequirements: {
                    ...prev.trustRequirements,
                    requiredRegistries: [
                        ...prev.trustRequirements.requiredRegistries,
                        registryInput.trim(),
                    ],
                },
            }));
            setRegistryInput('');
            setApplied(false);
        }
    }, [registryInput]);

    const removeRegistry = useCallback((index: number) => {
        setPolicy((prev) => ({
            ...prev,
            trustRequirements: {
                ...prev.trustRequirements,
                requiredRegistries:
                    prev.trustRequirements.requiredRegistries.filter(
                        (_, i) => i !== index
                    ),
            },
        }));
        setApplied(false);
    }, []);

    const applyPolicy = useCallback(() => {
        setApplied(true);
        setTimeout(() => {
            setApplied(false);
        }, 3000);
    }, []);

    const policyJson = JSON.stringify(
        {
            version: '1.0',
            agent: '0xYOUR_AGENT_ADDRESS',
            policy: {
                spending: {
                    per_transaction: `${policy.spendingLimits.perTransaction} ETH`,
                    per_hour: `${policy.spendingLimits.perHour} ETH`,
                    per_day: `${policy.spendingLimits.perDay} ETH`,
                },
                trust: {
                    min_score: policy.trustRequirements.minScore,
                    registries: policy.trustRequirements.requiredRegistries,
                },
                capabilities: Object.entries(policy.capabilities)
                    .filter(([, v]) => v)
                    .map(([k]) =>
                        k.replace(/([A-Z])/g, '-$1').toLowerCase()
                    ),
                rate_limit: {
                    per_minute: policy.rateLimiting.maxRequestsPerMinute,
                    per_hour: policy.rateLimiting.maxRequestsPerHour,
                    cooldown_sec: policy.rateLimiting.cooldownSeconds,
                },
            },
        },
        null,
        2
    );

    return (
        <Window
            top={40}
            left={120}
            width={800}
            height={700}
            windowTitle="Policy Editor"
            windowBarIcon="windowGameIcon"
            windowBarColor="#1a1a1a"
            closeWindow={props.onClose}
            onInteract={props.onInteract}
            minimizeWindow={props.onMinimize}
            bottomLeftText={'r0x Policy Engine v1.0'}
        >
            <div style={styles.editor}>
                {/* HEADER */}
                <div style={styles.header}>
                    <span style={styles.headerTitle}>POLICY CONFIGURATION</span>
                    <div
                        onMouseDown={applyPolicy}
                        style={Object.assign(
                            {},
                            styles.applyButton,
                            applied && styles.appliedButton
                        )}
                    >
                        <span style={styles.applyText}>
                            {applied ? '✓ Applied' : 'Apply Policy'}
                        </span>
                    </div>
                </div>

                <div style={styles.content}>
                    {/* LEFT: Controls */}
                    <div style={styles.controls}>
                        {/* SPENDING LIMITS */}
                        <div style={styles.section}>
                            <h3 style={styles.sectionTitle}>Spending Limits</h3>
                            <div style={styles.field}>
                                <label style={styles.label}>Per Transaction (ETH)</label>
                                <input
                                    type="text"
                                    value={policy.spendingLimits.perTransaction}
                                    onChange={(e) =>
                                        updateSpendingLimit(
                                            'perTransaction',
                                            e.target.value
                                        )
                                    }
                                    style={styles.input}
                                />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Per Hour (ETH)</label>
                                <input
                                    type="text"
                                    value={policy.spendingLimits.perHour}
                                    onChange={(e) =>
                                        updateSpendingLimit(
                                            'perHour',
                                            e.target.value
                                        )
                                    }
                                    style={styles.input}
                                />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Per Day (ETH)</label>
                                <input
                                    type="text"
                                    value={policy.spendingLimits.perDay}
                                    onChange={(e) =>
                                        updateSpendingLimit(
                                            'perDay',
                                            e.target.value
                                        )
                                    }
                                    style={styles.input}
                                />
                            </div>
                        </div>

                        {/* TRUST REQUIREMENTS */}
                        <div style={styles.section}>
                            <h3 style={styles.sectionTitle}>Trust Requirements</h3>
                            <div style={styles.field}>
                                <label style={styles.label}>
                                    Min Trust Score: {policy.trustRequirements.minScore}
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={policy.trustRequirements.minScore}
                                    onChange={(e) =>
                                        updateTrustScore(parseInt(e.target.value))
                                    }
                                    style={styles.slider}
                                />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Required Registries</label>
                                {policy.trustRequirements.requiredRegistries.map(
                                    (reg, i) => (
                                        <div key={i} style={styles.registryTag}>
                                            <span style={styles.registryText}>{reg}</span>
                                            <span
                                                style={styles.removeTag}
                                                onMouseDown={() => removeRegistry(i)}
                                            >
                                                ×
                                            </span>
                                        </div>
                                    )
                                )}
                                <div style={styles.addRegistryRow}>
                                    <input
                                        type="text"
                                        value={registryInput}
                                        onChange={(e) =>
                                            setRegistryInput(e.target.value)
                                        }
                                        placeholder="registry-name"
                                        style={styles.input}
                                    />
                                    <div
                                        onMouseDown={addRegistry}
                                        style={styles.addButton}
                                    >
                                        <span style={styles.addButtonText}>+</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CAPABILITIES */}
                        <div style={styles.section}>
                            <h3 style={styles.sectionTitle}>Allowed Capabilities</h3>
                            {Object.entries(policy.capabilities).map(
                                ([key, enabled]) => (
                                    <div
                                        key={key}
                                        style={styles.capRow}
                                        onMouseDown={() =>
                                            toggleCapability(
                                                key as keyof PolicyConfig['capabilities']
                                            )
                                        }
                                    >
                                        <span
                                            style={Object.assign(
                                                {},
                                                styles.capToggle,
                                                enabled && styles.capEnabled
                                            )}
                                        >
                                            {enabled ? '■' : '□'}
                                        </span>
                                        <span style={styles.capName}>
                                            {key
                                                .replace(
                                                    /([A-Z])/g,
                                                    ' $1'
                                                )
                                                .trim()}
                                        </span>
                                    </div>
                                )
                            )}
                        </div>

                        {/* RATE LIMITING */}
                        <div style={styles.section}>
                            <h3 style={styles.sectionTitle}>Rate Limiting</h3>
                            <div style={styles.field}>
                                <label style={styles.label}>Max Requests/Min</label>
                                <input
                                    type="number"
                                    value={policy.rateLimiting.maxRequestsPerMinute}
                                    onChange={(e) =>
                                        updateRateLimit(
                                            'maxRequestsPerMinute',
                                            parseInt(e.target.value) || 0
                                        )
                                    }
                                    style={styles.input}
                                />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Max Requests/Hour</label>
                                <input
                                    type="number"
                                    value={policy.rateLimiting.maxRequestsPerHour}
                                    onChange={(e) =>
                                        updateRateLimit(
                                            'maxRequestsPerHour',
                                            parseInt(e.target.value) || 0
                                        )
                                    }
                                    style={styles.input}
                                />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Cooldown (sec)</label>
                                <input
                                    type="number"
                                    value={policy.rateLimiting.cooldownSeconds}
                                    onChange={(e) =>
                                        updateRateLimit(
                                            'cooldownSeconds',
                                            parseInt(e.target.value) || 0
                                        )
                                    }
                                    style={styles.input}
                                />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: JSON Preview */}
                    <div style={styles.preview}>
                        <div style={styles.previewHeader}>
                            <span style={styles.previewTitle}>
                                POLICY.JSON
                            </span>
                        </div>
                        <pre style={styles.previewCode}>{policyJson}</pre>
                    </div>
                </div>
            </div>
        </Window>
    );
};

const styles: StyleSheetCSS = {
    editor: {
        flex: 1,
        backgroundColor: '#1a1a1a',
        flexDirection: 'column',
        overflow: 'hidden',
    },
    header: {
        padding: '8px 16px',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #333',
    },
    headerTitle: {
        color: '#CEF506',
        fontFamily: 'monospace',
        fontSize: 11,
        letterSpacing: 2,
    },
    applyButton: {
        padding: '6px 16px',
        backgroundColor: '#CEF506',
        cursor: 'pointer',
    },
    appliedButton: {
        backgroundColor: '#00aa44',
    },
    applyText: {
        color: '#1F1B10',
        fontFamily: 'monospace',
        fontSize: 12,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        overflow: 'hidden',
    },
    controls: {
        flex: 1,
        flexDirection: 'column',
        overflowY: 'auto',
        padding: 16,
        borderRight: '1px solid #333',
    },
    section: {
        marginBottom: 20,
        flexDirection: 'column',
    },
    sectionTitle: {
        color: '#CEF506',
        fontFamily: 'monospace',
        fontSize: 12,
        letterSpacing: 1,
        marginBottom: 8,
        borderBottom: '1px solid #333',
        paddingBottom: 4,
    },
    field: {
        flexDirection: 'column',
        marginBottom: 8,
    },
    label: {
        color: '#999',
        fontFamily: 'monospace',
        fontSize: 10,
        marginBottom: 4,
    },
    input: {
        backgroundColor: '#0d0d0d',
        border: '1px solid #444',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: 12,
        padding: '4px 8px',
        outline: 'none',
    },
    slider: {
        width: '100%',
    },
    registryTag: {
        padding: '2px 8px',
        backgroundColor: '#333',
        marginBottom: 4,
        marginRight: 4,
        alignItems: 'center',
    },
    registryText: {
        color: '#87CEEB',
        fontFamily: 'monospace',
        fontSize: 11,
        marginRight: 8,
    },
    removeTag: {
        color: '#ff4444',
        cursor: 'pointer',
        fontFamily: 'monospace',
        fontSize: 14,
    },
    addRegistryRow: {
        alignItems: 'center',
    },
    addButton: {
        padding: '4px 10px',
        backgroundColor: '#333',
        cursor: 'pointer',
        marginLeft: 4,
    },
    addButtonText: {
        color: '#CEF506',
        fontFamily: 'monospace',
        fontSize: 14,
    },
    capRow: {
        padding: '4px 0',
        alignItems: 'center',
        cursor: 'pointer',
    },
    capToggle: {
        fontFamily: 'monospace',
        fontSize: 14,
        marginRight: 8,
        color: '#666',
    },
    capEnabled: {
        color: '#00ff88',
    },
    capName: {
        color: '#ccc',
        fontFamily: 'monospace',
        fontSize: 12,
        textTransform: 'capitalize',
    },
    preview: {
        width: 320,
        flexDirection: 'column',
        backgroundColor: '#0d0d0d',
    },
    previewHeader: {
        padding: '8px 12px',
        borderBottom: '1px solid #333',
    },
    previewTitle: {
        color: '#666',
        fontFamily: 'monospace',
        fontSize: 10,
        letterSpacing: 1,
    },
    previewCode: {
        flex: 1,
        padding: 12,
        fontFamily: 'monospace',
        fontSize: 10,
        lineHeight: 1.5,
        color: '#00ff88',
        overflow: 'auto',
        whiteSpace: 'pre',
    },
};

export default PolicyEditor;
