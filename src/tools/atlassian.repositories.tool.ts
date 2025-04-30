import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import {
	ListRepositoriesToolArgs,
	ListRepositoriesToolArgsType,
	GetRepositoryToolArgs,
	GetRepositoryToolArgsType,
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
		`Lists repositories within a workspace (\`workspaceSlug\`), optionally filtering by name (\`query\`), user role (\`role\`), or sorting (\`sort\`).\n- Use this to discover repositories and find their \`repoSlug\` needed for other repository or PR tools.\n- Supports pagination via \`limit\` and \`cursor\`.\nReturns a formatted list of repositories including name, full name, owner, description, privacy status, dates, and URL.`,
		ListRepositoriesToolArgs.shape,
		listRepositories,
	);

	// Register the get repository details tool
	server.tool(
		'bb_get_repo',
		`Retrieves detailed information for a specific repository using its slugs (\`workspaceSlug\`, \`repoSlug\`).\n- Includes UUID, owner, description, language, size, dates, and links.\nUse this after finding the repository slugs to get its full details.\nReturns detailed repository information formatted as Markdown.`,
		GetRepositoryToolArgs.shape,
		getRepository,
	);

	methodLogger.debug('Successfully registered Atlassian Repositories tools');
}

export default { registerTools };
