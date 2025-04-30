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
	AddPullRequestCommentToolArgs,
	AddPullRequestCommentToolArgsType,
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
		const message = await atlassianPullRequestsController.list({
			workspaceSlug: args.workspaceSlug,
			repoSlug: args.repoSlug,
			state: args.state,
			query: args.query,
			limit: args.limit,
			cursor: args.cursor,
		});

		methodLogger.debug(
			'Successfully retrieved pull requests from controller',
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
		const message = await atlassianPullRequestsController.get({
			workspaceSlug: args.workspaceSlug,
			repoSlug: args.repoSlug,
			prId: args.prId,
		});

		methodLogger.debug(
			'Successfully retrieved pull request details from controller',
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
		const message = await atlassianPullRequestsController.listComments({
			workspaceSlug: args.workspaceSlug,
			repoSlug: args.repoSlug,
			prId: args.prId,
			limit: args.limit,
			cursor: args.cursor,
		});

		methodLogger.debug(
			'Successfully retrieved pull request comments from controller',
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
		methodLogger.error('Failed to get pull request comments', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * MCP Tool: Add Comment to Bitbucket Pull Request
 *
 * Adds a new comment to a specific Bitbucket pull request.
 * The comment can be either a general comment or an inline code comment.
 *
 * @param args - Tool arguments containing workspace, repository, PR identifiers, and comment content
 * @returns MCP response confirming the comment was added
 * @throws Will return error message if comment addition fails
 */
async function addPullRequestComment(args: AddPullRequestCommentToolArgsType) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.pullrequests.tool.ts',
		'addPullRequestComment',
	);

	methodLogger.debug(
		`Adding comment to pull request ${args.workspaceSlug}/${args.repoSlug}/${args.prId}`,
		args,
	);

	try {
		const message = await atlassianPullRequestsController.addComment({
			workspaceSlug: args.workspaceSlug,
			repoSlug: args.repoSlug,
			prId: args.prId,
			content: args.content,
			inline: args.inline,
		});

		methodLogger.debug('Successfully added pull request comment', message);

		return {
			content: [
				{
					type: 'text' as const,
					text: message.content,
				},
			],
		};
	} catch (error) {
		methodLogger.error('Failed to add pull request comment', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * MCP Tool: Create a new Bitbucket Pull Request
 *
 * Creates a new pull request between two branches in a repository.
 * Returns a formatted markdown response with the created pull request details.
 *
 * @param args - Tool arguments for creating a pull request
 * @returns MCP response with formatted pull request details
 * @throws Will return error message if pull request creation fails
 */
async function createPullRequest(args: CreatePullRequestToolArgsType) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.pullrequests.tool.ts',
		'createPullRequest',
	);
	methodLogger.debug(
		`Creating pull request in ${args.workspaceSlug}/${args.repoSlug} from ${args.sourceBranch}`,
		args,
	);

	try {
		const message = await atlassianPullRequestsController.create({
			workspaceSlug: args.workspaceSlug,
			repoSlug: args.repoSlug,
			title: args.title,
			sourceBranch: args.sourceBranch,
			destinationBranch: args.destinationBranch,
			description: args.description,
			closeSourceBranch: args.closeSourceBranch,
		});

		methodLogger.debug('Successfully created pull request', message);

		return {
			content: [
				{
					type: 'text' as const,
					text: message.content,
				},
			],
		};
	} catch (error) {
		methodLogger.error('Failed to create pull request', error);
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
		`Lists pull requests for a repository (\`workspaceSlug\`, \`repoSlug\`), optionally filtering by state (\`state\`) or query text (\`query\`).\n- Use this to find PRs by state (OPEN, MERGED, DECLINED, SUPERSEDED) or search titles/descriptions.\n- Provides \`prId\` values needed for other PR tools.\n- Supports pagination via \`limit\` and \`cursor\`.\nReturns a formatted list of pull requests including ID, title, state, author, branches, and description snippet.`,
		ListPullRequestsToolArgs.shape,
		listPullRequests,
	);

	// Register the get pull request details tool
	server.tool(
		'bb_get_pr',
		`Retrieves detailed information for a specific pull request using its ID (\`prId\`) within a repository (\`workspaceSlug\`, \`repoSlug\`).\n- Includes full description, state, author, reviewers, branches, and links to commits/diffs.\nUse this after finding a \`prId\` to get its full context.\nReturns detailed pull request information formatted as Markdown.`,
		GetPullRequestToolArgs.shape,
		getPullRequest,
	);

	// Register the list pull request comments tool
	server.tool(
		'bb_ls_pr_comments',
		`Lists comments (general and inline) for a specific pull request (\`prId\`) within a repository (\`workspaceSlug\`, \`repoSlug\`).\n- Use this to view review feedback and discussion context.\n- Supports pagination via \`limit\` and \`cursor\`.\nReturns a formatted list of comments including author, date, content, and inline comment context (file path, line).`,
		ListPullRequestCommentsToolArgs.shape,
		listPullRequestComments,
	);

	// Register the add pull request comment tool
	server.tool(
		'bb_add_pr_comment',
		`Adds a comment (\`content\`) to a specific pull request (\`prId\`) within a repository (\`workspaceSlug\`, \`repoSlug\`).\n- Supports both general PR comments and inline code comments via the optional \`inline\` object ({ path, line }).\nUse to provide feedback or participate in PR discussions.\nReturns a confirmation message upon success.`,
		AddPullRequestCommentToolArgs.shape,
		addPullRequestComment,
	);

	// Register the tool for creating pull requests
	server.tool(
		'bb_create_pr',
		`Creates a new pull request in a repository (\`workspaceSlug\`, \`repoSlug\`) with a title (\`title\`) and source branch (\`sourceBranch\`).\n- Optionally specify destination branch (\`destinationBranch\`, defaults usually to main/master), description (\`description\`),\n- and whether to close the source branch on merge (\`closeSourceBranch\`).\nUse this to initiate code review for a feature or bugfix branch.\nReturns formatted details of the newly created pull request.`,
		CreatePullRequestToolArgs.shape,
		createPullRequest,
	);

	methodLogger.debug('Successfully registered Atlassian Pull Requests tools');
}

export default { registerTools };
