import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logger } from '../utils/logger.util.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import {
	ListPullRequestsToolArgs,
	ListPullRequestsToolArgsType,
	GetPullRequestToolArgsType,
	GetPullRequestToolArgs,
} from './atlassian.pullrequests.types.js';

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
			parentId: args.parentId,
			entityId: args.entityId,
			state: args.state,
			filter: args.filter,
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
		`${logPrefix} Retrieving pull request details for ${args.parentId}/${args.entityId}/${args.prId}`,
		args,
	);

	try {
		const message = await atlassianPullRequestsController.get(
			{
				parentId: args.parentId,
				entityId: args.entityId,
				prId: String(args.prId),
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
		'list-pull-requests',
		`List Bitbucket pull requests with optional filtering capabilities.

PURPOSE: Allows you to find and browse pull requests across repositories with filtering options.

WHEN TO USE:
- When you need to find pull requests within a specific repository
- When you want to check PR status (open, merged, declined, etc.)
- When you need to track code review activity and progress
- When you need PR IDs for other Bitbucket operations
- When monitoring contributions from specific authors

WHEN NOT TO USE:
- When you don't know which repository to look in (use list-repositories first)
- When you already know the PR ID (use get-pull-request instead)
- When you need detailed PR content or comments (use get-pull-request instead)
- When you need to browse repositories rather than PRs (use list-repositories)

RETURNS: Formatted list of pull requests with IDs, titles, states, authors, branch information, and URLs, plus pagination info.

EXAMPLES:
- List all PRs in a repo: {parentId: "myteam", entityId: "project-api"}
- Filter by state: {parentId: "myteam", entityId: "project-api", state: "OPEN"}
- With pagination: {parentId: "myteam", entityId: "project-api", limit: 10, cursor: "next-page-token"}

ERRORS:
- Repository not found: Verify workspace and repository slugs
- Authentication failures: Check your Bitbucket credentials
- Permission errors: Ensure you have access to the requested repository
- Rate limiting: Use pagination and reduce query frequency`,
		ListPullRequestsToolArgs.shape,
		listPullRequests,
	);

	// Register the get pull request details tool
	server.tool(
		'get-pull-request',
		`Get detailed information about a specific Bitbucket pull request.

PURPOSE: Retrieves comprehensive PR data including description, comments, diff stats, reviewers, and branch information.

WHEN TO USE:
- When you need the full description and context of a specific PR
- When you need to see comments, reviews, or approvals
- When you need details about the source and destination branches
- When you need diff statistics or changed files information
- After using list-pull-requests to identify the relevant PR ID

WHEN NOT TO USE:
- When you don't know which PR to look for (use list-pull-requests first)
- When you need to browse multiple PRs (use list-pull-requests instead)
- When you only need basic PR information without comments or details
- When you need repository information rather than PR details (use get-repository)

RETURNS: Detailed PR information including title, description, status, author, reviewers, branches, comments, and related timestamps.

EXAMPLES:
- Get PR details: {parentId: "myteam", entityId: "project-api", prId: 42}

ERRORS:
- PR not found: Verify workspace, repository slugs, and PR ID
- Permission errors: Ensure you have access to the requested PR
- Rate limiting: Cache PR information when possible for frequently referenced PRs`,
		GetPullRequestToolArgs.shape,
		getPullRequest,
	);

	logger.debug(
		`${logPrefix} Successfully registered Atlassian Pull Requests tools`,
	);
}

export default { register };
