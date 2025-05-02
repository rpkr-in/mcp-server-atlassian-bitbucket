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
		const message = await atlassianRepositoriesController.list({
			workspaceSlug: args.workspaceSlug,
			query: args.query,
			role: args.role,
			sort: args.sort,
			limit: args.limit,
			cursor: args.cursor,
		});

		methodLogger.debug(
			'Successfully retrieved repositories from controller',
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
		const message = await atlassianRepositoriesController.get({
			workspaceSlug: args.workspaceSlug,
			repoSlug: args.repoSlug,
		});

		methodLogger.debug(
			'Successfully retrieved repository details from controller',
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
		// Separate identifier from options
		const identifier = {
			workspaceSlug: args.workspaceSlug,
			repoSlug: args.repoSlug,
		};
		const options = {
			revision: args.revision,
			path: args.path,
			limit: args.limit,
			cursor: args.cursor,
		};

		const result = await atlassianRepositoriesController.getCommitHistory(
			identifier, // Pass identifier object
			options, // Pass options object
		);

		methodLogger.debug(
			'Successfully retrieved commit history from controller',
		);

		return {
			content: [{ type: 'text' as const, text: result.content }],
		};
	} catch (error) {
		methodLogger.error('Failed to get commit history', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Register Atlassian Repositories MCP Tools
 *
 * Registers the repositories-related tools with the MCP server.
 * Each tool is registered with its schema, description, and handler function.
 *
 * @param server - The MCP server instance to register tools with
 */
function registerTools(server: McpServer) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.repositories.tool.ts',
		'registerTools',
	);
	methodLogger.debug('Registering Atlassian Repositories tools...');

	// Register the list repositories tool
	server.tool(
		'bb_ls_repos',
		`Lists repositories within a workspace identified by \`workspaceSlug\`. Supports filtering by name using \`query\`, user access level with \`role\`, and custom sorting with \`sort\`. Includes pagination via \`limit\` and \`cursor\`. Returns a formatted Markdown list of repositories with their slugs, names, descriptions, privacy status, and URLs needed for other repository operations.`,
		ListRepositoriesToolArgs.shape,
		listRepositories,
	);

	// Register the get repository details tool
	server.tool(
		'bb_get_repo',
		`Retrieves detailed information for a specific repository identified by \`workspaceSlug\` and \`repoSlug\`. Returns comprehensive repository metadata as formatted Markdown, including UUID, owner information, description, primary language, size, creation date, last updated time, and relevant links. Use this after discovering a repository's slug to get its complete details.`,
		GetRepositoryToolArgs.shape,
		getRepository,
	);

	// Register the get commit history tool
	server.tool(
		'bb_get_commit_history',
		`Retrieves the commit history for a repository identified by \`workspaceSlug\` and \`repoSlug\`. Supports pagination via \`limit\` and \`cursor\`. Optionally filters history starting from a specific branch, tag, or hash using \`revision\`, or shows only commits affecting a specific file using \`path\`. Returns the commit history as formatted Markdown, including commit hash, author, date, and message.`,
		GetCommitHistoryToolArgs.shape,
		handleGetCommitHistory,
	);

	methodLogger.debug('Successfully registered Atlassian Repositories tools');
}

export default { registerTools };
