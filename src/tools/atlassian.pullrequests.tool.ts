import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import {
	ListPullRequestsToolArgs,
	ListPullRequestsToolArgsType,
	GetPullRequestToolArgs,
	GetPullRequestToolArgsType,
	ListPullRequestCommentsToolArgs,
	ListPullRequestCommentsToolArgsType,
	CreatePullRequestCommentToolArgs,
	CreatePullRequestCommentToolArgsType,
	CreatePullRequestToolArgs,
	CreatePullRequestToolArgsType,
} from './atlassian.pullrequests.types.js';

import atlassianPullRequestsController from '../controllers/atlassian.pullrequests.controller.js';

// Create a contextualized logger for this file
const toolLogger = Logger.forContext('tools/atlassian.pullrequests.tool.ts');

// Log tool initialization
toolLogger.debug('Bitbucket pull requests tool initialized');

/**
 * MCP Tool: List Bitbucket Pull Requests
 *
 * Lists pull requests for a specific repository with optional filtering.
 * Returns a formatted markdown response with pull request details.
 *
 * @param args - Tool arguments for filtering pull requests
 * @returns MCP response with formatted pull requests list
 * @throws Will return error message if pull request listing fails
 */
async function listPullRequests(args: ListPullRequestsToolArgsType) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.pullrequests.tool.ts',
		'listPullRequests',
	);
	methodLogger.debug('Listing Bitbucket pull requests with filters:', args);

	try {
		// Pass the filter options to the controller
		const result = await atlassianPullRequestsController.list({
			workspaceSlug: args.workspaceSlug,
			repoSlug: args.repoSlug,
			state: args.state,
			query: args.query,
			limit: args.limit,
			cursor: args.cursor,
		});

		methodLogger.debug(
			'Successfully retrieved pull requests from controller',
			{
				count: result.pagination?.count,
				hasMore: result.pagination?.hasMore,
			},
		);

		return {
			content: [
				{
					type: 'text' as const,
					text: result.content, // Contains timestamp footer
				},
			],
			metadata: {
				pagination: result.pagination, // Pass pagination object
			},
		};
	} catch (error) {
		methodLogger.error('Failed to list pull requests', error);
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
 * @returns MCP response with formatted pull request details
 * @throws Will return error message if pull request retrieval fails
 */
async function getPullRequest(args: GetPullRequestToolArgsType) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.pullrequests.tool.ts',
		'getPullRequest',
	);

	methodLogger.debug(
		`Retrieving pull request details for ${args.workspaceSlug}/${args.repoSlug}/${args.prId}`,
		args,
	);

	try {
		const result = await atlassianPullRequestsController.get({
			workspaceSlug: args.workspaceSlug,
			repoSlug: args.repoSlug,
			prId: args.prId,
			includeFullDiff: args.includeFullDiff,
		});

		methodLogger.debug(
			'Successfully retrieved pull request details from controller',
		);

		return {
			content: [
				{
					type: 'text' as const,
					text: result.content, // Contains timestamp footer
				},
			],
			// No pagination metadata needed for 'get'
		};
	} catch (error) {
		methodLogger.error('Failed to get pull request details', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * MCP Tool: List Bitbucket Pull Request Comments
 *
 * Lists comments for a specific pull request, including general comments and inline code comments.
 * Returns a formatted markdown response with comment details.
 *
 * @param args - Tool arguments containing workspace, repository, and PR identifiers
 * @returns MCP response with formatted pull request comments
 * @throws Will return error message if comment retrieval fails
 */
async function listPullRequestComments(
	args: ListPullRequestCommentsToolArgsType,
) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.pullrequests.tool.ts',
		'listPullRequestComments',
	);

	methodLogger.debug(
		`Retrieving comments for pull request ${args.workspaceSlug}/${args.repoSlug}/${args.prId}`,
		args,
	);

	try {
		const result = await atlassianPullRequestsController.listComments({
			workspaceSlug: args.workspaceSlug,
			repoSlug: args.repoSlug,
			prId: args.prId,
			limit: args.limit,
			cursor: args.cursor,
		});

		methodLogger.debug(
			'Successfully retrieved pull request comments from controller',
			{
				count: result.pagination?.count,
				hasMore: result.pagination?.hasMore,
			},
		);

		return {
			content: [
				{
					type: 'text' as const,
					text: result.content, // Contains timestamp footer
				},
			],
			metadata: {
				pagination: result.pagination, // Pass pagination object
			},
		};
	} catch (error) {
		methodLogger.error('Failed to get pull request comments', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * MCP Tool: Add a new Comment on Bitbucket Pull Request
 *
 * Adds a new comment to a specific Bitbucket pull request.
 * The comment can be either a general comment or an inline code comment.
 *
 * @param args - Tool arguments containing workspace, repository, PR identifiers, and comment content
 * @returns MCP response confirming the comment was added
 * @throws Will return error message if comment addition fails
 */
async function addPullRequestComment(
	args: CreatePullRequestCommentToolArgsType,
) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.pullrequests.tool.ts',
		'addPullRequestComment',
	);

	methodLogger.debug(
		`Adding comment on pull request ${args.workspaceSlug}/${args.repoSlug}/${args.prId}`,
		args,
	);

	try {
		const result = await atlassianPullRequestsController.createComment({
			workspaceSlug: args.workspaceSlug,
			repoSlug: args.repoSlug,
			prId: args.prId,
			content: args.content,
			inline: args.inline,
		});

		methodLogger.debug('Successfully added pull request comment');

		return {
			content: [
				{
					type: 'text' as const,
					text: result.content, // Simple confirmation message
				},
			],
			// No pagination metadata needed for 'add'
		};
	} catch (error) {
		methodLogger.error('Failed to add pull request comment', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * MCP Tool: Add a new Bitbucket Pull Request
 *
 * Creates a new pull request between two branches in a repository.
 * Returns a formatted markdown response with the created pull request details.
 *
 * @param args - Tool arguments for creating a pull request
 * @returns MCP response with formatted pull request details
 * @throws Will return error message if pull request creation fails
 */
async function addPullRequest(args: CreatePullRequestToolArgsType) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.pullrequests.tool.ts',
		'addPullRequest',
	);
	methodLogger.debug(
		`Adding pull request in ${args.workspaceSlug}/${args.repoSlug} from ${args.sourceBranch}`,
		args,
	);

	try {
		const result = await atlassianPullRequestsController.create({
			workspaceSlug: args.workspaceSlug,
			repoSlug: args.repoSlug,
			title: args.title,
			sourceBranch: args.sourceBranch,
			destinationBranch: args.destinationBranch,
			description: args.description,
			closeSourceBranch: args.closeSourceBranch,
		});

		methodLogger.debug('Successfully added pull request');

		return {
			content: [
				{
					type: 'text' as const,
					text: result.content, // Contains timestamp footer
				},
			],
			// No pagination metadata needed for 'add'
		};
	} catch (error) {
		methodLogger.error('Failed to add pull request', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Register Atlassian Pull Requests MCP Tools
 *
 * Registers the pull requests-related tools with the MCP server.
 * Each tool is registered with its schema, description, and handler function.
 *
 * @param server - The MCP server instance to register tools with
 */
function registerTools(server: McpServer) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.pullrequests.tool.ts',
		'registerTools',
	);
	methodLogger.debug('Registering Atlassian Pull Requests tools...');

	// Register the list pull requests tool
	server.tool(
		'bb_ls_prs',
		`Lists pull requests for a repository identified by \`workspaceSlug\` and \`repoSlug\`. Allows filtering by \`state\` (OPEN, MERGED, DECLINED, SUPERSEDED) or \`query\` text and supports pagination via \`limit\` and \`cursor\` (page number). Use this to find PRs and their \`prId\` for other tools. Returns a formatted Markdown list including ID, title, state, author, branches, and description snippet. Requires Bitbucket credentials to be configured.`,
		ListPullRequestsToolArgs.shape,
		listPullRequests,
	);

	// Register the get pull request details tool
	server.tool(
		'bb_get_pr',
		`Retrieves detailed information for a specific pull request identified by \`prId\` within a repository (\`workspaceSlug\`, \`repoSlug\`). Returns the PR's full description, state, author, reviewers, branches, links, and either diff statistics or the full code diff if \`includeFullDiff\` is set to true. Use this after finding a \`prId\` to get its complete context and review changes. Requires Bitbucket credentials to be configured.`,
		GetPullRequestToolArgs.shape,
		getPullRequest,
	);

	// Register the list pull request comments tool
	server.tool(
		'bb_ls_pr_comments',
		`Lists comments (general and inline) for a specific pull request identified by \`prId\` within a repository (\`workspaceSlug\`, \`repoSlug\`). Supports pagination via \`limit\` and \`cursor\` (page number). Returns a formatted Markdown list of comments including author, date, content, and file context for inline comments. Use this to view review feedback and discussion threads. Requires Bitbucket credentials to be configured.`,
		ListPullRequestCommentsToolArgs.shape,
		listPullRequestComments,
	);

	// Register the add pull request comment tool
	server.tool(
		'bb_add_pr_comment',
		`Creates a comment with specified \`content\` on a pull request identified by \`prId\` within a repository (\`workspaceSlug\`, \`repoSlug\`). Supports both general PR comments and inline code comments via the optional \`inline\` object with \`path\` and \`line\` properties. Returns a confirmation message as Markdown upon successful creation. Requires Bitbucket credentials to be configured.`,
		CreatePullRequestCommentToolArgs.shape,
		addPullRequestComment,
	);

	// Register the tool for adding pull requests
	server.tool(
		'bb_add_pr',
		`Creates a new pull request in a repository (\`workspaceSlug\`, \`repoSlug\`) with a \`title\` from \`sourceBranch\` to \`destinationBranch\` (defaults to main/master). Optionally includes a \`description\` and can automatically close the source branch when merged via \`closeSourceBranch\`. Returns formatted details of the newly created pull request as Markdown. Requires Bitbucket credentials to be configured.`,
		CreatePullRequestToolArgs.shape,
		addPullRequest,
	);

	methodLogger.debug('Successfully registered Atlassian Pull Requests tools');
}

export default { registerTools };
