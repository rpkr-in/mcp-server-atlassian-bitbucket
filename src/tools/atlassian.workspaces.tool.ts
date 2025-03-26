import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logger } from '../utils/logger.util.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import {
	ListWorkspacesToolArgs,
	ListWorkspacesToolArgsType,
	GetWorkspaceToolArgsType,
	GetWorkspaceToolArgs,
} from './atlassian.workspaces.types.js';

import atlassianWorkspacesController from '../controllers/atlassian.workspaces.controller.js';

/**
 * MCP Tool: List Bitbucket Workspaces
 *
 * Lists Bitbucket workspaces available to the authenticated user with optional filtering.
 * Returns a formatted markdown response with workspace details.
 *
 * @param args - Tool arguments for filtering workspaces
 * @param _extra - Extra request handler information (unused)
 * @returns MCP response with formatted workspaces list
 * @throws Will return error message if workspace listing fails
 */
async function listWorkspaces(
	args: ListWorkspacesToolArgsType,
	_extra: RequestHandlerExtra,
) {
	const logPrefix = '[src/tools/atlassian.workspaces.tool.ts@listWorkspaces]';
	logger.debug(
		`${logPrefix} Listing Bitbucket workspaces with filters:`,
		args,
	);

	try {
		// Pass the filter options to the controller
		const message = await atlassianWorkspacesController.list({
			query: args.query,
			sort: args.sort,
			limit: args.limit,
			cursor: args.cursor,
		});

		logger.debug(
			`${logPrefix} Successfully retrieved workspaces from controller`,
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
		logger.error(`${logPrefix} Failed to list workspaces`, error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * MCP Tool: Get Bitbucket Workspace Details
 *
 * Retrieves detailed information about a specific Bitbucket workspace.
 * Returns a formatted markdown response with workspace metadata.
 *
 * @param args - Tool arguments containing the workspace slug
 * @param _extra - Extra request handler information (unused)
 * @returns MCP response with formatted workspace details
 * @throws Will return error message if workspace retrieval fails
 */
async function getWorkspace(
	args: GetWorkspaceToolArgsType,
	_extra: RequestHandlerExtra,
) {
	const logPrefix = '[src/tools/atlassian.workspaces.tool.ts@getWorkspace]';

	logger.debug(
		`${logPrefix} Retrieving workspace details for ${args.workspaceSlug}`,
		args,
	);

	try {
		const message = await atlassianWorkspacesController.get({
			workspaceSlug: args.workspaceSlug,
		});
		logger.debug(
			`${logPrefix} Successfully retrieved workspace details from controller`,
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
		logger.error(`${logPrefix} Failed to get workspace details`, error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Register Atlassian Workspaces MCP Tools
 *
 * Registers the list-workspaces and get-workspace tools with the MCP server.
 * Each tool is registered with its schema, description, and handler function.
 *
 * @param server - The MCP server instance to register tools with
 */
function register(server: McpServer) {
	const logPrefix = '[src/tools/atlassian.workspaces.tool.ts@register]';
	logger.debug(`${logPrefix} Registering Atlassian Workspaces tools...`);

	// Register the list workspaces tool
	server.tool(
		'list-workspaces',
		`List Bitbucket workspaces accessible to the authenticated user, with optional filtering and pagination.

        PURPOSE: Discover available workspaces and retrieve their slugs, names, and basic metadata. Essential for finding the correct 'workspaceSlug' needed as input for repository-related tools (list-repositories, get-repository, list-pull-requests, get-pull-request).

        WHEN TO USE:
        - To find the 'workspaceSlug' for a known workspace name.
        - To explore all workspaces you have access to.
        - To get a high-level overview before diving into specific repositories.
        - When you don't know the exact slug required by other tools.

        WHEN NOT TO USE:
        - When you already have the 'workspaceSlug'.
        - When you need detailed information about a *single* workspace (use 'get-workspace').
        - When you need repository or pull request information (use repository/pull-request tools with a known 'workspaceSlug').

        RETURNS: Formatted list of workspace memberships, including workspace name, slug, UUID, your permission level, and access dates. Includes pagination details if applicable.

        EXAMPLES:
        - List all accessible workspaces: {}
        - Filter by name fragment: { query: "devteam" }
        - Sort by last accessed (descending): { sort: "-last_accessed" }
        - Paginate results: { limit: 10, cursor: "some-cursor-value" }

        ERRORS:
        - Authentication failures: Check Bitbucket credentials.
        - No workspaces found: You may not have access to any workspaces, or filters are too restrictive.`,
		ListWorkspacesToolArgs.shape,
		listWorkspaces,
	);

	// Register the get workspace details tool
	server.tool(
		'get-workspace',
		`Get detailed information about a specific Bitbucket workspace using its slug.

        PURPOSE: Retrieves comprehensive metadata for a *known* workspace, including UUID, name, type, creation date, and links to related resources like repositories and projects.

        WHEN TO USE:
        - When you need full details about a *specific* workspace and you already know its 'workspaceSlug'.
        - After using 'list-workspaces' to identify the target workspace slug.
        - To get quick links to a workspace's repositories, projects, or members page.

        WHEN NOT TO USE:
        - When you don't know the workspace slug (use 'list-workspaces' first).
        - When you only need a list of workspaces (use 'list-workspaces').
        - When you need information about repositories *within* the workspace (use repository tools).

        RETURNS: Detailed workspace information including slug, name, UUID, type, creation date, and links. Fetches all available details by default.

        EXAMPLES:
        - Get details for a workspace: { workspaceSlug: "my-dev-team" }

        ERRORS:
        - Workspace not found: Verify the 'workspaceSlug' is correct and exists.
        - Permission errors: Ensure you have access to view the specified workspace.`,
		GetWorkspaceToolArgs.shape,
		getWorkspace,
	);

	logger.debug(
		`${logPrefix} Successfully registered Atlassian Workspaces tools`,
	);
}

export default { register };
