import ts from "typescript";

// Based on SonarSource Cognitive Complexity whitepaper
// https://www.sonarsource.com/docs/CognitiveComplexity.pdf

export function calculateCognitiveComplexity(node: ts.Node): number {
    let complexity = 0;

    function visit(node: ts.Node, nesting: number) {
        let increment = 0;
        let nextNesting = nesting;

        switch (node.kind) {
            case ts.SyntaxKind.IfStatement:
            case ts.SyntaxKind.WhileStatement:
            case ts.SyntaxKind.DoStatement:
            case ts.SyntaxKind.ForStatement:
            case ts.SyntaxKind.ForInStatement:
            case ts.SyntaxKind.ForOfStatement:
            case ts.SyntaxKind.CatchClause:
                increment = 1 + nesting;
                nextNesting = nesting + 1;
                break;

            case ts.SyntaxKind.ConditionalExpression: // Ternary
                increment = 1 + nesting;
                // Ternaries usually don't increment nesting level for their children in the same way blocks do for structural nesting,
                // but often the nested ternary pattern implies complexity. 
                // Simple heuristic: linear + nesting penalty applies.
                nextNesting = nesting + 1;
                break;

            case ts.SyntaxKind.SwitchStatement:
                increment = 1 + nesting;
                nextNesting = nesting + 1;
                break;

            // Binary operators that break flow
            case ts.SyntaxKind.AmpersandAmpersandToken:
            case ts.SyntaxKind.BarBarToken:
                // These are handled by checking BinaryExpression
                break;
        }

        // Checking Binary Expressions for && and || sequences
        if (ts.isBinaryExpression(node)) {
            if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
                node.operatorToken.kind === ts.SyntaxKind.BarBarToken) {

                // Only increment if the left side is NOT the same operator (to group sequences like a && b && c as +1)
                let isSequence = false;
                if (ts.isBinaryExpression(node.left)) {
                    if (node.left.operatorToken.kind === node.operatorToken.kind) {
                        isSequence = true;
                    }
                }

                if (!isSequence) {
                    increment = 1; // Boolean operators do not suffer from nesting penalty in the standard, but often do in variations. sticking to +1.
                }
            }
        }

        // Function declarations reset nesting or increment?
        // Functions inside functions -> increment nesting.
        if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isMethodDeclaration(node)) {
            nextNesting = nesting + 1;
        }

        complexity += increment;

        ts.forEachChild(node, child => visit(child, nextNesting));
    }

    visit(node, 0);
    return complexity;
}
