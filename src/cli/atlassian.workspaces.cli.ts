import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import atlassianWorkspacesController from '../controllers/atlassian.workspaces.controller.js';
import { ListWorkspacesOptions } from '../controllers/atlassian.workspaces.types.js';
import { formatPagination } from '../utils/formatter.util.js';

/**
 * CLI module for managing Bitbucket workspaces.
 * Provides commands for listing workspaces and retrieving workspace details.
 * All commands require valid Atlassian credentials.
 */

// Create a contextualized logger for this file
const cliLogger = Logger.forContext('cli/atlassian.workspaces.cli.ts');

// Log CLI initialization
cliLogger.debug('Bitbucket workspaces CLI module initialized');

/**
 * Register Bitbucket Workspaces CLI commands with the Commander program
 * @param program - The Commander program instance to register commands with
 * @throws Error if command registration fails
 */
function register(program: Command): void {
	const methodLogger = Logger.forContext(
		'cli/atlassian.workspaces.cli.ts',
		'register',
	);
	methodLogger.debug('Registering Bitbucket Workspaces CLI commands...');

	registerListWorkspacesCommand(program);
	registerGetWorkspaceCommand(program);

	methodLogger.debug('CLI commands registered successfully');
}

/**
 * Register the command for listing Bitbucket workspaces
 * @param program - The Commander program instance
 */
function registerListWorkspacesCommand(program: Command): void {
	program
		.command('list-workspaces')
		.description(
			`List Bitbucket workspaces accessible to the authenticated user.

        PURPOSE: Discover available workspaces, find their slugs for use in other commands, and get a high-level overview of permissions and access dates.

        Use Case: Useful when you don't know the exact slug of a workspace you need to interact with, or when exploring available team/project containers.

        Output: Formatted list including workspace name, slug, UUID, your permission level, and access dates. Supports pagination.

        Examples:
  $ mcp-bitbucket list-workspaces --limit 10
  $ mcp-bitbucket list-workspaces --cursor "some-cursor-value"`,
		)
		// NOTE: Sort option has been removed as the Bitbucket API's /2.0/user/permissions/workspaces endpoint
		// does not support sorting on any field
		.option(
			'-l, --limit <number>',
			'Maximum number of workspaces to return (1-100)',
		)
		.option(
			'-c, --cursor <string>',
			'Pagination cursor for retrieving the next set of results',
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.workspaces.cli.ts',
				'list-workspaces',
			);
			try {
				actionLogger.debug('Processing command options:', options);

				// Validate limit if provided
				if (options.limit) {
					const limit = parseInt(options.limit, 10);
					if (isNaN(limit) || limit <= 0) {
						throw new Error(
							'Invalid --limit value: Must be a positive integer.',
						);
					}
				}

				// Bitbucket API's /2.0/user/permissions/workspaces endpoint does not support sorting
				// so we don't include sort in the filterOptions even if provided in the CLI args
				const filterOptions: ListWorkspacesOptions = {};

				// Apply pagination options if provided
				if (options.limit) {
					filterOptions.limit = parseInt(options.limit, 10);
				}

				if (options.cursor) {
					filterOptions.cursor = options.cursor;
				}

				actionLogger.debug(
					'Fetching workspaces with filters:',
					filterOptions,
				);
				const result =
					await atlassianWorkspacesController.list(filterOptions);
				actionLogger.debug('Successfully retrieved workspaces');

				console.log(result.content);

				// Display pagination information if available
				if (result.pagination) {
					console.log(
						'\n' +
							formatPagination(
								result.pagination.count ?? 0,
								result.pagination.hasMore,
								result.pagination.nextCursor,
							),
					);
				}
			} catch (error) {
				actionLogger.error('Operation failed:', error);
				handleCliError(error);
			}
		});
}

/**
 * Register the command for retrieving a specific Bitbucket workspace
 * @param program - The Commander program instance
 */
function registerGetWorkspaceCommand(program: Command): void {
	program
		.command('get-workspace')
		.description(
			`Get detailed information about a specific Bitbucket workspace using its slug.

        PURPOSE: Retrieve comprehensive details for a *known* workspace, including its UUID, name, type, creation date, and links to related resources like repositories and projects.

        Use Case: Useful when you have a specific workspace slug (often obtained via 'list-workspaces') and need its full metadata or links.

        Output: Formatted details of the specified workspace. Fetches all available details by default.

        Examples:
  $ mcp-bitbucket get-workspace --workspace-slug my-dev-team`,
		)
		.requiredOption(
			'-w, --workspace-slug <slug>',
			'Slug of the workspace to retrieve (identifies the workspace)',
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.workspaces.cli.ts',
				'get-workspace',
			);
			try {
				actionLogger.debug(
					`Fetching workspace: ${options.workspaceSlug}`,
				);

				const result = await atlassianWorkspacesController.get({
					workspaceSlug: options.workspaceSlug,
				});

				console.log(result.content);
			} catch (error) {
				actionLogger.error('Operation failed:', error);
				handleCliError(error);
			}
		});
}

export default { register };
