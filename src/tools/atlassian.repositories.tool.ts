import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import {
	ListRepositoriesToolArgs,
	ListRepositoriesToolArgsType,
	GetRepositoryToolArgs,
	GetRepositoryToolArgsType,
	GetCommitHistoryToolArgs,
	GetCommitHistoryToolArgsType,
	CreateBranchToolArgsSchema,
	CreateBranchToolArgsType,
} from './atlassian.repositories.types.js';

import atlassianRepositoriesController from '../controllers/atlassian.repositories.controller.js';

// Create a contextualized logger for this file
const toolLogger = Logger.forContext('tools/atlassian.repositories.tool.ts');

// Log tool initialization
toolLogger.debug('Bitbucket repositories tool initialized');

/**
 * MCP Tool: List Bitbucket Repositories
 *
 * Lists Bitbucket repositories within a workspace with optional filtering.
 * Returns a formatted markdown response with repository details.
 *
 * @param args - Tool arguments for filtering repositories
 * @returns MCP response with formatted repositories list
 * @throws Will return error message if repository listing fails
 */
async function listRepositories(args: ListRepositoriesToolArgsType) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.repositories.tool.ts',
		'listRepositories',
	);
	methodLogger.debug('Listing Bitbucket repositories with filters:', args);

	try {
		// Pass the options to the controller
		const result = await atlassianRepositoriesController.list({
			workspaceSlug: args.workspaceSlug,
			query: args.query,
			role: args.role,
			sort: args.sort,
			limit: args.limit,
			cursor: args.cursor,
		});

		methodLogger.debug(
			'Successfully retrieved repositories from controller',
			{
				count: result.pagination?.count,
				hasMore: result.pagination?.hasMore,
			},
		);

		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
				},
			],
			metadata: {
				pagination: result.pagination,
			},
		};
	} catch (error) {
		methodLogger.error('Failed to list repositories', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * MCP Tool: Get Bitbucket Repository Details
 *
 * Retrieves detailed information about a specific Bitbucket repository.
 * Returns a formatted markdown response with repository metadata.
 *
 * @param args - Tool arguments containing the workspace and repository slug
 * @returns MCP response with formatted repository details
 * @throws Will return error message if repository retrieval fails
 */
async function getRepository(args: GetRepositoryToolArgsType) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.repositories.tool.ts',
		'getRepository',
	);

	methodLogger.debug(
		`Retrieving repository details for ${args.workspaceSlug}/${args.repoSlug}`,
		args,
	);

	try {
		const result = await atlassianRepositoriesController.get({
			workspaceSlug: args.workspaceSlug,
			repoSlug: args.repoSlug,
		});

		methodLogger.debug(
			'Successfully retrieved repository details from controller',
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
		methodLogger.error('Failed to get repository details', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * MCP Tool: Get Bitbucket Commit History
 *
 * Retrieves the commit history for a specific repository.
 *
 * @param args Tool arguments including workspace/repo slugs and optional filters.
 * @returns MCP response with formatted commit history.
 * @throws Will return error message if history retrieval fails.
 */
async function handleGetCommitHistory(args: GetCommitHistoryToolArgsType) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.repositories.tool.ts',
		'handleGetCommitHistory',
	);
	methodLogger.debug('Getting commit history with args:', args);

	try {
		// Pass all parameters directly to controller
		const result =
			await atlassianRepositoriesController.getCommitHistory(args);

		methodLogger.debug(
			'Successfully retrieved commit history from controller',
			{
				count: result.pagination?.count,
				hasMore: result.pagination?.hasMore,
			},
		);

		return {
			content: [{ type: 'text' as const, text: result.content }],
			metadata: {
				pagination: result.pagination,
			},
		};
	} catch (error) {
		methodLogger.error('Failed to get commit history', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Handler for creating a new branch.
 */
async function handleCreateBranch(args: CreateBranchToolArgsType) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.repositories.tool.ts',
		'handleCreateBranch',
	);
	try {
		methodLogger.debug('Tool bb_create_branch called', args);
		const result = await atlassianRepositoriesController.createBranch(args);
		return {
			content: [{ type: 'text' as const, text: result.content }],
			// No specific metadata or pagination for create operations typically
		};
	} catch (error) {
		methodLogger.error('Tool bb_create_branch failed', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Register all Bitbucket repository tools with the MCP server.
 */
function registerTools(server: McpServer) {
	const registerLogger = Logger.forContext(
		'tools/atlassian.repositories.tool.ts',
		'registerTools',
	);
	registerLogger.debug('Registering Repository tools...');

	// Register the list repositories tool
	server.tool(
		'bb_ls_repos',
		`Lists repositories within a workspace identified by \`workspaceSlug\`. Filters repositories where the authenticated user has the specified \`role\` (or higher). Valid roles: 'owner', 'admin', 'contributor', 'member'. Note: 'member' typically includes all accessible repositories. Supports filtering by name/description using \`query\` and custom sorting with \`sort\`. Includes pagination via \`limit\` and \`cursor\` (page number). Returns a formatted Markdown list of repositories with their slugs, names, descriptions, privacy status, and URLs. Requires Bitbucket credentials to be configured.`,
		ListRepositoriesToolArgs.shape,
		listRepositories,
	);

	// Register the get repository details tool
	server.tool(
		'bb_get_repo',
		`Retrieves detailed information for a specific repository identified by \`workspaceSlug\` and \`repoSlug\`. Returns comprehensive repository metadata as formatted Markdown, including UUID, owner information, description, primary language, size, creation date, last updated time, recent pull requests, and relevant links. Use this after discovering a repository's slug to get its complete details. Requires Bitbucket credentials to be configured.`,
		GetRepositoryToolArgs.shape,
		getRepository,
	);

	// Register the get commit history tool
	server.tool(
		'bb_get_commit_history',
		`Retrieves the commit history for a repository identified by \`workspaceSlug\` and \`repoSlug\`. Supports pagination via \`limit\` and \`cursor\` (page number). Optionally filters history starting from a specific branch, tag, or hash using \`revision\`, or shows only commits affecting a specific file using \`path\`. Returns the commit history as formatted Markdown, including commit hash, author, date, and message. Requires Bitbucket credentials to be configured.`,
		GetCommitHistoryToolArgs.shape,
		handleGetCommitHistory,
	);

	// Add the new create_branch tool
	server.tool(
		'bb_create_branch',
		`Creates a new branch in a specified Bitbucket repository. Requires the workspace slug (\`workspaceSlug\`), repository slug (\`repoSlug\`), the desired new branch name (\`newBranchName\`), and the source branch or commit hash (\`sourceBranchOrCommit\`) to branch from. Requires repository write permissions. Returns a success message.`,
		CreateBranchToolArgsSchema.shape,
		handleCreateBranch,
	);

	registerLogger.debug('Successfully registered Repository tools');
}

export default { registerTools };
