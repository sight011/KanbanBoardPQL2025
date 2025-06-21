const express = require("express");
const router = express.Router();
const db = require("../db");

const renderHealthPage = (res, data) => {
    const isHealthy = data.status === 'healthy';
    const uptimeInMinutes = (data.uptime / 60).toFixed(2);

    const styles = `
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f0f2f5; margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; color: #333; }
        .container { background: white; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.12); padding: 40px; text-align: center; max-width: 500px; width: 100%; }
        .status-icon { font-size: 48px; }
        .status-healthy { color: #28a745; }
        .status-unhealthy { color: #dc3545; }
        h1 { margin: 20px 0 10px; font-size: 28px; font-weight: 600; }
        p { color: #666; font-size: 16px; margin-bottom: 30px;}
        .details { text-align: left; background: #fafafa; border-radius: 8px; padding: 20px; font-size: 14px; line-height: 1.6; }
        .details strong { color: #333; }
        .error-message { color: #dc3545; background: #fbebee; padding: 10px; border-radius: 6px; margin-top: 15px; font-family: monospace; }
    `;

    const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>API Health Status</title>
            <style>${styles}</style>
        </head>
        <body>
            <div class="container">
                <div class="status-icon ${isHealthy ? 'status-healthy' : 'status-unhealthy'}">
                    ${isHealthy ? '✓' : '✗'}
                </div>
                <h1>${isHealthy ? 'API is Healthy' : 'API is Unhealthy'}</h1>
                <p>Status for ${data.service}</p>
                <div class="details">
                    <strong>Status:</strong> <span class="${isHealthy ? 'status-healthy' : 'status-unhealthy'}">${data.status}</span><br>
                    <strong>Database:</strong> <span class="${isHealthy ? 'status-healthy' : 'status-unhealthy'}">${data.database}</span><br>
                    <strong>Environment:</strong> ${data.environment}<br>
                    <strong>Uptime:</strong> ${uptimeInMinutes} minutes<br>
                    <strong>Timestamp:</strong> ${data.timestamp}<br>
                    <strong>Version:</strong> ${data.version}
                    ${!isHealthy && data.error ? `<div class="error-message"><strong>Error:</strong> ${data.error}</div>` : ''}
                </div>
            </div>
        </body>
        </html>
    `;
    res.status(isHealthy ? 200 : 503).send(html);
};

// Health check route - no authentication required
router.get("/", async (req, res) => {
    try {
        // Test database connectivity
        await db.query("SELECT 1 as test");
        
        const data = {
            status: "healthy",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || "development",
            database: "connected",
            version: "1.0.0",
            service: "Task Management API"
        };
        renderHealthPage(res, data);
    } catch (error) {
        console.error("Health check failed:", error);
        const data = {
            status: "unhealthy",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || "development",
            database: "disconnected",
            error: error.message,
            service: "Task Management API"
        };
        renderHealthPage(res, data);
    }
});

module.exports = router;
