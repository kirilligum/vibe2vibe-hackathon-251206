import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverPath = path.join(__dirname, "build/index.js");
const testDataPath = path.join(__dirname, "test_data");

async function main() {
    const transport = new StdioClientTransport({
        command: "node",
        args: [serverPath],
    });

    const client = new Client(
        {
            name: "test-client",
            version: "1.0.0",
        },
        {
            capabilities: {},
        }
    );

    try {
        await client.connect(transport);
        console.log("Connected to server");

        const toolsList = await client.listTools();
        const hasTool = toolsList.tools.some((t) => t.name === "calculate_metrics");

        if (!hasTool) {
            console.error("FAILED: calculate_metrics tool not found");
            process.exit(1);
        }
        console.log("Tool found");

        const result = await client.callTool({
            name: "calculate_metrics",
            arguments: {
                path: testDataPath,
            },
        });

        const content = result.content[0].text;
        console.log("Result content:", content);

        if (
            content.match(/Total complexity: \d+/) &&
            content.match(/Total characters: \d+/)
        ) {
            console.log("SUCCESS: Metrics returned");
            await transport.close();
            process.exit(0);
        } else {
            console.error("FAILED: Output format mismatch");
            await transport.close();
            process.exit(1);
        }
    } catch (error) {
        console.error("Verification failed:", error);
        process.exit(1);
    }
}

main();
