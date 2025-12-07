import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import * as fs from "fs/promises";
import { analyzeFile, getDirectoryMetrics } from "./services/metrics.js";
import { CodeMetrics } from "./types.js";

const server = new Server(
    {
        name: "mcp-file-metrics",
        version: "2.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

const CalculateMetricsArgsSchema = z.object({
    path: z.string(),
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "calculate_metrics",
                description: `Calculate holistic code quality metrics for files or directories. 
Returns a detailed JSON object containing:
- cyclomaticComplexity: Measures the number of linearly independent paths through the code. Higher values indicate harder-to-test code (lower is better).
- cognitiveComplexity: Estimates how difficult the code is for a human to understand, heavily penalizing nesting and structural breaks. Ideally < 15 per file (lower is better).
- maintainabilityIndex: A composite score (0-100) combining complexity, volume, and size. Values > 85 are considered good; < 65 indicates hard-to-maintain code (higher is better).
- halstead: Quantitative measures of code complexity based on operators and operands. 'Volume' measures information content; 'Effort' estimates mental cost to create.
- loc/sloc/characterCount: Total lines, Source lines, and total characters. 
- commentDensity: The percentage of lines that are comments. Useful for assessing documentation coverage (higher is generally better).
- fanOut: Counts the number of external modules imported. High fan-out implies high coupling and lower cohesion (lower is better).`,
                inputSchema: {
                    type: "object",
                    properties: {
                        path: {
                            type: "string",
                            description: "The file or folder path to calculate metrics for",
                        },
                    },
                    required: ["path"],
                },
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== "calculate_metrics") {
        throw new Error("Unknown tool");
    }

    const parseResult = CalculateMetricsArgsSchema.safeParse(request.params.arguments);
    if (!parseResult.success) {
        throw new Error("Invalid arguments: " + parseResult.error.message);
    }

    const { path: inputPath } = parseResult.data;

    try {
        const stats = await fs.stat(inputPath);
        let metrics: CodeMetrics;

        if (stats.isDirectory()) {
            metrics = await getDirectoryMetrics(inputPath);
        } else {
            metrics = await analyzeFile(inputPath);
        }

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(metrics, null, 2),
                },
            ],
        };
    } catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                },
            ],
            isError: true,
        };
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Holistic Metrics Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
