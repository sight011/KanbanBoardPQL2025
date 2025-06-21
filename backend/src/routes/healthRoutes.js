const express = require("express");
const router = express.Router();
const db = require("../db");
const os = require('os');

// Health check route - no authentication required
router.get("/", async (req, res) => {
    let dbStatus = 'up';
    try {
        await db.query("SELECT 1 as test");
    } catch (e) {
        dbStatus = 'down';
    }

    const uptimeInSeconds = process.uptime();
    const uptime = `${Math.floor(uptimeInSeconds / 60)}m ${Math.floor(uptimeInSeconds % 60)}s`;

    const healthcheck = {
        status: "up",
        dbStatus: dbStatus,
        uptime: uptime,
        timestamp: Date.now()
    };

    try {
        res.status(200).json(healthcheck);
    } catch (e) {
        healthcheck.status = "down";
        res.status(503).json(healthcheck);
    }
});

module.exports = router;
