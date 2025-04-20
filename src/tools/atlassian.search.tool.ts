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
		'search',
		`Search Bitbucket content across repositories, pull requests, commits, and code.

        PURPOSE: Provides a unified search interface for Bitbucket workspaces, searching across repository names/descriptions, pull request titles/descriptions, commit messages, and code content to help locate resources.

        WHEN TO USE:
        - When you need to find repositories containing specific text in their name or description.
        - When you need to find pull requests containing specific text in their title or description.
        - When you need to find commits containing specific text in their message.
        - When you need to search for specific code patterns or text within repository files.
        - When you want to search across multiple types of Bitbucket content in a single operation.
        - When you need to quickly locate resources within a workspace.

        WHEN NOT TO USE:
        - When you already know the exact repository and need its details (use 'get_repository' instead).
        - When you already know the exact pull request and need its details (use 'get_pull_request' instead).
        - When you need to list all repositories or pull requests without filtering (use respective list tools).

        RETURNS: Formatted search results including:
        - Repository results with name, description, and update information
        - Pull request results with title, state, and branch information
        - Commit results with hash, author, date, and message
        - Code search results with file path, line numbers, and matching snippets
        - Summary information and links to relevant resources
        
        Results can be paginated using the 'limit' and 'cursor' parameters.

        EXAMPLES:
        - Search repositories in a workspace: { workspaceSlug: "my-team", query: "api", scope: "repositories" }
        - Search pull requests in a repository: { workspaceSlug: "my-team", repoSlug: "backend", query: "fix", scope: "pullrequests" }
        - Search commits in a repository: { workspaceSlug: "my-team", repoSlug: "backend", query: "update", scope: "commits" }
        - Search code in a workspace: { workspaceSlug: "my-team", query: "function getUser", scope: "code" }
        - Search code in a specific repo: { workspaceSlug: "my-team", repoSlug: "backend", query: "class User", scope: "code" }
        - Search both repositories and pull requests: { workspaceSlug: "my-team", repoSlug: "backend", query: "feature", scope: "all" }
        
        LIMITATIONS:
        - Pull request search requires both workspace and repository slugs
        - Commit search requires both workspace and repository slugs
        - The repository and pull request search is limited to text matching in metadata, not semantic search
        - Code search results are presented with line context but may not show the full file
        - Pagination mechanisms differ between metadata search (cursor-based) and code search (page-based)

        ERRORS:
        - Missing workspace slug: The workspaceSlug parameter is required.
        - Missing repository slug: The repoSlug parameter is required when scope is "pullrequests" or "commits".
        - Missing query for code search: The query parameter is required when scope is "code".
        - Repository not found: When searching pull requests or commits with an invalid repoSlug.
        - Authentication failures: Check Bitbucket credentials.
        - No results: Try broadening search criteria or different search terms.`,
		SearchToolArgs.shape,
		search,
	);

	methodLogger.debug('Successfully registered Atlassian Search tools');
}

export default { registerTools };
