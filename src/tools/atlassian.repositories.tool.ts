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
 * Lists Bitbucket repositories within a workspace with optional filtering.
 * Returns a formatted markdown response with repository details.
 *
 * @param args - Tool arguments for filtering repositories
 * @param _extra - Extra request handler information (unused)
 * @returns MCP response with formatted repositories list
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
			q: args.q,
			sort: args.sort,
			role: args.role,
			limit: args.limit,
			cursor: args.cursor,
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
 * Returns a formatted markdown response with repository metadata.
 *
 * @param args - Tool arguments containing the workspace and repository slug
 * @param _extra - Extra request handler information (unused)
 * @returns MCP response with formatted repository details
 * @throws Will return error message if repository retrieval fails
 */
async function getRepository(
	args: GetRepositoryToolArgsType,
	_extra: RequestHandlerExtra,
) {
	const logPrefix =
		'[src/tools/atlassian.repositories.tool.ts@getRepository]';
	logger.debug(
		`${logPrefix} Retrieving repository details for ${args.workspace}/${args.repoSlug}`,
		args,
	);

	try {
		const message = await atlassianRepositoriesController.get(
			args.workspace,
			args.repoSlug,
			{
				includeBranches: args.includeBranches,
				includeCommits: args.includeCommits,
				includePullRequests: args.includePullRequests,
			},
		);

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
 * @param server - The MCP server instance to register tools with
 */
function register(server: McpServer) {
	const logPrefix = '[src/tools/atlassian.repositories.tool.ts@register]';
	logger.debug(`${logPrefix} Registering Atlassian Repositories tools...`);

	// Register the list repositories tool
	server.tool(
		'list-repositories',
		'List Bitbucket repositories within a workspace with optional filtering. Returns repositories with their names, slugs, descriptions, and URLs. Use this tool to discover available Bitbucket repositories before accessing specific content.',
		ListRepositoriesToolArgs.shape,
		listRepositories,
	);

	// Register the get repository details tool
	server.tool(
		'get-repository',
		'Get detailed information about a specific Bitbucket repository by workspace and repository slug. Returns comprehensive metadata including branches, commits, and pull requests if requested. Use this tool when you need in-depth information about a particular repository.',
		GetRepositoryToolArgs.shape,
		getRepository,
	);

	logger.debug(
		`${logPrefix} Successfully registered Atlassian Repositories tools`,
	);
}

export default { register };
