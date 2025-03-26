import { Command } from 'commander';
import { logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import atlassianWorkspacesController from '../controllers/atlassian.workspaces.controller.js';
import { ListWorkspacesOptions } from '../controllers/atlassian.workspaces.types.js';
import { formatPagination } from '../utils/formatter.util.js';

/**
 * CLI module for managing Bitbucket workspaces.
 * Provides commands for listing workspaces and retrieving workspace details.
 * All commands require valid Atlassian credentials.
 */

/**
 * Register Bitbucket Workspaces CLI commands with the Commander program
 * @param program - The Commander program instance to register commands with
 * @throws Error if command registration fails
 */
function register(program: Command): void {
	const logPrefix = '[src/cli/atlassian.workspaces.cli.ts@register]';
	logger.debug(
		`${logPrefix} Registering Bitbucket Workspaces CLI commands...`,
	);

	registerListWorkspacesCommand(program);
	registerGetWorkspaceCommand(program);

	logger.debug(`${logPrefix} CLI commands registered successfully`);
}

/**
 * Register the command for listing Bitbucket workspaces
 * @param program - The Commander program instance
 */
function registerListWorkspacesCommand(program: Command): void {
	program
		.command('list-workspaces')
		.description(
			'List Bitbucket workspaces with optional filtering\n\n' +
				'Retrieves workspaces the authenticated user has access to with pagination options.\n\n' +
				'Examples:\n' +
				'  $ list-workspaces --limit 50\n' +
				'  $ list-workspaces --query "team" --sort "name"\n' +
				'  $ list-workspaces --cursor "next-page-token"',
		)
		.option(
			'-q, --query <text>',
			'Filter workspaces by name or other properties (text search)',
		)
		.option(
			'-s, --sort <string>',
			'Field to sort results by (e.g., "name", "-created_on")',
		)
		.option(
			'-l, --limit <number>',
			'Maximum number of workspaces to return (1-100)',
		)
		.option(
			'-c, --cursor <string>',
			'Pagination cursor for retrieving the next set of results',
		)
		.action(async (options) => {
			const logPrefix =
				'[src/cli/atlassian.workspaces.cli.ts@list-workspaces]';
			try {
				const filterOptions: ListWorkspacesOptions = {
					query: options.query,
					sort: options.sort,
				};

				// Apply pagination options if provided
				if (options.limit) {
					filterOptions.limit = parseInt(options.limit, 10);
				}

				if (options.cursor) {
					filterOptions.cursor = options.cursor;
				}

				logger.debug(
					`${logPrefix} Fetching workspaces with filters:`,
					filterOptions,
				);
				const result =
					await atlassianWorkspacesController.list(filterOptions);
				logger.debug(`${logPrefix} Successfully retrieved workspaces`);

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
				logger.error(`${logPrefix} Operation failed:`, error);
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
			'Get detailed information about a specific Bitbucket workspace\n\n  Retrieves comprehensive details for a workspace including projects, permissions, and settings.',
		)
		.argument('<entity-id>', 'Slug of the workspace to retrieve')
		.action(async (entityId: string) => {
			const logPrefix =
				'[src/cli/atlassian.workspaces.cli.ts@get-workspace]';
			try {
				logger.debug(
					`${logPrefix} Fetching details for workspace slug: ${entityId}`,
				);
				const result = await atlassianWorkspacesController.get({
					entityId,
				});
				logger.debug(
					`${logPrefix} Successfully retrieved workspace details`,
				);

				console.log(result.content);
			} catch (error) {
				logger.error(`${logPrefix} Operation failed:`, error);
				handleCliError(error);
			}
		});
}

export default { register };
