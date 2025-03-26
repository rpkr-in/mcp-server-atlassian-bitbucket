import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logger } from '../utils/logger.util.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import {
	ListPullRequestsToolArgs,
	ListPullRequestsToolArgsType,
	GetPullRequestToolArgs,
	GetPullRequestToolArgsType,
} from './atlassian.pullrequests.types.js';

import atlassianPullRequestsController from '../controllers/atlassian.pullrequests.controller.js';

/**
 * MCP Tool: List Bitbucket Pull Requests
 *
 * Lists pull requests for a specific repository with optional filtering.
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
			workspaceSlug: args.workspaceSlug,
			repoSlug: args.repoSlug,
			state: args.state,
			query: args.query,
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
 * @param args - Tool arguments containing workspace, repository, and PR identifiers
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
		`${logPrefix} Retrieving pull request details for ${args.workspaceSlug}/${args.repoSlug}/${args.prId}`,
		args,
	);

	try {
		const message = await atlassianPullRequestsController.get({
			workspaceSlug: args.workspaceSlug,
			repoSlug: args.repoSlug,
			prId: args.prId,
		});

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
 * Registers the list-pull-requests and get-pull-request tools with the MCP server.
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
		`List pull requests for a Bitbucket repository with optional filtering.

PURPOSE: Helps you discover and monitor pull requests within a repository, showing their status, authors, and other metadata.

WHEN TO USE:
- When you need to find all open, merged, or declined pull requests
- When you need to see recent PR activity in a repository
- When you need to check the status of specific PRs
- When you need pull request IDs for use with other Bitbucket tools

WHEN NOT TO USE:
- When you need detailed information about a single PR (use get-pull-request instead)
- When you need repository information (use get-repository instead)
- When you need to search across multiple repositories (use multiple calls)

RETURNS: Formatted list of pull requests with titles, IDs, status, authors, and URLs.

EXAMPLES:
- List open PRs: {workspaceSlug: "myteam", repoSlug: "project-api"}
- Filter by state: {workspaceSlug: "myteam", repoSlug: "project-api", state: "MERGED"}
- With pagination: {workspaceSlug: "myteam", repoSlug: "project-api", limit: 5, cursor: "next-page-token"}
- Text search: {workspaceSlug: "myteam", repoSlug: "project-api", query: "bugfix"}

ERRORS:
- Repository not found: Verify workspace and repository slugs
- Permission errors: Ensure you have access to the requested repository`,
		ListPullRequestsToolArgs.shape,
		listPullRequests,
	);

	// Register the get pull request details tool
	server.tool(
		'get-pull-request',
		`Get detailed information about a specific Bitbucket pull request.

PURPOSE: Retrieves comprehensive details about a pull request including changes, reviews, comments, and status.

WHEN TO USE:
- When you need detailed information about a specific pull request
- When you need to check PR status, reviewers, or comments
- When you need PR content details (diff, commits)
- After using list-pull-requests to identify the relevant PR

WHEN NOT TO USE:
- When you don't know which PR to look for (use list-pull-requests first)
- When you just need basic PR information (ID, title, status)
- When you need repository information (use get-repository instead)
- When you need information from multiple PRs (use list-pull-requests instead)

RETURNS: Detailed pull request information including title, description, status, reviewers, comments, and links. All details are included by default for a comprehensive view.

EXAMPLES:
- Get PR: {workspaceSlug: "myteam", repoSlug: "project-api", prId: "42"}

ERRORS:
- PR not found: Verify workspace slug, repository slug, and PR ID
- Permission errors: Ensure you have access to the requested PR
- Rate limiting: Cache PR information when possible`,
		GetPullRequestToolArgs.shape,
		getPullRequest,
	);

	logger.debug(
		`${logPrefix} Successfully registered Atlassian Pull Requests tools`,
	);
}

export default { register };
