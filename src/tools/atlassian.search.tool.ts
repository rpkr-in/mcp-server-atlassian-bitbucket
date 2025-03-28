import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import {
	SearchToolArgsType,
	SearchToolArgs,
} from './atlassian.search.types.js';

import atlassianRepositoriesController from '../controllers/atlassian.repositories.controller.js';
import atlassianPullRequestsController from '../controllers/atlassian.pullrequests.controller.js';

/**
 * MCP Tool: Search Bitbucket
 *
 * Searches Bitbucket content across repositories and pull requests.
 * Returns a formatted markdown response with search results.
 *
 * @param {SearchToolArgsType} args - Tool arguments for the search query
 * @param {RequestHandlerExtra} _extra - Extra request handler information (unused)
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with formatted search results
 * @throws Will return error message if search fails
 */
async function search(args: SearchToolArgsType, _extra: RequestHandlerExtra) {
	const toolLogger = Logger.forContext(
		'tools/atlassian.search.tool.ts',
		'search',
	);
	toolLogger.debug('Searching Bitbucket with query:', args);

	try {
		// Determine what to search based on the scope
		const scope = args.scope || 'all';
		const query = args.query || '';
		const workspaceSlug = args.workspaceSlug;

		if (!workspaceSlug) {
			throw new Error('workspaceSlug is required for Bitbucket search');
		}

		let repoResults: {
			content: string;
			pagination: {
				count: number;
				hasMore: boolean;
				nextCursor?: string;
			};
		} = {
			content: '',
			pagination: { count: 0, hasMore: false },
		};
		let prResults: {
			content: string;
			pagination: {
				count: number;
				hasMore: boolean;
				nextCursor?: string;
			};
		} = {
			content: '',
			pagination: { count: 0, hasMore: false },
		};

		// Search repositories if scope is 'all' or 'repositories'
		if (scope === 'all' || scope === 'repositories') {
			repoResults = (await atlassianRepositoriesController.list({
				workspaceSlug,
				query,
				limit: args.limit,
				cursor: args.cursor,
			})) as any;
		}

		// Search pull requests if scope is 'all' or 'pullrequests' and a repository slug is provided
		if ((scope === 'all' || scope === 'pullrequests') && args.repoSlug) {
			prResults = (await atlassianPullRequestsController.list({
				workspaceSlug,
				repoSlug: args.repoSlug,
				query,
				limit: args.limit,
				cursor: args.cursor,
			})) as any;
		}

		// Combine results with headers
		let combinedContent = '';
		let totalCount = 0;

		if (scope === 'all' || scope === 'repositories') {
			combinedContent += `# Repository Search Results\n\n${repoResults.content}\n\n`;
			totalCount += repoResults.pagination.count || 0;
		}

		if ((scope === 'all' || scope === 'pullrequests') && args.repoSlug) {
			combinedContent += `# Pull Request Search Results\n\n${prResults.content}\n\n`;
			totalCount += prResults.pagination.count || 0;
		}

		// Add a summary at the top
		const summaryContent = `## Search Summary\n\nFound ${totalCount} results for query "${query}" in workspace "${workspaceSlug}".\n\n${combinedContent}`;

		toolLogger.debug(
			'Successfully retrieved search results from controllers',
		);

		return {
			content: [
				{
					type: 'text' as const,
					text: summaryContent,
				},
			],
		};
	} catch (error) {
		toolLogger.error('Failed to search Bitbucket', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Register Atlassian Search MCP Tools
 *
 * Registers the search tool with the MCP server.
 * The tool is registered with its schema, description, and handler function.
 *
 * @param {McpServer} server - The MCP server instance to register tools with
 */
function register(server: McpServer) {
	const toolLogger = Logger.forContext(
		'tools/atlassian.search.tool.ts',
		'register',
	);
	toolLogger.debug('Registering Atlassian Search tools...');

	// Register the search tool
	server.tool(
		'search',
		`Search Bitbucket content across repositories and pull requests.

        PURPOSE: Provides a unified search interface for Bitbucket workspaces, searching across repository names/descriptions and pull request titles/descriptions to help locate resources.

        WHEN TO USE:
        - When you need to find repositories containing specific text in their name or description.
        - When you need to find pull requests containing specific text in their title or description.
        - When you want to search across multiple types of Bitbucket content in a single operation.
        - When you need to quickly locate resources within a workspace.

        WHEN NOT TO USE:
        - When you need to search code content inside files (not supported by Bitbucket API).
        - When you already know the exact repository and need its details (use 'get_repository' instead).
        - When you already know the exact pull request and need its details (use 'get_pull_request' instead).
        - When you need to list all repositories or pull requests without filtering (use respective list tools).

        RETURNS: Formatted search results including:
        - Repository results with name, description, and update information
        - Pull request results with title, state, and branch information
        - Summary information and links to relevant resources
        
        Results can be paginated using the 'limit' and 'cursor' parameters.

        EXAMPLES:
        - Search repositories in a workspace: { workspaceSlug: "my-team", query: "api", scope: "repositories" }
        - Search pull requests in a repository: { workspaceSlug: "my-team", repoSlug: "backend", query: "fix", scope: "pullrequests" }
        - Search both repositories and pull requests: { workspaceSlug: "my-team", repoSlug: "backend", query: "feature", scope: "all" }
        
        LIMITATIONS:
        - Code content search is not supported by Bitbucket API (only repository metadata and pull request content)
        - Pull request search requires both workspace and repository slugs
        - The search is limited to text matching in metadata, not semantic search

        ERRORS:
        - Missing workspace slug: The workspaceSlug parameter is required.
        - Repository not found: When searching pull requests with an invalid repoSlug.
        - Authentication failures: Check Bitbucket credentials.
        - No results: Try broadening search criteria or different search terms.`,
		SearchToolArgs.shape,
		search,
	);

	toolLogger.debug('Successfully registered Atlassian Search tools');
}

export default { register };
