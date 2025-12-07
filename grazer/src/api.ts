import express from "express";
import * as fs from "fs/promises";
import { analyzeFile, getDirectoryMetrics } from "./services/metrics.js";

const app = express();
const port = 3000;

app.use(express.json());

app.post("/metrics", async (req, res) => {
    const { path: inputPath } = req.body;

    if (!inputPath || typeof inputPath !== "string") {
        res.status(400).json({ error: "Invalid or missing 'path' in request body" });
        return;
    }

    try {
        const stats = await fs.stat(inputPath);
        let metrics;

        if (stats.isDirectory()) {
            metrics = await getDirectoryMetrics(inputPath);
        } else {
            metrics = await analyzeFile(inputPath);
        }

        res.json(metrics);
    } catch (error) {
        console.error("Error processing metrics request:", error);
        res.status(500).json({ error: String(error) });
    }
});

app.listen(port, () => {
    console.log(`Metrics REST API listening at http://localhost:${port}`);
});
