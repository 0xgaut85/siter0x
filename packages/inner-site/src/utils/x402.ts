// ── x402 protocol v2 client helpers (browser-native, no SDK needed) ──
// Wire format verified directly against the installed @x402/core + @x402/evm
// SDKs (node_modules/@x402/core/dist/cjs/http/index.js and
// node_modules/@x402/evm/dist/cjs/exact/client/index.js) so this stays in
// lockstep with what the r0x server (packages/api/skills.js) actually
// enforces. Do not hand-wave any of these shapes — a mismatch here means
// signature verification fails silently on the server.
//
// Flow:
//   1. Server responds 402 with a `PAYMENT-REQUIRED` header: base64(JSON) of
//      { x402Version: 2, resource, accepts: PaymentRequirements[], extensions? }
//   2. Client picks a requirement from `accepts`, signs an EIP-3009
//      TransferWithAuthorization for it, and sends a `PAYMENT-SIGNATURE`
//      header: base64(JSON) of { x402Version: 2, resource, accepted, payload, extensions? }
//   3. On success the server responds with a `PAYMENT-RESPONSE` header
//      (base64 JSON settlement receipt) and the normal resource body.

// ── UTF-8 safe base64 (matches @x402/core's safeBase64Encode/Decode) ──
export function encodeB64(obj: unknown): string {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    const binaryString = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
    return btoa(binaryString);
}

export function decodeB64<T = unknown>(b64: string): T {
    const binaryString = atob(b64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return JSON.parse(new TextDecoder('utf-8').decode(bytes));
}

export function generateNonce(): `0x${string}` {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return ('0x' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;
}

// ── Wire types (mirrors @x402/core's PaymentRequirements / PaymentRequired / PaymentPayload) ──
export interface ResourceInfo {
    url: string;
    description?: string;
    mimeType?: string;
    serviceName?: string;
    tags?: string[];
    iconUrl?: string;
}

export interface PaymentRequirements {
    scheme: string;
    network: string; // CAIP-2, e.g. "eip155:4663"
    asset: string;
    amount: string; // atomic units (e.g. "10000" = $0.01 of 6-decimal USDG)
    payTo: string;
    maxTimeoutSeconds: number;
    extra: { name?: string; version?: string; [k: string]: unknown };
}

export interface PaymentRequired {
    x402Version: number;
    error?: string;
    resource: ResourceInfo;
    accepts: PaymentRequirements[];
    extensions?: Record<string, unknown>;
}

export interface PaymentPayload {
    x402Version: number;
    resource?: ResourceInfo;
    accepted: PaymentRequirements;
    payload: Record<string, unknown>;
    extensions?: Record<string, unknown>;
}

/** Reads and decodes the `PAYMENT-REQUIRED` header from a 402 response. */
export function decodePaymentRequired(res: Response): PaymentRequired {
    const header = res.headers.get('PAYMENT-REQUIRED') || res.headers.get('Payment-Required');
    if (!header) {
        throw new Error('Missing PAYMENT-REQUIRED header on 402 response');
    }
    return decodeB64<PaymentRequired>(header);
}

/** Robinhood Chain's CAIP-2 network identifier, as used by the r0x server. */
export const ROBINHOOD_NETWORK = 'eip155:4663';
export const ROBINHOOD_CHAIN_ID = 4663;

/**
 * Picks the payment requirement this client can fulfil.
 * r0x only advertises one option per route today (exact scheme, USDG on
 * Robinhood Chain), but this keeps things correct if that ever changes.
 */
export function chooseRequirements(
    accepts: PaymentRequirements[],
    scheme: string = 'exact',
    network: string = ROBINHOOD_NETWORK
): PaymentRequirements {
    const match = accepts.find((r) => r.scheme === scheme && r.network === network) || accepts[0];
    if (!match) throw new Error('No usable payment requirement in PAYMENT-REQUIRED accepts[]');
    return match;
}

/**
 * Signs an EIP-3009 TransferWithAuthorization for the chosen requirement and
 * returns the full PAYMENT-SIGNATURE header value (base64-encoded PaymentPayload).
 * `provider` is an EIP-1193 provider (window.ethereum / MetaMask / Rabby / etc.).
 */
export async function signX402Payment(
    provider: any,
    from: string,
    paymentRequired: PaymentRequired,
    requirements: PaymentRequirements
): Promise<string> {
    if (!requirements.extra?.name || !requirements.extra?.version) {
        throw new Error(`EIP-712 domain (name, version) missing on payment requirements for asset ${requirements.asset}`);
    }
    if (!requirements.network.startsWith('eip155:')) {
        throw new Error(`Unsupported network format: ${requirements.network} (expected eip155:CHAIN_ID)`);
    }
    const chainId = parseInt(requirements.network.split(':')[1], 10);

    const nonce = generateNonce();
    const nowSec = Math.floor(Date.now() / 1000);
    const authorization = {
        from,
        to: requirements.payTo,
        value: requirements.amount,
        validAfter: '0',
        validBefore: (nowSec + requirements.maxTimeoutSeconds).toString(),
        nonce,
    };

    const typedData = {
        types: {
            EIP712Domain: [
                { name: 'name', type: 'string' },
                { name: 'version', type: 'string' },
                { name: 'chainId', type: 'uint256' },
                { name: 'verifyingContract', type: 'address' },
            ],
            TransferWithAuthorization: [
                { name: 'from', type: 'address' },
                { name: 'to', type: 'address' },
                { name: 'value', type: 'uint256' },
                { name: 'validAfter', type: 'uint256' },
                { name: 'validBefore', type: 'uint256' },
                { name: 'nonce', type: 'bytes32' },
            ],
        },
        primaryType: 'TransferWithAuthorization',
        domain: {
            name: requirements.extra.name,
            version: requirements.extra.version,
            chainId,
            verifyingContract: requirements.asset,
        },
        message: authorization,
    };

    const signature = await provider.request({
        method: 'eth_signTypedData_v4',
        params: [from, JSON.stringify(typedData)],
    });

    const paymentPayload: PaymentPayload = {
        x402Version: paymentRequired.x402Version,
        resource: paymentRequired.resource,
        accepted: requirements,
        payload: { authorization, signature },
        extensions: paymentRequired.extensions,
    };

    return encodeB64(paymentPayload);
}

/**
 * Full helper: given a 402 Response, sign the payment and return the header
 * value to send back as `PAYMENT-SIGNATURE` on the retry request.
 */
export async function buildPaymentSignatureHeader(
    provider: any,
    from: string,
    res: Response
): Promise<{ header: string; requirements: PaymentRequirements }> {
    const paymentRequired = decodePaymentRequired(res);
    const requirements = chooseRequirements(paymentRequired.accepts);
    const header = await signX402Payment(provider, from, paymentRequired, requirements);
    return { header, requirements };
}

// ── API base URL ─────────────────────────────────────
export const getApiBase = () => {
    // In production, skill is on same origin
    // In dev, it might be on localhost:3000
    if (window.location.hostname === 'localhost') {
        return 'http://localhost:3000';
    }
    return window.location.origin;
};
