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
import { analyzeText } from "./analyzers/text.js";
import { analyzeAST } from "./analyzers/ast.js";
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

async function analyzeFile(filePath: string): Promise<CodeMetrics> {
    const content = await fs.readFile(filePath, "utf-8");

    // Parallel execution of analyzers
    const [textMetrics, astMetrics] = await Promise.all([
        new Promise<ReturnType<typeof analyzeText>>(resolve => resolve(analyzeText(content))),
        new Promise<ReturnType<typeof analyzeAST>>(resolve => {
            // Only run AST analysis on JS/TS files
            if (filePath.endsWith(".ts") || filePath.endsWith(".js") || filePath.endsWith(".tsx") || filePath.endsWith(".jsx")) {
                const sourceFile = ts.createSourceFile(
                    filePath,
                    content,
                    ts.ScriptTarget.Latest,
                    true
                );
                resolve(analyzeAST(sourceFile));
            } else {
                resolve({
                    cyclomaticComplexity: 1,
                    cognitiveComplexity: 0,
                    nestingDepth: 0,
                    fanOut: 0,
                    halstead: { volume: 0, effort: 0, difficulty: 0, length: 0, vocabulary: 0 }
                });
            }
        })
    ]);

    // Maintainability Index Calculation
    // MI = 171 - 5.2 * ln(Halstead Volume) - 0.23 * (Cyclomatic Complexity) - 16.2 * ln(LOC)
    // Note: Volume can be 0, so Math.max(1, volume)
    // LOC can be 0.
    const volume = Math.max(1, astMetrics.halstead.volume);
    const loc = Math.max(1, textMetrics.loc);
    const maintainabilityIndex = Math.max(0, 171 - 5.2 * Math.log(volume) - 0.23 * astMetrics.cyclomaticComplexity - 16.2 * Math.log(loc));

    const metrics: CodeMetrics = {
        fileName: path.basename(filePath),
        ...textMetrics,
        ...astMetrics,
        maintainabilityIndex
    };

    // Log summary
    console.error(`${metrics.fileName}: Comp ${metrics.cyclomaticComplexity} Cog ${metrics.cognitiveComplexity} MI ${metrics.maintainabilityIndex.toFixed(2)}`);

    return metrics;
}

async function getDirectoryMetrics(dirPath: string): Promise<CodeMetrics> {
    // Aggregate metrics
    // For complexity/size, we sum.
    // For MI/Density, we average or re-calculate? 
    // Requirement: "recursively sum both metrics". 
    // For holistic, summing complexity/LOC makes sense.
    // Summing MI doesn't make sense physically. Weighted average?
    // Let's implement summation for additive metrics, and zero/null for file-specific ratios in directory context,
    // OR just calculate total size/complexity.
    // The simplest interpretation of "metrics for a folder" is the sum of cost metrics.
    // Non-additive metrics like MI will be averaged for the directory view.

    let total: CodeMetrics = {
        fileName: path.basename(dirPath),
        cyclomaticComplexity: 0,
        cognitiveComplexity: 0,
        nestingDepth: 0, // Max of children
        halstead: { volume: 0, effort: 0, difficulty: 0, length: 0, vocabulary: 0 },
        maintainabilityIndex: 0, // Average?
        loc: 0,
        sloc: 0,
        commentLines: 0,
        commentDensity: 0,
        fanOut: 0
    };

    let fileCount = 0;

    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        // Process in parallel
        const promises = entries.map(async (entry) => {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                return getDirectoryMetrics(fullPath);
            } else if (entry.isFile()) {
                return analyzeFile(fullPath);
            }
            return null;
        });

        const results = await Promise.all(promises);

        for (const res of results) {
            if (!res) continue;
            fileCount++; // Actually if directory, it counts as 1 item or we count all files inside?
            // Recursive getDirectoryMetrics returns aggregated stats.

            total.cyclomaticComplexity += res.cyclomaticComplexity;
            total.cognitiveComplexity += res.cognitiveComplexity;
            total.nestingDepth = Math.max(total.nestingDepth, res.nestingDepth);
            total.halstead.volume += res.halstead.volume;
            total.halstead.effort += res.halstead.effort;
            total.halstead.difficulty = Math.max(total.halstead.difficulty, res.halstead.difficulty); // Diff is inherent? Summing diff doesn't make sense.
            total.halstead.length += res.halstead.length;
            total.halstead.vocabulary += res.halstead.vocabulary;

            total.loc += res.loc;
            total.sloc += res.sloc;
            total.commentLines += res.commentLines;
            total.fanOut += res.fanOut;

            // Sum MI to average later
            total.maintainabilityIndex += res.maintainabilityIndex;
        }
    } catch (error) {
        console.error(`Error reading directory ${dirPath}:`, error);
    }

    if (fileCount > 0) {
        total.maintainabilityIndex /= fileCount;
        total.commentDensity = total.loc > 0 ? total.commentLines / total.loc : 0;
    }

    return total;
}

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
- loc/sloc: Raw 'Lines of Code' vs 'Source Lines of Code' (excluding comments/blanks). SLOC is a better proxy for program size.
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
