# MCP File Metrics Server

**A high-performance Model Context Protocol (MCP) server for instant, holistic code quality analysis.**

## Elevator Pitch
Stop guessing about code quality. This MCP server acts as an intelligent sidecar for your LLM agents (like Claude), instantly calculating sophisticated metrics like Cognitive Complexity, Cyclomatic Complexity, Halstead measures, and Maintainability Indices for any file or directory. It empowers AI to "see" the structure and cost of code, not just the text.

## Motivation & Description
As AI coding assistants become more capable, they need quantitative data to make better decisions. A long file isn't necessarily complex, and a short file isn't necessarily simple. 
This project serves as a bridge between raw source code and actionable quality insights. By providing deterministic, AST-based metrics via a standardized protocol (MCP), it enables tooling to:
- Automatically flag potential refactoring candidates.
- Assess the readability cost of proposed changes.
- Visualize architectural coupling (Fan-Out).

It is built to be **fast** (parallelized execution), **stateless**, and **easy to deploy** as a local stdio process.

## System Architecture

The server follows a modular, parallelized pipeline architecture.

```mermaid
graph TD
    Client[MCP Client (Claude/IDE)] -->|CallTool: calculate_metrics| Server[MCP Server]
    Server -->|Parse Request| Orchestrator[Analysis Orchestrator]
    
    Orchestrator -->|Spawn| TextAnalyzer[Text Analyzer]
    Orchestrator -->|Spawn| ASTAnalyzer[AST Analyzer]
    
    subgraph Parallel Execution
        TextAnalyzer -->|Regex/Scan| TextMetrics[SLOC/Comments]
        ASTAnalyzer -->|ts.createSourceFile| AST[TypeScript AST]
        AST -->|Visitor| Cyclomatic[Cyclomatic Complexity]
        AST -->|Visitor| Cognitive[Cognitive Complexity]
        AST -->|Visitor| Halstead[Halstead Logic]
        AST -->|Visitor| FanOut[Fan-Out]
    end
    
    TextMetrics --> Aggregator
    Cyclomatic --> Aggregator
    Cognitive --> Aggregator
    Halstead --> Aggregator
    FanOut --> Aggregator
    
    Aggregator -->|Synthesize| MI[Maintainability Index]
    Aggregator -->|Return| Response[JSON Result]
    Response -->|JSON-RPC| Client
```

## Tech Stack
- **Language**: TypeScript
- **Runtime**: Node.js
- **Protocol**: Model Context Protocol (MCP) SDK
- **Core Library**: `typescript` (Compiler API) for robust AST parsing.
- **Validation**: `zod` for runtime schema validation.

## User Flow

1. **Discovery**: The user (or agent) executes `tools/list` and sees `calculate_metrics`.
2. **Action**: The agent calls `calculate_metrics` with a file path (e.g., `/src/utils.ts`).
3. **Processing**: 
    - The server reads the file.
    - It spins up parallel analyzers for text and AST.
    - It computes base metrics and derived scores (like MI).
4. **Insight**: The server returns a JSON object with all metrics.
5. **Decision**: The agent uses this data to decide if the file needs refactoring or uses high complexity to explain the code more carefully.

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
  - **characterCount**: Total number of characters in the file/directory.
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

### REST API Usage

You can also run the server as a standalone REST API.

1. **Start the server**:
   ```bash
   npm run start:api
   ```
   The server listens on port 3000.

2. **Make a Request** (using `curl`):
   ```bash
   curl -X POST http://localhost:3000/metrics \
     -H "Content-Type: application/json" \
     -d '{"path": "/absolute/path/to/your/file.ts"}'
   ```

3. **Response**: Returns the same JSON structure as the MCP tool.

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

## Verification

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
