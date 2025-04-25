import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import {
	SearchToolArgsType,
	SearchToolArgs,
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
			cursor: args.cursor,
			// For code search pagination
			page:
				args.scope === 'code' && args.cursor
					? parseInt(args.cursor, 10)
					: undefined,
		};

		// Call the controller search method
		const result =
			await atlassianSearchController.search(controllerOptions);

		methodLogger.debug('Search completed successfully');

		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
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
		'bitbucket_search',
		`Searches Bitbucket content within a workspace (\`workspaceSlug\`) using a query (\`query\`), optionally filtering by scope (\`scope\`) and repository (\`repoSlug\`).\n- Scope can be 'repositories', 'pullrequests', 'commits', 'code', or 'all'.\n- Finds repositories (name/desc), PRs (title/desc), commits (message), or code matching the query.\n- Supports pagination via \`limit\` and \`cursor\` (or \`page\` for code scope).\nReturns formatted search results based on the scope, including relevant metadata and links.\n**Note:** 'pullrequests' and 'commits' scopes require \`repoSlug\`. Code search pagination uses \`page\` (derived from \`cursor\`), others use \`cursor\`.`,
		SearchToolArgs.shape,
		search,
	);

	methodLogger.debug('Successfully registered Atlassian Search tools');
}

export default { registerTools };
