# MCP File Metrics Server

A Model Context Protocol (MCP) server that provides tools to calculate **Cyclomatic Complexity** and **Character Count** for files and directories.

## Features

- **Cyclomatic Complexity**: Measures the number of independent paths through the code. 
  - *Lower is better.* (Typical threshold: < 10 per function)
- **Cognitive Complexity**: Measures how difficult the code is to understand, penalizing nesting and structural breaks.
  - *Lower is better.*
- **Maintainability Index (MI)**: A composite score (0-100+) indicating how maintainable the code is.
  - *Higher is better.* (Typical thresholds: > 85 is good, < 65 is hard to maintain)
- **Halstead Metrics**: A set of metrics based on operators and operands.
  - **Volume**: Information content of the code. *Lower is better.*
  - **Effort**: Mental effort required to develop or understand. *Lower is better.*
- **Code Size**:
  - **loc**: Raw Lines of Code.
  - **sloc**: Source Lines of Code (excluding blanks/comments). *Lower is usually better.*
  - **commentDensity**: Ratio of comments to code. *Higher is generally better* (up to a reasonable point).
- **Fan-Out**: Number of unique imports (dependencies).
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
