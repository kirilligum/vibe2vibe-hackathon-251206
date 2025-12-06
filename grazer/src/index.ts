import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import ts from "typescript";

const server = new Server(
    {
        name: "mcp-file-metrics",
        version: "1.0.0",
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

interface Metrics {
    complexity: number;
    characters: number;
}

function calculateComplexity(content: string, fileName: string): number {
    if (!fileName.endsWith(".ts") && !fileName.endsWith(".js") && !fileName.endsWith(".tsx") && !fileName.endsWith(".jsx")) {
        return 1; // Default complexity for non-code files
    }

    const sourceFile = ts.createSourceFile(
        fileName,
        content,
        ts.ScriptTarget.Latest,
        true
    );

    let complexity = 1;

    function visit(node: ts.Node) {
        switch (node.kind) {
            case ts.SyntaxKind.IfStatement:
            case ts.SyntaxKind.ForStatement:
            case ts.SyntaxKind.ForInStatement:
            case ts.SyntaxKind.ForOfStatement:
            case ts.SyntaxKind.WhileStatement:
            case ts.SyntaxKind.DoStatement:
            case ts.SyntaxKind.CaseClause:
            case ts.SyntaxKind.CatchClause:
            case ts.SyntaxKind.ConditionalExpression: // Ternary operator
            case ts.SyntaxKind.AmpersandAmpersandToken:
            case ts.SyntaxKind.BarBarToken:
                complexity++;
                break;
        }
        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return complexity;
}

async function getFileMetrics(filePath: string): Promise<Metrics> {
    try {
        const content = await fs.readFile(filePath, "utf-8");
        const characters = content.length;
        const complexity = calculateComplexity(content, filePath);
        console.error(`${path.basename(filePath)}: Complexity ${complexity}`);
        return { complexity, characters };
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return { complexity: 0, characters: 0 };
    }
}

async function getDirectoryMetrics(dirPath: string): Promise<Metrics> {
    let totalMetrics: Metrics = { complexity: 0, characters: 0 };
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                const metrics = await getDirectoryMetrics(fullPath);
                totalMetrics.complexity += metrics.complexity;
                totalMetrics.characters += metrics.characters;
            } else if (entry.isFile()) {
                const metrics = await getFileMetrics(fullPath);
                totalMetrics.complexity += metrics.complexity;
                totalMetrics.characters += metrics.characters;
            }
        }
    } catch (error) {
        console.error(`Error reading directory ${dirPath}:`, error);
    }
    return totalMetrics;
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "calculate_metrics",
                description: "Calculate cyclomatic complexity and character count for a file or recursively for a folder",
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
        let metrics: Metrics = { complexity: 0, characters: 0 };

        if (stats.isDirectory()) {
            metrics = await getDirectoryMetrics(inputPath);
        } else {
            metrics = await getFileMetrics(inputPath);
        }

        return {
            content: [
                {
                    type: "text",
                    text: `Total complexity: ${metrics.complexity}\nTotal characters: ${metrics.characters}`,
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
    console.error("MCP Metrics Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
