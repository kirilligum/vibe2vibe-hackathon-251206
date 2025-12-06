import ts from "typescript";
import { calculateCognitiveComplexity } from "./cognitive.js";

export interface ASTMetrics {
    cyclomaticComplexity: number;
    cognitiveComplexity: number;
    nestingDepth: number;
    fanOut: number;
    halstead: {
        volume: number;
        effort: number;
        difficulty: number;
        length: number;
        vocabulary: number;
    };
}

export function analyzeAST(sourceFile: ts.SourceFile): ASTMetrics {
    let cyclomaticComplexity = 1;
    let maxNesting = 0;
    let fanOut = 0;

    // Halstead tracking
    const operators = new Map<number, number>(); // SyntaxKind -> count
    const operands = new Map<string, number>();  // Identifier text / Literal text -> count

    function visit(node: ts.Node, depth: number) {
        maxNesting = Math.max(maxNesting, depth);
        let nextDepth = depth;

        // Cyclomatic Complexity
        switch (node.kind) {
            case ts.SyntaxKind.IfStatement:
            case ts.SyntaxKind.ForStatement:
            case ts.SyntaxKind.ForInStatement:
            case ts.SyntaxKind.ForOfStatement:
            case ts.SyntaxKind.WhileStatement:
            case ts.SyntaxKind.DoStatement:
            case ts.SyntaxKind.CaseClause:
            case ts.SyntaxKind.CatchClause:
            case ts.SyntaxKind.ConditionalExpression:
            case ts.SyntaxKind.AmpersandAmpersandToken:
            case ts.SyntaxKind.BarBarToken:
                cyclomaticComplexity++;
                break;

            case ts.SyntaxKind.Block:
                nextDepth = depth + 1;
                break;

            case ts.SyntaxKind.ImportDeclaration:
                fanOut++;
                break;
        }

        // Halstead - Operators
        if (isOperator(node)) {
            const kind = node.kind;
            operators.set(kind, (operators.get(kind) || 0) + 1);
        }
        // Halstead - Operands
        else if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
            const text = node.getText(sourceFile);
            operands.set(text, (operands.get(text) || 0) + 1);
        }

        ts.forEachChild(node, child => visit(child, nextDepth));
    }

    visit(sourceFile, 0);

    const cognitiveComplexity = calculateCognitiveComplexity(sourceFile);

    // Halstead Calculation
    const totalOperators = Array.from(operators.values()).reduce((a, b) => a + b, 0);
    const totalOperands = Array.from(operands.values()).reduce((a, b) => a + b, 0);
    const distinctOperators = operators.size;
    const distinctOperands = operands.size;

    const length = totalOperators + totalOperators;
    const vocabulary = distinctOperators + distinctOperands;
    const volume = length * Math.log2(Math.max(1, vocabulary));
    const difficulty = (distinctOperators / 2) * (totalOperands / Math.max(1, distinctOperands));
    const effort = volume * difficulty;

    return {
        cyclomaticComplexity,
        cognitiveComplexity,
        nestingDepth: maxNesting,
        fanOut,
        halstead: {
            volume,
            effort,
            difficulty,
            length,
            vocabulary
        }
    };
}

function isOperator(node: ts.Node): boolean {
    return (node.kind >= ts.SyntaxKind.FirstToken && node.kind <= ts.SyntaxKind.LastToken)
        || ts.isBinaryExpression(node) // Only count underlying token?
        // For simplicity in AST traversal, the tokens are leaf nodes.
        // e.g. "plusToken".
        // "BinaryExpression" is a container. We rely on visiting children to find the token.
        // But `visit` goes to children.
        // However, binary tokens like `+` are valid tokens.
        // Keywords like `if`, `return` are also operators in Halstead.
        || (node.kind >= ts.SyntaxKind.FirstKeyword && node.kind <= ts.SyntaxKind.LastKeyword);
}
