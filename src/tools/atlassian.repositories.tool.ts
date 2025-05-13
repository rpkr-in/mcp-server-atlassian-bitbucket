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
	CloneRepositoryToolArgs,
	CloneRepositoryToolArgsType,
	GetFileContentToolArgs,
	GetFileContentToolArgsType,
	ListBranchesToolArgs,
	ListBranchesToolArgsType,
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
 * Handler for adding a new branch.
 */
async function handleAddBranch(args: CreateBranchToolArgsType) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.repositories.tool.ts',
		'handleAddBranch',
	);
	try {
		methodLogger.debug('Tool bb_add_branch called', args);
		const result = await atlassianRepositoriesController.createBranch(args);
		return {
			content: [{ type: 'text' as const, text: result.content }],
			// No specific metadata or pagination for create operations typically
		};
	} catch (error) {
		methodLogger.error('Tool bb_add_branch failed', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Handler for cloning a repository.
 */
async function handleCloneRepository(args: CloneRepositoryToolArgsType) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.repositories.tool.ts',
		'handleCloneRepository',
	);
	try {
		methodLogger.debug('Tool bb_clone_repo called', args);
		const result =
			await atlassianRepositoriesController.cloneRepository(args);
		return {
			content: [{ type: 'text' as const, text: result.content }],
			// No metadata or pagination for clone operations
		};
	} catch (error) {
		methodLogger.error('Tool bb_clone_repo failed', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Handler for getting file content.
 */
async function handleGetFileContent(args: GetFileContentToolArgsType) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.repositories.tool.ts',
		'handleGetFileContent',
	);
	try {
		methodLogger.debug('Tool bb_get_file called', args);
		const result =
			await atlassianRepositoriesController.getFileContent(args);
		return {
			content: [{ type: 'text' as const, text: result.content }],
			// No specific metadata needed for file content retrieval
		};
	} catch (error) {
		methodLogger.error('Tool bb_get_file failed', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * MCP Tool: List Branches in a Bitbucket Repository
 *
 * Lists branches within a specific repository with optional filtering.
 * Returns a formatted markdown response with branch details.
 *
 * @param args - Tool arguments for identifying the repository and filtering branches
 * @returns MCP response with formatted branches list and pagination
 * @throws Will return error message if branch listing fails
 */
async function listBranches(args: ListBranchesToolArgsType) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.repositories.tool.ts',
		'listBranches',
	);
	methodLogger.debug(
		'Listing Bitbucket repository branches with filters:',
		args,
	);

	try {
		// Pass the options to the controller
		const result = await atlassianRepositoriesController.listBranches({
			workspaceSlug: args.workspaceSlug,
			repoSlug: args.repoSlug,
			query: args.query,
			sort: args.sort,
			limit: args.limit,
			cursor: args.cursor,
		});

		methodLogger.debug('Successfully retrieved branches from controller', {
			count: result.pagination?.count,
			hasMore: result.pagination?.hasMore,
		});

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
		methodLogger.error('Failed to list branches', error);
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
		`Lists repositories within a workspace identified by \`workspaceSlug\`. Filters repositories by the user\`s \`role\`, project key \`projectKey\`, or a \`query\` string (searches name/description). Supports sorting via \`sort\` and pagination via \`limit\` and \`cursor\`. Returns a formatted Markdown list. Requires Bitbucket credentials.`,
		ListRepositoriesToolArgs.shape,
		listRepositories,
	);

	// Register the get repository details tool
	server.tool(
		'bb_get_repo',
		`Retrieves detailed information for a specific repository identified by \`workspaceSlug\` and \`repoSlug\`. Returns comprehensive repository metadata as formatted Markdown, including owner, main branch, comment/task counts, recent pull requests, and relevant links. Requires Bitbucket credentials.`,
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

	// Add the new branch tool
	server.tool(
		'bb_add_branch',
		`Creates a new branch in a specified Bitbucket repository. Requires the workspace slug (\`workspaceSlug\`), repository slug (\`repoSlug\`), the desired new branch name (\`newBranchName\`), and the source branch or commit hash (\`sourceBranchOrCommit\`) to branch from. Requires repository write permissions. Returns a success message.`,
		CreateBranchToolArgsSchema.shape,
		handleAddBranch,
	);

	// Register the clone repository tool
	server.tool(
		'bb_clone_repo',
		`Clones a Bitbucket repository identified by \`workspaceSlug\` and \`repoSlug\`. The \`targetPath\` argument specifies the parent directory where the repository will be cloned. IMPORTANT: \`targetPath\` MUST be an absolute path (e.g., \`/Users/me/projects\`). The repository will be cloned into a subdirectory named after the repository slug under this \`targetPath\`. Requires Bitbucket credentials to fetch the repository clone URL. Returns a success message upon successful clone operation.`,
		CloneRepositoryToolArgs.shape,
		handleCloneRepository,
	);

	// Register the get file content tool
	server.tool(
		'bb_get_file',
		`Retrieves the content of a file from a Bitbucket repository identified by \`workspaceSlug\` and \`repoSlug\`. Specify the file to retrieve using the \`filePath\` parameter. Optionally, you can specify a \`revision\` (branch name, tag, or commit hash) to retrieve the file from - if omitted, the repository's default branch is used. Returns the raw content of the file as text. Requires Bitbucket credentials.`,
		GetFileContentToolArgs.shape,
		handleGetFileContent,
	);

	// Register the list branches tool
	server.tool(
		'bb_list_branches',
		`Lists branches in a repository identified by \`workspaceSlug\` and \`repoSlug\`. Filters branches by an optional text \`query\` and supports custom \`sort\` order. Provides pagination via \`limit\` and \`cursor\`. Returns branch details as Markdown with each branch's name, latest commit, and default merge strategy. Requires Bitbucket credentials.`,
		ListBranchesToolArgs.shape,
		listBranches,
	);

	registerLogger.debug('Successfully registered Repository tools');
}

export default { registerTools };
