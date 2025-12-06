export interface TextMetrics {
    loc: number;
    sloc: number;
    commentLines: number;
    commentDensity: number;
}

export function analyzeText(content: string): TextMetrics {
    const lines = content.split(/\r?\n/);
    const loc = lines.length;

    let commentLines = 0;
    let emptyLines = 0;
    let inBlockComment = false;

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '') {
            emptyLines++;
            continue;
        }

        if (inBlockComment) {
            commentLines++;
            if (trimmed.endsWith('*/') || trimmed.includes('*/')) {
                inBlockComment = false;
                // Note: Assuming */ ends the block and anything after is neglible or mixed.
                // For robust mixed-content handling we'd need a parser, but this is a text heuristic.
            }
            continue;
        }

        if (trimmed.startsWith('/*')) {
            commentLines++;
            if (!trimmed.endsWith('*/') && !trimmed.includes('*/')) {
                inBlockComment = true;
            }
            continue;
        }

        if (trimmed.startsWith('//')) {
            commentLines++;
        }
    }

    const sloc = loc - emptyLines - commentLines;
    const commentDensity = loc > 0 ? commentLines / loc : 0;

    return {
        loc,
        sloc,
        commentLines,
        commentDensity
    };
}
