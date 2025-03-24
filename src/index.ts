#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { logger } from './utils/logger.util.js';
import { config } from './utils/config.util.js';
import { createUnexpectedError } from './utils/error.util.js';
import { runCli } from './cli/index.js';

// Import Jira-specific tools
import atlassianProjectsTools from './tools/atlassian.projects.tool.js';
import atlassianIssuesTools from './tools/atlassian.issues.tool.js';

// Define version constant for easier management and consistent versioning
const VERSION = '1.1.4';

let serverInstance: McpServer | null = null;
let transportInstance: SSEServerTransport | StdioServerTransport | null = null;

export async function startServer(mode: 'stdio' | 'sse' = 'stdio') {
	// Load configuration
	config.load();

	// Enable debug logging if DEBUG is set to true
	if (config.getBoolean('DEBUG')) {
		logger.debug('[src/index.ts] Debug mode enabled');
	}

	// Log the DEBUG value to verify configuration loading
	logger.info(`[src/index.ts] DEBUG value: ${process.env.DEBUG}`);
	logger.info(
		`[src/index.ts] ATLASSIAN_API_TOKEN value exists: ${Boolean(process.env.ATLASSIAN_API_TOKEN)}`,
	);
	logger.info(`[src/index.ts] Config DEBUG value: ${config.get('DEBUG')}`);

	serverInstance = new McpServer({
		name: '@aashari/mcp-atlassian-jira',
		version: VERSION,
	});

	if (mode === 'stdio') {
		transportInstance = new StdioServerTransport();
	} else {
		throw createUnexpectedError('SSE mode is not supported yet');
	}

	logger.info(
		`[src/index.ts] Starting Jira MCP server with ${mode.toUpperCase()} transport...`,
	);

	// register tools
	atlassianProjectsTools.register(serverInstance);
	atlassianIssuesTools.register(serverInstance);

	return serverInstance.connect(transportInstance).catch((err) => {
		logger.error(`[src/index.ts] Failed to start server`, err);
		process.exit(1);
	});
}

// Main entry point - this will run when executed directly
async function main() {
	// Load configuration
	config.load();

	// Log the DEBUG value to verify configuration loading
	logger.info(`[src/index.ts] DEBUG value: ${process.env.DEBUG}`);
	logger.info(
		`[src/index.ts] ATLASSIAN_API_TOKEN value exists: ${Boolean(process.env.ATLASSIAN_API_TOKEN)}`,
	);
	logger.info(`[src/index.ts] Config DEBUG value: ${config.get('DEBUG')}`);

	// Check if arguments are provided (CLI mode)
	if (process.argv.length > 2) {
		// CLI mode: Pass arguments to CLI runner
		await runCli(process.argv.slice(2));
	} else {
		// MCP Server mode: Start server with default STDIO
		await startServer();
	}
}

// If this file is being executed directly (not imported), run the main function
if (require.main === module) {
	main();
}

// Export key utilities for library users
export { logger, config };
export * from './utils/error.util.js';
