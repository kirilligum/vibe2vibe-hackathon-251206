export interface CodeMetrics {
    fileName: string;
    // Complexity
    cyclomaticComplexity: number;
    cognitiveComplexity: number;
    nestingDepth: number;
    // Halstead
    halstead: {
        volume: number;
        effort: number;
        difficulty: number;
        length: number;
        vocabulary: number;
    };
    // Maintainability
    maintainabilityIndex: number;
    // Size & Readability
    loc: number; // Raw lines
    sloc: number; // Source lines (no empty/comments)
    commentLines: number;
    commentDensity: number; // commentLines / loc
    // Architecture
    fanOut: number; // Unique imports
}
