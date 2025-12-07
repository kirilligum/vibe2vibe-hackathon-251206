# MCP File Metrics Server

A Model Context Protocol (MCP) server that provides tools to calculate **Cyclomatic Complexity** and **Character Count** for files and directories.

## Features

- **Cyclomatic Complexity**: Measures the number of linearly independent paths through the code's control flow. A higher number implies more test cases are needed to cover all logic.
  - *Lower is better.* (Typical threshold: < 10 per function)
- **Cognitive Complexity**: Estimates how difficult the code is for a human to understand. Unlike Cyclomatic Complexity, it penalizes deep nesting and "breaks" in linear flow that increase mental load.
  - *Lower is better.*
- **Maintainability Index (MI)**: A composite score (0-100+) calculated from Halstead Volume, Cyclomatic Complexity, and LOC. It provides a high-level estimate of how easy it is to support and change the code.
  - *Higher is better.* (Typical thresholds: > 85 is good, < 65 is hard to maintain)
- **Halstead Metrics**: A set of software science metrics based on the number of distinct operators and operands.
  - **Volume**: Represents the information content (size in bits) of the algorithm implementation. *Lower is better.*
  - **Effort**: An estimate of the mental effort required to develop or understand the code. *Lower is better.*
- **Code Size**:
  - **loc**: Raw Lines of Code.
  - **sloc**: Source Lines of Code (excluding blanks and comments). A more accurate measure of "real" code size. *Lower is usually better.*
  - **commentDensity**: The ratio of comment lines to total lines. Helps assess if the code is sufficiently documented. *Higher is generally better* (up to a reasonable point).
- **Fan-Out**: The number of unique modules imported by this file. High fan-out indicates high coupling, making the module harder to test and reuse in isolation.
  - *Lower is better* (indicates looser coupling).
- **Logging**: Logs file-level complexity metrics to stderr for visibility.

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```
2. Build the project:
   ```bash
   npm run build
   ```

## Usage

### Running with Claude Code

To add this server to Claude Code, run:

```bash
claude mcp add mcp-file-metrics -- node /path/to/project/build/index.js
```
*(Replace `/path/to/project` with the absolute path to this directory)*

### Programmatic Usage

The easiest way to call this MCP server programmatically is to use an MCP-compliant client (like Claude Code, or the standard SDK).

#### Request Example (JSON-RPC)

If you are implementing a client manually, send a `tools/call` request:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "calculate_metrics",
    "arguments": {
      "path": "/absolute/path/to/file.ts"
    }
  }
}
```

#### Response Example

The tool returns a JSON object embedded in the content. Here is what a typical response looks like:

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"fileName\": \"example.ts\",\n  \"cyclomaticComplexity\": 5,\n  \"cognitiveComplexity\": 3,\n  \"nestingDepth\": 2,\n  \"halstead\": {\n    \"volume\": 150.2,\n    \"effort\": 430.5,\n    \"difficulty\": 2.8,\n    \"length\": 45,\n    \"vocabulary\": 12\n  },\n  \"maintainabilityIndex\": 85.4,\n  \"loc\": 50,\n  \"sloc\": 38,\n  \"commentLines\": 5,\n  \"commentDensity\": 0.1,\n  \"fanOut\": 2\n}"
    }
  ]
}
```

### Verification

A verification script is included to test the server functionality programmatically. It uses the official MCP SDK Client to connect to the server and validate the output.

To run the verification:

```bash
node verify_server.js
```

This script will:
1. Start the server (from `build/index.js`).
2. Connect to it via stdio.
3. Call the `calculate_metrics` tool on the `test_data` directory.
4. assert that the returned complexity and character counts match expected values.
5. Exit with 0 on success, or 1 on failure.

Logs of individual file complexity will be printed to stderr during the process.
