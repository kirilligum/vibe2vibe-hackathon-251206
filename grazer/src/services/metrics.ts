import * as fs from "fs/promises";
import * as path from "path";
import ts from "typescript";
import { analyzeText } from "../analyzers/text.js";
import { analyzeAST } from "../analyzers/ast.js";
import { CodeMetrics } from "../types.js";

export async function analyzeFile(filePath: string): Promise<CodeMetrics> {
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
        characterCount: content.length,
        maintainabilityIndex
    };

    // Log summary
    console.error(`${metrics.fileName}: Comp ${metrics.cyclomaticComplexity} Cog ${metrics.cognitiveComplexity} MI ${metrics.maintainabilityIndex.toFixed(2)}`);

    return metrics;
}

export async function getDirectoryMetrics(dirPath: string): Promise<CodeMetrics> {
    let total: CodeMetrics = {
        fileName: path.basename(dirPath),
        cyclomaticComplexity: 0,
        cognitiveComplexity: 0,
        nestingDepth: 0, // Max of children
        halstead: { volume: 0, effort: 0, difficulty: 0, length: 0, vocabulary: 0 },
        maintainabilityIndex: 0,
        loc: 0,
        sloc: 0,
        characterCount: 0,
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
            fileCount++;

            total.cyclomaticComplexity += res.cyclomaticComplexity;
            total.cognitiveComplexity += res.cognitiveComplexity;
            total.nestingDepth = Math.max(total.nestingDepth, res.nestingDepth);
            total.halstead.volume += res.halstead.volume;
            total.halstead.effort += res.halstead.effort;
            total.halstead.difficulty = Math.max(total.halstead.difficulty, res.halstead.difficulty);
            total.halstead.length += res.halstead.length;
            total.halstead.vocabulary += res.halstead.vocabulary;

            total.loc += res.loc;
            total.sloc += res.sloc;
            total.characterCount += res.characterCount;
            total.commentLines += res.commentLines;
            total.fanOut += res.fanOut;

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
