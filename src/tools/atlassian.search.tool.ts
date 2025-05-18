import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import {
	SearchToolArgsType,
	SearchToolArgsBase,
} from './atlassian.search.types.js';

import atlassianSearchController from '../controllers/atlassian.search.controller.js';

const toolLogger = Logger.forContext('tools/atlassian.search.tool.ts');

/**
 * MCP Tool: Search Bitbucket
 *
 * Searches Bitbucket content across repositories and pull requests.
 * Returns a formatted markdown response with search results.
 *
 * @param {SearchToolArgsType} args - Tool arguments for the search query
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with formatted search results
 * @throws Will return error message if search fails
 */
async function search(args: SearchToolArgsType) {
	const methodLogger = toolLogger.forMethod('search');
	methodLogger.debug('Searching Bitbucket with query:', args);

	try {
		// Map args to controller options
		const controllerOptions = {
			workspaceSlug: args.workspaceSlug,
			repoSlug: args.repoSlug,
			query: args.query,
			scope: args.scope || 'all',
			limit: args.limit,
			cursor: args.cursor, // Controller handles mapping cursor to page if needed
		};

		// Call the controller search method
		const result =
			await atlassianSearchController.search(controllerOptions);

		methodLogger.debug('Search completed successfully');

		return {
			content: [
				{
					type: 'text' as const,
					text: result.content, // Now contains all information including pagination
				},
			],
		};
	} catch (error) {
		methodLogger.error('Failed to search Bitbucket', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Register Atlassian Search MCP Tools
 *
 * Registers the search-related tools with the MCP server.
 * Each tool is registered with its schema, description, and handler function.
 *
 * @param server - The MCP server instance to register tools with
 */
function registerTools(server: McpServer) {
	const methodLogger = toolLogger.forMethod('registerTools');
	methodLogger.debug('Registering Atlassian Search tools...');

	// Register the search tool
	server.tool(
		'bb_search',
		`Searches Bitbucket content within a specified \`workspaceSlug\`. Requires a \`query\` string. Optionally scope the search using \`scope\` ('repositories', 'pullrequests', 'commits', 'code', or 'all' - default). The \`code\` scope supports filtering by \`language\` or \`extension\`. The 'pullrequests' and 'commits' scopes require \`repoSlug\`. Supports pagination via \`limit\` and \`cursor\` (or \`page\` for code scope). Pagination details (like next cursor or total items) are included at the end of the text content. Returns formatted Markdown results. The 'all' scope automatically tries different scopes and prefixes the output indicating which scope returned results. Requires Bitbucket credentials.`,
		SearchToolArgsBase.shape,
		search,
	);

	methodLogger.debug('Successfully registered Atlassian Search tools');
}

export default { registerTools };
