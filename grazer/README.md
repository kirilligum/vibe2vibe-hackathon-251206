# MCP File Metrics Server

A Model Context Protocol (MCP) server that provides tools to calculate **Cyclomatic Complexity** and **Character Count** for files and directories.

## Features

- **Cyclomatic Complexity**: Calculates complexity for JavaScript/TypeScript files using AST traversal. Recursively aggregates for directories.
- **Character Count**: calculates total character count for files and directories.
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
