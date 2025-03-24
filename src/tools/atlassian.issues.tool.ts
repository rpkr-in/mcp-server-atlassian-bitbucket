import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logger } from '../utils/logger.util.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import {
	ListIssuesToolArgs,
	ListIssuesToolArgsType,
	GetIssueToolArgs,
	GetIssueToolArgsType,
} from './atlassian.issues.type.js';

import atlassianIssuesController from '../controllers/atlassian.issues.controller.js';

/**
 * MCP Tool: List Jira Issues
 *
 * Lists Jira issues with optional filtering by JQL query, fields, and limit.
 * Returns a formatted markdown response with issue details and pagination info.
 *
 * @param {ListIssuesToolArgsType} args - Tool arguments for filtering issues
 * @param {RequestHandlerExtra} _extra - Extra request handler information (unused)
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with formatted issues list
 * @throws Will return error message if issue listing fails
 */
async function listIssues(
	args: ListIssuesToolArgsType,
	_extra: RequestHandlerExtra,
) {
	const logPrefix = '[src/tools/atlassian.issues.tool.ts@listIssues]';
	logger.debug(`${logPrefix} Listing Jira issues with filters:`, args);

	try {
		// Pass the filter options to the controller
		const message = await atlassianIssuesController.list({
			jql: args.jql,
			limit: args.limit,
			cursor: args.cursor,
		});

		logger.debug(
			`${logPrefix} Successfully retrieved issues from controller`,
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
		logger.error(`${logPrefix} Failed to list issues`, error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * MCP Tool: Get Jira Issue Details
 *
 * Retrieves detailed information about a specific Jira issue.
 * Returns a formatted markdown response with issue metadata, comments, attachments, and worklog.
 *
 * @param {GetIssueToolArgsType} args - Tool arguments containing the issue ID or key and optional fields
 * @param {RequestHandlerExtra} _extra - Extra request handler information (unused)
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with formatted issue details
 * @throws Will return error message if issue retrieval fails
 */
async function getIssue(
	args: GetIssueToolArgsType,
	_extra: RequestHandlerExtra,
) {
	const logPrefix = '[src/tools/atlassian.issues.tool.ts@getIssue]';
	logger.debug(
		`${logPrefix} Retrieving issue details for ID/key: ${args.idOrKey}`,
	);

	try {
		const message = await atlassianIssuesController.get(args.idOrKey);
		logger.debug(
			`${logPrefix} Successfully retrieved issue details from controller`,
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
		logger.error(`${logPrefix} Failed to get issue details`, error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Register Atlassian Issues MCP Tools
 *
 * Registers the list-issues and get-issue tools with the MCP server.
 * Each tool is registered with its schema, description, and handler function.
 *
 * @param {McpServer} server - The MCP server instance to register tools with
 */
function register(server: McpServer) {
	const logPrefix = '[src/tools/atlassian.issues.tool.ts@register]';
	logger.debug(`${logPrefix} Registering Atlassian Issues tools...`);

	// Register the list issues tool
	server.tool(
		'list-issues',
		'List Jira issues with optional filtering. Returns issues with their IDs, keys, types, statuses, and URLs. Use this tool to discover available Jira issues before accessing specific content. You can filter using JQL queries and limit the number of results.',
		ListIssuesToolArgs.shape,
		listIssues,
	);

	// Register the get issue details tool
	server.tool(
		'get-issue',
		'Get detailed information about a specific Jira issue by ID or key. Returns comprehensive metadata including description, comments, attachments, and worklog. Use this tool when you need in-depth information about a particular issue, such as its status, assignee, or comments.',
		GetIssueToolArgs.shape,
		getIssue,
	);

	logger.debug(`${logPrefix} Successfully registered Atlassian Issues tools`);
}

export default { register };
