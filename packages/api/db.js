require('dotenv').config();

const { Pool } = require('pg');

// ─── Postgres (permanent storage for r0x Scan) ──────
// Real settled x402 transactions only — no mock/seed data is ever inserted here.
// DATABASE_URL is provided by Railway (reference variable to the Postgres service in
// production) or set manually in .env for local development.
const pool = process.env.DATABASE_URL
    ? new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.DATABASE_URL.includes('railway.internal')
              ? false
              : { rejectUnauthorized: false },
          max: 5,
      })
    : null;

if (!pool) {
    console.warn('[r0x-scan] DATABASE_URL is not set — transaction recording and r0x Scan are disabled.');
}

const USDG_DECIMALS = 6;

async function initDb() {
    if (!pool) return;
    await pool.query(`
        CREATE TABLE IF NOT EXISTS transactions (
            id BIGSERIAL PRIMARY KEY,
            tx_hash TEXT UNIQUE NOT NULL,
            network TEXT,
            endpoint TEXT,
            payer TEXT,
            pay_to TEXT,
            asset TEXT,
            amount_atomic NUMERIC,
            amount_usdg NUMERIC,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions (created_at DESC)`);
    console.log('[r0x-scan] Postgres ready — transactions table verified.');
}

/**
 * Records one real, settled x402 payment. Called from the facilitator's
 * onAfterSettle hook — never fed synthetic data.
 */
async function recordTransaction({ txHash, network, endpoint, payer, payTo, asset, amountAtomic }) {
    if (!pool) return;
    if (!txHash) return;

    const amountUsdg = amountAtomic !== undefined && amountAtomic !== null
        ? Number(amountAtomic) / 10 ** USDG_DECIMALS
        : null;

    await pool.query(
        `INSERT INTO transactions (tx_hash, network, endpoint, payer, pay_to, asset, amount_atomic, amount_usdg)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (tx_hash) DO NOTHING`,
        [txHash, network || null, endpoint || null, payer || null, payTo || null, asset || null, amountAtomic || null, amountUsdg]
    );
}

async function getStats() {
    if (!pool) {
        return { totalCount: 0, totalVolumeUsdg: 0, avgAmountUsdg: 0, last24hCount: 0, dbConnected: false };
    }
    const totalsResult = await pool.query(
        `SELECT COUNT(*)::int AS count, COALESCE(SUM(amount_usdg), 0) AS total, COALESCE(AVG(amount_usdg), 0) AS avg
         FROM transactions`
    );
    const last24hResult = await pool.query(
        `SELECT COUNT(*)::int AS count FROM transactions WHERE created_at > now() - interval '24 hours'`
    );
    const row = totalsResult.rows[0];
    return {
        totalCount: row.count,
        totalVolumeUsdg: Number(row.total),
        avgAmountUsdg: Number(row.avg),
        last24hCount: last24hResult.rows[0].count,
        dbConnected: true,
    };
}

async function getRecentTransactions(limit = 50) {
    if (!pool) return [];
    const result = await pool.query(
        `SELECT tx_hash, network, endpoint, payer, pay_to, asset, amount_atomic, amount_usdg, created_at
         FROM transactions
         ORDER BY created_at DESC
         LIMIT $1`,
        [Math.min(Math.max(Number(limit) || 50, 1), 200)]
    );
    return result.rows.map((r) => ({
        txHash: r.tx_hash,
        network: r.network,
        endpoint: r.endpoint,
        payer: r.payer,
        payTo: r.pay_to,
        asset: r.asset,
        amountUsdg: r.amount_usdg !== null ? Number(r.amount_usdg) : null,
        createdAt: r.created_at,
    }));
}

module.exports = { initDb, recordTransaction, getStats, getRecentTransactions, isEnabled: () => !!pool };
