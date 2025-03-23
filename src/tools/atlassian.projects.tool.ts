import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logger } from '../utils/logger.util.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import {
	ListProjectsToolArgs,
	ListProjectsToolArgsType,
	GetProjectToolArgs,
	GetProjectToolArgsType,
} from './atlassian.projects.type.js';

import atlassianProjectsController from '../controllers/atlassian.projects.controller.js';

/**
 * MCP Tool: List Jira Projects
 *
 * Lists Jira projects with optional filtering by query and limit.
 * Returns a formatted markdown response with project details and pagination info.
 *
 * @param {ListProjectsToolArgsType} args - Tool arguments for filtering projects
 * @param {RequestHandlerExtra} _extra - Extra request handler information (unused)
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with formatted projects list
 * @throws Will return error message if project listing fails
 */
async function listProjects(
	args: ListProjectsToolArgsType,
	_extra: RequestHandlerExtra,
) {
	const logPrefix = '[src/tools/atlassian.projects.tool.ts@listProjects]';
	logger.debug(`${logPrefix} Listing Jira projects with filters:`, args);

	try {
		// Pass the filter options to the controller
		const message = await atlassianProjectsController.list({
			query: args.query,
			limit: args.limit,
			cursor: args.cursor,
		});

		logger.debug(
			`${logPrefix} Successfully retrieved projects from controller`,
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
		logger.error(`${logPrefix} Failed to list projects`, error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * MCP Tool: Get Jira Project Details
 *
 * Retrieves detailed information about a specific Jira project.
 * Returns a formatted markdown response with project metadata, components, and versions.
 *
 * @param {GetProjectToolArgsType} args - Tool arguments containing the project ID or key
 * @param {RequestHandlerExtra} _extra - Extra request handler information (unused)
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with formatted project details
 * @throws Will return error message if project retrieval fails
 */
async function getProject(
	args: GetProjectToolArgsType,
	_extra: RequestHandlerExtra,
) {
	const logPrefix = '[src/tools/atlassian.projects.tool.ts@getProject]';
	logger.debug(
		`${logPrefix} Retrieving project details for ID/key: ${args.idOrKey}`,
	);

	try {
		const message = await atlassianProjectsController.get(args.idOrKey);
		logger.debug(
			`${logPrefix} Successfully retrieved project details from controller`,
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
		logger.error(`${logPrefix} Failed to get project details`, error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Register Atlassian Projects MCP Tools
 *
 * Registers the list-projects and get-project tools with the MCP server.
 * Each tool is registered with its schema, description, and handler function.
 *
 * @param {McpServer} server - The MCP server instance to register tools with
 */
function register(server: McpServer) {
	const logPrefix = '[src/tools/atlassian.projects.tool.ts@register]';
	logger.debug(`${logPrefix} Registering Atlassian Projects tools...`);

	// Register the list projects tool
	server.tool(
		'list-projects',
		'List Jira projects with optional filtering. Returns projects with their IDs, keys, styles, and URLs. Use this tool to discover available Jira projects before accessing specific content. You can filter by name or key and limit the number of results.',
		ListProjectsToolArgs.shape,
		listProjects,
	);

	// Register the get project details tool
	server.tool(
		'get-project',
		'Get detailed information about a specific Jira project by ID or key. Returns comprehensive metadata including components, versions, and access links. Use this tool when you need in-depth information about a particular project, such as its components, versions, or associated metadata.',
		GetProjectToolArgs.shape,
		getProject,
	);

	logger.debug(
		`${logPrefix} Successfully registered Atlassian Projects tools`,
	);
}

export default { register };
