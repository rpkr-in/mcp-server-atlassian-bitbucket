import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import {
	ListRepositoriesToolArgs,
	ListRepositoriesToolArgsType,
	GetRepositoryToolArgs,
	GetRepositoryToolArgsType,
} from './atlassian.repositories.types.js';

import atlassianRepositoriesController from '../controllers/atlassian.repositories.controller.js';

// Create a contextualized logger for this file
const toolLogger = Logger.forContext('tools/atlassian.repositories.tool.ts');

// Log tool initialization
toolLogger.debug('Bitbucket repositories tool initialized');

/**
 * MCP Tool: List Bitbucket Repositories
 *
 * Lists Bitbucket repositories within a workspace with optional filtering.
 * Returns a formatted markdown response with repository details.
 *
 * @param args - Tool arguments for filtering repositories
 * @param _extra - Extra request handler information (unused)
 * @returns MCP response with formatted repositories list
 * @throws Will return error message if repository listing fails
 */
async function listRepositories(
	args: ListRepositoriesToolArgsType,
	_extra: RequestHandlerExtra,
) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.repositories.tool.ts',
		'listRepositories',
	);
	methodLogger.debug('Listing Bitbucket repositories with filters:', args);

	try {
		// Pass the options to the controller
		const message = await atlassianRepositoriesController.list({
			workspaceSlug: args.workspaceSlug,
			query: args.query,
			role: args.role,
			sort: args.sort,
			limit: args.limit,
			cursor: args.cursor,
		});

		methodLogger.debug(
			'Successfully retrieved repositories from controller',
			message,
		);

		return {
			content: [
				{
					type: 'text' as const,
					text: message.content,
				},
			],
		};
	} catch (error) {
		methodLogger.error('Failed to list repositories', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * MCP Tool: Get Bitbucket Repository Details
 *
 * Retrieves detailed information about a specific Bitbucket repository.
 * Returns a formatted markdown response with repository metadata.
 *
 * @param args - Tool arguments containing the workspace and repository slug
 * @param _extra - Extra request handler information (unused)
 * @returns MCP response with formatted repository details
 * @throws Will return error message if repository retrieval fails
 */
async function getRepository(
	args: GetRepositoryToolArgsType,
	_extra: RequestHandlerExtra,
) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.repositories.tool.ts',
		'getRepository',
	);

	methodLogger.debug(
		`Retrieving repository details for ${args.workspaceSlug}/${args.repoSlug}`,
		args,
	);

	try {
		const message = await atlassianRepositoriesController.get({
			workspaceSlug: args.workspaceSlug,
			repoSlug: args.repoSlug,
		});

		methodLogger.debug(
			'Successfully retrieved repository details from controller',
			message,
		);

		return {
			content: [
				{
					type: 'text' as const,
					text: message.content,
				},
			],
		};
	} catch (error) {
		methodLogger.error('Failed to get repository details', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Register Atlassian Repositories MCP Tools
 *
 * Registers the list-repositories and get-repository tools with the MCP server.
 * Each tool is registered with its schema, description, and handler function.
 *
 * @param server - The MCP server instance to register tools with
 */
function register(server: McpServer) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.repositories.tool.ts',
		'register',
	);
	methodLogger.debug('Registering Atlassian Repositories tools...');

	// Register the list repositories tool
	server.tool(
		'list-repositories',
		`List repositories within a specific Bitbucket workspace, with optional filtering and pagination. Requires 'workspaceSlug'.

        PURPOSE: Discover repositories within a given workspace and retrieve their slugs, names, owners, and basic metadata. Essential for finding the 'repoSlug' needed for repository or pull request details tools.

        WHEN TO USE:
        - To find the 'repoSlug' for a known repository name within a specific workspace.
        - To explore all repositories within a known workspace ('workspaceSlug' is required).
        - To filter repositories based on name ('query'), your role ('role'), or sort them ('sort').
        - Before using 'get-repository' or pull request tools if the 'repoSlug' is unknown.

        WHEN NOT TO USE:
        - When you don't know the 'workspaceSlug' (use 'list-workspaces' first).
        - When you already have the 'repoSlug' and need full details (use 'get-repository').
        - When you need pull request information (use pull request tools).

        RETURNS: Formatted list of repositories including name, full name, owner, description, privacy status, dates, and URL. Includes pagination details if applicable.

        EXAMPLES:
        - List repositories in a workspace: { workspaceSlug: "my-team" }
        - Filter by name fragment: { workspaceSlug: "my-team", query: "backend-api" }
        - Filter by your role: { workspaceSlug: "my-team", role: "contributor" }
        - Sort by last update (descending): { workspaceSlug: "my-team", sort: "-updated_on" }
        - Paginate results: { workspaceSlug: "my-team", limit: 10, cursor: "next-page-token" }

        ERRORS:
        - Workspace not found: Verify the 'workspaceSlug' is correct.
        - Authentication failures: Check Bitbucket credentials.
        - No repositories found: Workspace might be empty, filters too restrictive, or permissions lacking.`,
		ListRepositoriesToolArgs.shape,
		listRepositories,
	);

	// Register the get repository details tool
	server.tool(
		'get-repository',
		`Get detailed information about a specific Bitbucket repository using its workspace and repository slugs. Requires 'workspaceSlug' and 'repoSlug'.

        PURPOSE: Retrieves comprehensive metadata for a *known* repository, including UUID, owner, description, language, size, creation/update dates, and links.

        WHEN TO USE:
        - When you need full details about a *specific* repository and you know its 'workspaceSlug' and 'repoSlug'.
        - After using 'list-repositories' to identify the target repository slugs.
        - To get repository metadata before analyzing its pull requests or content.

        WHEN NOT TO USE:
        - When you don't know the 'workspaceSlug' or 'repoSlug' (use 'list-workspaces' and/or 'list-repositories' first).
        - When you only need a list of repositories (use 'list-repositories').
        - When you need pull request information (use pull request tools).

        RETURNS: Detailed repository information including name, full name, UUID, description, language, size, owner, dates, and links. Fetches all available details by default.

        EXAMPLES:
        - Get details for a repository: { workspaceSlug: "my-team", repoSlug: "backend-api" }

        ERRORS:
        - Repository not found: Verify the 'workspaceSlug' and 'repoSlug' are correct and the repository exists.
        - Permission errors: Ensure you have access to view the specified repository.`,
		GetRepositoryToolArgs.shape,
		getRepository,
	);

	methodLogger.debug('Successfully registered Atlassian Repositories tools');
}

export default { register };
