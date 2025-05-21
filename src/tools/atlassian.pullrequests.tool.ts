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
		// Pass args directly to controller without any logic
		const result = await atlassianPullRequestsController.list(args);

		methodLogger.debug(
			'Successfully retrieved pull requests from controller',
		);

		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
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
 * Retrieves detailed information about a specific pull request.
 * Returns a formatted markdown response with pull request details.
 *
 * @param args - Tool arguments containing the workspace, repository, and pull request identifiers
 * @returns MCP response with formatted pull request details
 * @throws Will return error message if pull request retrieval fails
 */
async function getPullRequest(args: GetPullRequestToolArgsType) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.pullrequests.tool.ts',
		'getPullRequest',
	);
	methodLogger.debug('Getting Bitbucket pull request details:', args);

	try {
		// Pass args directly to controller
		const result = await atlassianPullRequestsController.get(args);

		methodLogger.debug(
			'Successfully retrieved pull request details from controller',
		);

		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
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
	methodLogger.debug('Listing pull request comments:', args);

	try {
		// Pass args directly to controller
		const result = await atlassianPullRequestsController.listComments(args);

		methodLogger.debug(
			'Successfully retrieved pull request comments from controller',
		);

		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
				},
			],
		};
	} catch (error) {
		methodLogger.error('Failed to get pull request comments', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * MCP Tool: Add Bitbucket Pull Request Comment
 *
 * Adds a comment to a specific pull request, with support for general and inline comments.
 * Returns a success message as markdown.
 *
 * @param args - Tool arguments containing workspace, repository, PR ID, and comment content
 * @returns MCP response with formatted success message
 * @throws Will return error message if comment creation fails
 */
async function addPullRequestComment(
	args: CreatePullRequestCommentToolArgsType,
) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.pullrequests.tool.ts',
		'addPullRequestComment',
	);
	methodLogger.debug('Adding pull request comment:', {
		...args,
		content: `(length: ${args.content.length})`,
	});

	try {
		// Pass args directly to controller
		const result = await atlassianPullRequestsController.addComment(args);

		methodLogger.debug(
			'Successfully added pull request comment via controller',
		);

		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
				},
			],
		};
	} catch (error) {
		methodLogger.error('Failed to add pull request comment', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * MCP Tool: Create Bitbucket Pull Request
 *
 * Creates a new pull request between two branches in a Bitbucket repository.
 * Returns a formatted markdown response with the newly created pull request details.
 *
 * @param args - Tool arguments containing workspace, repository, source branch, destination branch, and title
 * @returns MCP response with formatted pull request details
 * @throws Will return error message if pull request creation fails
 */
async function addPullRequest(args: CreatePullRequestToolArgsType) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.pullrequests.tool.ts',
		'addPullRequest',
	);
	methodLogger.debug('Creating new pull request:', {
		...args,
		description: args.description
			? `(length: ${args.description.length})`
			: '(none)',
	});

	try {
		// Pass args directly to controller
		const result = await atlassianPullRequestsController.add(args);

		methodLogger.debug('Successfully created pull request via controller');

		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
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
		`Lists pull requests within a repository (\`repoSlug\`). If \`workspaceSlug\` is not provided, the system will use your default workspace. Filters by \`state\` (OPEN, MERGED, DECLINED, SUPERSEDED) and supports text search via \`query\`. Supports pagination via \`limit\` and \`cursor\`. Pagination details are included at the end of the text content. Returns a formatted Markdown list with each PR's title, status, author, reviewers, and creation date. Requires Bitbucket credentials to be configured.`,
		ListPullRequestsToolArgs.shape,
		listPullRequests,
	);

	// Register the get pull request tool
	server.tool(
		'bb_get_pr',
		`Retrieves detailed information about a specific pull request identified by \`prId\` within a repository (\`repoSlug\`). If \`workspaceSlug\` is not provided, the system will use your default workspace. Includes PR details, status, reviewers, and diff statistics. Set \`includeFullDiff\` to true (default) for the complete code changes. Set \`includeComments\` to true to also retrieve comments (default: false; Note: Enabling this may increase response time for pull requests with many comments). Returns rich information as formatted Markdown, including PR summary, code changes, and optionally comments. Requires Bitbucket credentials to be configured.`,
		GetPullRequestToolArgs.shape,
		getPullRequest,
	);

	// Register the list pull request comments tool
	server.tool(
		'bb_ls_pr_comments',
		`Lists comments on a specific pull request identified by \`prId\` within a repository (\`repoSlug\`). If \`workspaceSlug\` is not provided, the system will use your default workspace. Retrieves both general PR comments and inline code comments, indicating their location if applicable. Supports pagination via \`limit\` and \`cursor\`. Pagination details are included at the end of the text content. Returns a formatted Markdown list with each comment's author, timestamp, content, and location for inline comments. Requires Bitbucket credentials to be configured.`,
		ListPullRequestCommentsToolArgs.shape,
		listPullRequestComments,
	);

	// Register the add pull request comment tool
	server.tool(
		'bb_add_pr_comment',
		`Adds a comment to a specific pull request identified by \`prId\` within a repository (\`repoSlug\`). If \`workspaceSlug\` is not provided, the system will use your default workspace. The \`content\` parameter accepts Markdown-formatted text for the comment body. For inline code comments, provide both \`inline.path\` (file path) and \`inline.line\` (line number). Returns a success message as formatted Markdown. Requires Bitbucket credentials with write permissions to be configured.`,
		CreatePullRequestCommentToolArgs.shape,
		addPullRequestComment,
	);

	// Register the create pull request tool
	server.tool(
		'bb_add_pr',
		`Creates a new pull request in a repository (\`repoSlug\`). If \`workspaceSlug\` is not provided, the system will use your default workspace. Required parameters include \`title\`, \`sourceBranch\` (branch with changes), and optionally \`destinationBranch\` (target branch, defaults to main/master). The \`description\` parameter accepts Markdown-formatted text for the PR description. Set \`closeSourceBranch\` to true to automatically delete the source branch after merging. Returns the newly created pull request details as formatted Markdown. Requires Bitbucket credentials with write permissions to be configured.`,
		CreatePullRequestToolArgs.shape,
		addPullRequest,
	);

	methodLogger.debug('Successfully registered Pull Requests tools');
}

export default { registerTools };
