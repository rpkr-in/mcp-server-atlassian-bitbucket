import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logger } from '../utils/logger.util.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import {
	ListRepositoriesToolArgs,
	ListRepositoriesToolArgsType,
	GetRepositoryToolArgs,
	GetRepositoryToolArgsType,
} from './atlassian.repositories.types.js';

import atlassianRepositoriesController from '../controllers/atlassian.repositories.controller.js';

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
	const logPrefix =
		'[src/tools/atlassian.repositories.tool.ts@listRepositories]';
	logger.debug(
		`${logPrefix} Listing Bitbucket repositories with filters:`,
		args,
	);

	try {
		// Pass the options to the controller
		const message = await atlassianRepositoriesController.list({
			parentId: args.workspaceSlug,
			query: args.query,
			role: args.role,
			sort: args.sort,
			limit: args.limit,
			cursor: args.cursor,
		});

		logger.debug(
			`${logPrefix} Successfully retrieved repositories from controller`,
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
		logger.error(`${logPrefix} Failed to list repositories`, error);
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
	const logPrefix =
		'[src/tools/atlassian.repositories.tool.ts@getRepository]';

	logger.debug(
		`${logPrefix} Retrieving repository details for ${args.workspaceSlug}/${args.repoSlug}`,
		args,
	);

	try {
		const message = await atlassianRepositoriesController.get({
			parentId: args.workspaceSlug,
			entityId: args.repoSlug,
		});

		logger.debug(
			`${logPrefix} Successfully retrieved repository details from controller`,
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
		logger.error(`${logPrefix} Failed to get repository details`, error);
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
	const logPrefix = '[src/tools/atlassian.repositories.tool.ts@register]';
	logger.debug(`${logPrefix} Registering Atlassian Repositories tools...`);

	// Register the list repositories tool
	server.tool(
		'list-repositories',
		`List repositories within a Bitbucket workspace with optional filtering.

PURPOSE: Helps you discover repositories within a workspace with their names, descriptions, and URLs.

WHEN TO USE:
- When you need to find all repositories in a workspace
- When you need to filter repositories by name or description
- When you need to get repository slugs for use with other Bitbucket tools
- When you need to sort repositories by specific criteria
- When you need repositories where you have a specific role

WHEN NOT TO USE:
- When you already know the specific repository slug (use get-repository instead)
- When you need detailed information about a single repository (use get-repository instead)
- When you need to find pull requests (use list-pull-requests instead)
- When you need to search across multiple workspaces (use multiple calls)

RETURNS: Formatted list of repositories with names, slugs, descriptions, and URLs.

EXAMPLES:
- List all repositories: {workspaceSlug: "myworkspace"}
- Filter by name: {workspaceSlug: "myworkspace", query: "api"}
- Filter by role: {workspaceSlug: "myworkspace", role: "admin"}
- Sort by update time: {workspaceSlug: "myworkspace", sort: "-updated_on"}
- With pagination: {workspaceSlug: "myworkspace", limit: 10, cursor: "next-page-token"}

ERRORS:
- Workspace not found: Verify the workspace slug is correct
- Authentication failures: Check your Bitbucket credentials
- No repositories: You may not have permission to view repositories`,
		ListRepositoriesToolArgs.shape,
		listRepositories,
	);

	// Register the get repository details tool
	server.tool(
		'get-repository',
		`Get detailed information about a specific Bitbucket repository.

PURPOSE: Retrieves comprehensive repository metadata including branches, settings, permissions, and more.

WHEN TO USE:
- When you need detailed information about a specific repository
- When you need repository URLs, clone links, or other reference information
- When you need to check repository settings or permissions
- After using list-repositories to identify the relevant repository
- Before performing operations that require repository context (PRs, branches)

WHEN NOT TO USE:
- When you don't know which repository to look for (use list-repositories first)
- When you just need basic repository information
- When you're looking for pull request details (use list-pullrequests instead)
- When you need content from multiple repositories (use list-repositories instead)

RETURNS: Detailed repository information including slug, name, description, URLs, branch information, and settings.

EXAMPLES:
- Get repository: {workspaceSlug: "myteam", repoSlug: "project-api"}

ERRORS:
- Repository not found: Verify workspace and repository slugs
- Permission errors: Ensure you have access to the requested repository
- Rate limiting: Cache repository information when possible`,
		GetRepositoryToolArgs.shape,
		getRepository,
	);

	logger.debug(
		`${logPrefix} Successfully registered Atlassian Repositories tools`,
	);
}

export default { register };
