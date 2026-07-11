require('dotenv').config();

const express = require('express');
const { getStats, getRecentTransactions, isEnabled } = require('./db');

const router = express.Router();

router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

// ─── Free Endpoint: r0x Scan stats ───────────────────
// Real aggregates over settled x402 payments only — never mock data.
router.get('/stats', async (req, res) => {
    try {
        const stats = await getStats();
        res.json({ ...stats, enabled: isEnabled(), timestamp: new Date().toISOString() });
    } catch (err) {
        console.error('[r0x-scan] stats error:', err.message);
        res.status(500).json({ error: 'Failed to fetch scan stats', enabled: isEnabled() });
    }
});

// ─── Free Endpoint: r0x Scan recent transactions ─────
router.get('/transactions', async (req, res) => {
    try {
        const limit = req.query.limit;
        const transactions = await getRecentTransactions(limit);
        res.json({ transactions, enabled: isEnabled(), timestamp: new Date().toISOString() });
    } catch (err) {
        console.error('[r0x-scan] transactions error:', err.message);
        res.status(500).json({ error: 'Failed to fetch transactions', enabled: isEnabled() });
    }
});

module.exports = router;
