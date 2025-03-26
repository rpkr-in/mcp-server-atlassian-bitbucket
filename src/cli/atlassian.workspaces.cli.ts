import { Command } from 'commander';
import { logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import atlassianWorkspacesController from '../controllers/atlassian.workspaces.controller.js';
import { ListWorkspacesOptions } from '../controllers/atlassian.workspaces.types.js';

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
			'List Bitbucket workspaces with optional filtering\n\n  Retrieves workspaces the authenticated user has access to with pagination options.',
		)
		.option(
			'-l, --limit <number>',
			'Maximum number of workspaces to return (1-100). Use this to control the response size. If omitted, defaults to 25.',
		)
		.option(
			'-c, --cursor <string>',
			'Pagination cursor for retrieving the next set of results. Obtain this value from the previous response when more results are available.',
		)
		.action(async (options) => {
			const logPrefix =
				'[src/cli/atlassian.workspaces.cli.ts@list-workspaces]';
			try {
				logger.debug(
					`${logPrefix} Processing command options:`,
					options,
				);

				const filterOptions: ListWorkspacesOptions = {
					...(options.limit && {
						limit: parseInt(options.limit, 10),
					}),
					...(options.cursor ? { cursor: options.cursor } : {}),
				};

				logger.debug(
					`${logPrefix} Fetching workspaces with filters:`,
					filterOptions,
				);
				const result =
					await atlassianWorkspacesController.list(filterOptions);
				logger.debug(`${logPrefix} Successfully retrieved workspaces`);

				console.log(result.content);
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
		.argument('<workspace-slug>', 'Slug of the workspace to retrieve')
		.action(async (workspaceSlug: string) => {
			const logPrefix =
				'[src/cli/atlassian.workspaces.cli.ts@get-workspace]';
			try {
				logger.debug(
					`${logPrefix} Fetching details for workspace slug: ${workspaceSlug}`,
				);
				const result = await atlassianWorkspacesController.get({
					workspace: workspaceSlug,
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
