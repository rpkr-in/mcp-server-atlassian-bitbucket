import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logger } from '../utils/logger.util.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import {
	ListPullRequestsToolArgs,
	ListPullRequestsToolArgsType,
	GetPullRequestToolArgs,
	GetPullRequestToolArgsType,
} from './atlassian.pullrequests.type.js';

import atlassianPullRequestsController from '../controllers/atlassian.pullrequests.controller.js';

/**
 * MCP Tool: List Bitbucket Pull Requests
 *
 * Lists pull requests for a specific repository with optional filtering and pagination.
 * Returns a formatted markdown response with pull request details and pagination info.
 *
 * @param {ListPullRequestsToolArgsType} args - Tool arguments for filtering pull requests
 * @param {RequestHandlerExtra} _extra - Extra request handler information (unused)
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with formatted pull requests list
 * @throws Will return error message if pull request listing fails
 */
async function listPullRequests(
	args: ListPullRequestsToolArgsType,
	_extra: RequestHandlerExtra,
) {
	const logPrefix =
		'[src/tools/atlassian.pullrequests.tool.ts@listPullRequests]';
	logger.debug(
		`${logPrefix} Listing Bitbucket pull requests with filters:`,
		args,
	);

	try {
		// Pass the filter options to the controller
		const response = await atlassianPullRequestsController.list({
			workspace: args.workspace,
			repo_slug: args.repo_slug,
			state: args.state,
			pagelen: args.limit,
			page: args.cursor ? parseInt(args.cursor, 10) : undefined,
		});

		logger.debug(`${logPrefix} Successfully retrieved pull requests list`);

		return {
			content: [
				{
					type: 'text' as const,
					text: response.content,
				},
			],
		};
	} catch (error) {
		logger.error(`${logPrefix} Failed to list pull requests`, error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * MCP Tool: Get Bitbucket Pull Request Details
 *
 * Retrieves detailed information about a specific Bitbucket pull request.
 * Returns a formatted markdown response with pull request metadata and properties.
 *
 * @param {GetPullRequestToolArgsType} args - Tool arguments containing the pull request identifiers
 * @param {RequestHandlerExtra} _extra - Extra request handler information (unused)
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with formatted pull request details
 * @throws Will return error message if pull request retrieval fails
 */
async function getPullRequest(
	args: GetPullRequestToolArgsType,
	_extra: RequestHandlerExtra,
) {
	const logPrefix =
		'[src/tools/atlassian.pullrequests.tool.ts@getPullRequest]';
	logger.debug(
		`${logPrefix} Retrieving pull request details for ${args.workspace}/${args.repo_slug}/${args.pull_request_id}`,
	);

	try {
		const response = await atlassianPullRequestsController.get(
			args.workspace,
			args.repo_slug,
			args.pull_request_id,
		);
		logger.debug(
			`${logPrefix} Successfully retrieved pull request details`,
		);

		return {
			content: [
				{
					type: 'text' as const,
					text: response.content,
				},
			],
		};
	} catch (error) {
		logger.error(`${logPrefix} Failed to get pull request details`, error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Register Atlassian Pull Requests MCP Tools
 *
 * Registers the list-pull-requests and get-pull-request tools with the MCP server.
 * Each tool is registered with its schema, description, and handler function.
 *
 * @param {McpServer} server - The MCP server instance to register tools with
 */
function register(server: McpServer) {
	const logPrefix = '[src/tools/atlassian.pullrequests.tool.ts@register]';
	logger.debug(`${logPrefix} Registering Atlassian Pull Requests tools...`);

	// Register the list pull requests tool
	server.tool(
		'list-pull-requests',
		'List Bitbucket pull requests for a specific repository with optional filtering. Returns pull requests with their titles, authors, branches, and other metadata. Use this tool to discover open, merged, or declined pull requests.',
		ListPullRequestsToolArgs.shape,
		listPullRequests,
	);

	// Register the get pull request details tool
	server.tool(
		'get-pull-request',
		'Get detailed information about a specific Bitbucket pull request by ID. Returns comprehensive metadata including description, reviewers, and branch information. Use this tool when you need in-depth information about a pull request.',
		GetPullRequestToolArgs.shape,
		getPullRequest,
	);

	logger.debug(
		`${logPrefix} Successfully registered Atlassian Pull Requests tools`,
	);
}

export default { register };
