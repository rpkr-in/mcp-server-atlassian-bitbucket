import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import {
	ListWorkspacesToolArgs,
	ListWorkspacesToolArgsType,
	GetWorkspaceToolArgsType,
	GetWorkspaceToolArgs,
} from './atlassian.workspaces.types.js';

import atlassianWorkspacesController from '../controllers/atlassian.workspaces.controller.js';

// Create a contextualized logger for this file
const toolLogger = Logger.forContext('tools/atlassian.workspaces.tool.ts');

// Log tool initialization
toolLogger.debug('Bitbucket workspaces tool initialized');

/**
 * MCP Tool: List Bitbucket Workspaces
 *
 * Lists Bitbucket workspaces available to the authenticated user with optional filtering.
 * Returns a formatted markdown response with workspace details.
 *
 * @param args - Tool arguments for filtering workspaces
 * @returns MCP response with formatted workspaces list
 * @throws Will return error message if workspace listing fails
 */
async function listWorkspaces(args: ListWorkspacesToolArgsType) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.workspaces.tool.ts',
		'listWorkspaces',
	);
	methodLogger.debug('Listing Bitbucket workspaces with filters:', args);

	try {
		// Pass the filter options to the controller
		const message = await atlassianWorkspacesController.list({
			limit: args.limit,
			cursor: args.cursor,
		});

		methodLogger.debug(
			'Successfully retrieved workspaces from controller',
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
		methodLogger.error('Failed to list workspaces', error);
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
 * @returns MCP response with formatted workspace details
 * @throws Will return error message if workspace retrieval fails
 */
async function getWorkspace(args: GetWorkspaceToolArgsType) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.workspaces.tool.ts',
		'getWorkspace',
	);

	methodLogger.debug(
		`Retrieving workspace details for ${args.workspaceSlug}`,
		args,
	);

	try {
		const message = await atlassianWorkspacesController.get({
			workspaceSlug: args.workspaceSlug,
		});
		methodLogger.debug(
			'Successfully retrieved workspace details from controller',
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
		methodLogger.error('Failed to get workspace details', error);
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
function registerTools(server: McpServer) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.workspaces.tool.ts',
		'registerTools',
	);
	methodLogger.debug('Registering Atlassian Workspaces tools...');

	// Register the list workspaces tool
	server.tool(
		'bitbucket_list_workspaces',
		`Lists Bitbucket workspaces accessible to the user, with pagination support (\`limit\`, \`cursor\`).\n- Use this to discover available workspaces and find their \`workspaceSlug\` needed for other repository-related tools.\nReturns a formatted list of workspace memberships including name, slug, UUID, permission level, and dates.`,
		ListWorkspacesToolArgs.shape,
		listWorkspaces,
	);

	// Register the get workspace details tool
	server.tool(
		'bitbucket_get_workspace',
		`Retrieves detailed information about a specific Bitbucket workspace using its slug (\`workspaceSlug\`).\n- Includes UUID, name, type, creation date, and links to related resources (repositories, projects). \nUse this after finding a \`workspaceSlug\` to get its full details.\nReturns detailed workspace information formatted as Markdown.`,
		GetWorkspaceToolArgs.shape,
		getWorkspace,
	);

	methodLogger.debug('Successfully registered Atlassian Workspaces tools');
}

export default { registerTools };
