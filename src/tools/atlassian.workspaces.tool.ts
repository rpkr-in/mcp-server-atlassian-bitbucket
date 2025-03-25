import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logger } from '../utils/logger.util.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import {
	ListWorkspacesToolArgs,
	ListWorkspacesToolArgsType,
	GetWorkspaceToolArgs,
	GetWorkspaceToolArgsType,
} from './atlassian.workspaces.type.js';

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
			q: args.q,
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
		`${logPrefix} Retrieving workspace details for ${args.workspace}`,
		args,
	);

	try {
		const message = await atlassianWorkspacesController.get({
			workspace: args.workspace,
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
		`List Bitbucket workspaces available to your account.

PURPOSE: Discovers workspaces you have access to with their slugs, names, and permission levels to help navigate Bitbucket's organization structure.

WHEN TO USE:
- When you need to discover what workspaces exist in your Bitbucket account
- When you want to find the slugs needed for other Bitbucket operations
- When you need to check what workspaces you have access to and their permission levels
- Before accessing repositories or pull requests that require workspace information
- When you're unfamiliar with the workspace organization structure

WHEN NOT TO USE:
- When you already know the workspace slug (use get-workspace or list-repositories instead)
- When you need detailed workspace information (use get-workspace instead)
- When you need to find specific repositories (use list-repositories after identifying the workspace)

RETURNS: Formatted list of workspaces with slugs, names, and permission information, plus pagination details if available.

EXAMPLES:
- List all workspaces: {}
- With sorting: {sort: "name"}
- With pagination: {limit: 10, cursor: "next-page-token"}

ERRORS:
- Authentication failures: Check your Bitbucket credentials
- No workspaces found: You might not have access to any workspaces
- Rate limiting: Use pagination and reduce query frequency`,
		ListWorkspacesToolArgs.shape,
		listWorkspaces,
	);

	// Register the get workspace details tool
	server.tool(
		'get-workspace',
		`Get detailed information about a specific Bitbucket workspace by slug.

PURPOSE: Retrieves comprehensive workspace metadata including projects, permissions, and configuration.

WHEN TO USE:
- When you need detailed information about a specific workspace
- When you need to check workspace permissions or membership
- When you need to verify workspace settings or configuration
- After using list-workspaces to identify the relevant workspace
- Before performing operations that require detailed workspace context

WHEN NOT TO USE:
- When you don't know which workspace to look for (use list-workspaces first)
- When you just need basic workspace information (slug, name)
- When you're only interested in repositories (use list-repositories directly)

RETURNS: Detailed workspace information including slug, name, type, description, projects, and permission levels.

EXAMPLES:
- Get workspace: {workspace: "myteam"}

ERRORS:
- Workspace not found: Verify the workspace slug is correct
- Permission errors: Ensure you have access to the requested workspace
- Rate limiting: Cache workspace information when possible`,
		GetWorkspaceToolArgs.shape,
		getWorkspace,
	);

	logger.debug(
		`${logPrefix} Successfully registered Atlassian Workspaces tools`,
	);
}

export default { register };
