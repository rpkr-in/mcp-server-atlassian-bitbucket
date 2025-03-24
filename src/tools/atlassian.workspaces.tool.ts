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
 * Lists Bitbucket workspaces with optional pagination.
 * Returns a formatted markdown response with workspace details and pagination info.
 *
 * @param {ListWorkspacesToolArgsType} args - Tool arguments for filtering workspaces
 * @param {RequestHandlerExtra} _extra - Extra request handler information (unused)
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with formatted workspaces list
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
		const response = await atlassianWorkspacesController.list({
			pagelen: args.limit,
			page: args.cursor ? parseInt(args.cursor, 10) : undefined,
		});

		logger.debug(`${logPrefix} Successfully retrieved workspaces list`);

		return {
			content: [
				{
					type: 'text' as const,
					text: response.content,
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
 * Returns a formatted markdown response with workspace metadata and properties.
 *
 * @param {GetWorkspaceToolArgsType} args - Tool arguments containing the workspace slug
 * @param {RequestHandlerExtra} _extra - Extra request handler information (unused)
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with formatted workspace details
 * @throws Will return error message if workspace retrieval fails
 */
async function getWorkspace(
	args: GetWorkspaceToolArgsType,
	_extra: RequestHandlerExtra,
) {
	const logPrefix = '[src/tools/atlassian.workspaces.tool.ts@getWorkspace]';
	logger.debug(
		`${logPrefix} Retrieving workspace details for slug: ${args.slug}`,
	);

	try {
		const response = await atlassianWorkspacesController.get(args.slug);
		logger.debug(`${logPrefix} Successfully retrieved workspace details`);

		return {
			content: [
				{
					type: 'text' as const,
					text: response.content,
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
 * @param {McpServer} server - The MCP server instance to register tools with
 */
function register(server: McpServer) {
	const logPrefix = '[src/tools/atlassian.workspaces.tool.ts@register]';
	logger.debug(`${logPrefix} Registering Atlassian Workspaces tools...`);

	// Register the list workspaces tool
	server.tool(
		'list-workspaces',
		'List Bitbucket workspaces with optional pagination. Returns workspaces with their names, slugs, and other metadata. Use this tool to discover available workspaces.',
		ListWorkspacesToolArgs.shape,
		listWorkspaces,
	);

	// Register the get workspace details tool
	server.tool(
		'get-workspace',
		'Get detailed information about a specific Bitbucket workspace by slug. Returns comprehensive metadata including creation date, privacy settings, and URLs. Use this tool when you need in-depth information about a workspace.',
		GetWorkspaceToolArgs.shape,
		getWorkspace,
	);

	logger.debug(
		`${logPrefix} Successfully registered Atlassian Workspaces tools`,
	);
}

export default { register };
