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
 * Lists Bitbucket pull requests for a repository with optional filtering by state.
 * Returns a formatted markdown response with pull request details.
 *
 * @param args - Tool arguments for filtering pull requests
 * @param _extra - Extra request handler information (unused)
 * @returns MCP response with formatted pull requests list
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
		const message = await atlassianPullRequestsController.list({
			workspace: args.workspace,
			repoSlug: args.repoSlug,
			state: args.state,
			limit: args.limit,
			cursor: args.cursor,
		});

		logger.debug(
			`${logPrefix} Successfully retrieved pull requests from controller`,
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
		logger.error(`${logPrefix} Failed to list pull requests`, error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * MCP Tool: Get Bitbucket Pull Request Details
 *
 * Retrieves detailed information about a specific Bitbucket pull request.
 * Returns a formatted markdown response with pull request metadata.
 *
 * @param args - Tool arguments containing the workspace, repository slug, and pull request ID
 * @param _extra - Extra request handler information (unused)
 * @returns MCP response with formatted pull request details
 * @throws Will return error message if pull request retrieval fails
 */
async function getPullRequest(
	args: GetPullRequestToolArgsType,
	_extra: RequestHandlerExtra,
) {
	const logPrefix =
		'[src/tools/atlassian.pullrequests.tool.ts@getPullRequest]';
	logger.debug(
		`${logPrefix} Retrieving pull request details for ${args.workspace}/${args.repoSlug}/${args.pullRequestId}`,
		args,
	);

	try {
		const message = await atlassianPullRequestsController.get(
			{
				workspace: args.workspace,
				repoSlug: args.repoSlug,
				pullRequestId: String(args.pullRequestId),
			},
			{
				includeComments: args.includeComments,
			},
		);

		logger.debug(
			`${logPrefix} Successfully retrieved pull request details from controller`,
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
		logger.error(`${logPrefix} Failed to get pull request details`, error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Register Atlassian Pull Requests MCP Tools
 *
 * Registers the list-pullrequests and get-pullrequest tools with the MCP server.
 * Each tool is registered with its schema, description, and handler function.
 *
 * @param server - The MCP server instance to register tools with
 */
function register(server: McpServer) {
	const logPrefix = '[src/tools/atlassian.pullrequests.tool.ts@register]';
	logger.debug(`${logPrefix} Registering Atlassian Pull Requests tools...`);

	// Register the list pull requests tool
	server.tool(
		'list-pullrequests',
		'List Bitbucket pull requests for a repository with optional filtering by state. Returns pull requests with their IDs, titles, states, authors, and URLs. Use this tool to discover available pull requests before accessing specific content.',
		ListPullRequestsToolArgs.shape,
		listPullRequests,
	);

	// Register the get pull request details tool
	server.tool(
		'get-pullrequest',
		'Get detailed information about a specific Bitbucket pull request by workspace, repository slug, and pull request ID. Returns comprehensive metadata including description, comments, and source/destination branches. Use this tool when you need in-depth information about a particular pull request.',
		GetPullRequestToolArgs.shape,
		getPullRequest,
	);

	logger.debug(
		`${logPrefix} Successfully registered Atlassian Pull Requests tools`,
	);
}

export default { register };
