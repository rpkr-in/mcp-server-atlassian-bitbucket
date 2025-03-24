import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logger } from '../utils/logger.util.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import {
	ListRepositoriesToolArgs,
	ListRepositoriesToolArgsType,
	GetRepositoryToolArgs,
	GetRepositoryToolArgsType,
} from './atlassian.repositories.type.js';

import atlassianRepositoriesController from '../controllers/atlassian.repositories.controller.js';

/**
 * MCP Tool: List Bitbucket Repositories
 *
 * Lists Bitbucket repositories in a workspace with optional filtering by query and limit.
 * Returns a formatted markdown response with repository details and pagination info.
 *
 * @param {ListRepositoriesToolArgsType} args - Tool arguments for filtering repositories
 * @param {RequestHandlerExtra} _extra - Extra request handler information (unused)
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with formatted repositories list
 * @throws Will return error message if repository listing fails
 */
async function listRepositories(
	args: ListRepositoriesToolArgsType,
	_extra: RequestHandlerExtra,
) {
	const logPrefix =
		'[src/tools/atlassian.repositories.tool.ts@listRepositories]';
	logger.debug(
		`${logPrefix} Listing Bitbucket repositories with filters:`,
		args,
	);

	try {
		// Pass the filter options to the controller
		const message = await atlassianRepositoriesController.list({
			workspace: args.workspace,
			q: args.query,
			pagelen: args.limit,
			page: args.cursor ? parseInt(args.cursor, 10) : undefined,
		});

		logger.debug(
			`${logPrefix} Successfully retrieved repositories from controller`,
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
		logger.error(`${logPrefix} Failed to list repositories`, error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * MCP Tool: Get Bitbucket Repository Details
 *
 * Retrieves detailed information about a specific Bitbucket repository.
 * Returns a formatted markdown response with repository metadata and properties.
 *
 * @param {GetRepositoryToolArgsType} args - Tool arguments containing the workspace and repository slug
 * @param {RequestHandlerExtra} _extra - Extra request handler information (unused)
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with formatted repository details
 * @throws Will return error message if repository retrieval fails
 */
async function getRepository(
	args: GetRepositoryToolArgsType,
	_extra: RequestHandlerExtra,
) {
	const logPrefix =
		'[src/tools/atlassian.repositories.tool.ts@getRepository]';
	logger.debug(
		`${logPrefix} Retrieving repository details for workspace: ${args.workspace}, repo: ${args.repo_slug}`,
	);

	try {
		const message = await atlassianRepositoriesController.get({
			workspace: args.workspace,
			repo_slug: args.repo_slug,
		});
		logger.debug(
			`${logPrefix} Successfully retrieved repository details from controller`,
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
		logger.error(`${logPrefix} Failed to get repository details`, error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Register Atlassian Repositories MCP Tools
 *
 * Registers the list-repositories and get-repository tools with the MCP server.
 * Each tool is registered with its schema, description, and handler function.
 *
 * @param {McpServer} server - The MCP server instance to register tools with
 */
function register(server: McpServer) {
	const logPrefix = '[src/tools/atlassian.repositories.tool.ts@register]';
	logger.debug(`${logPrefix} Registering Atlassian Repositories tools...`);

	// Register the list repositories tool
	server.tool(
		'list-repositories',
		'List Bitbucket repositories in a workspace with optional filtering. Returns repositories with their slugs, languages, sizes, and metadata. Use this tool to discover available repositories in a workspace. You can use Bitbucket query syntax to search by name, language, or other attributes, and limit the number of results.',
		ListRepositoriesToolArgs.shape,
		listRepositories,
	);

	// Register the get repository details tool
	server.tool(
		'get-repository',
		'Get detailed information about a specific Bitbucket repository by workspace and repository slug. Returns comprehensive metadata including description, permission settings, and URLs for different operations. Use this tool when you need in-depth information about a repository, such as its size, language, fork policy, or clone URLs.',
		GetRepositoryToolArgs.shape,
		getRepository,
	);

	logger.debug(
		`${logPrefix} Successfully registered Atlassian Repositories tools`,
	);
}

export default { register };
