import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import atlassianWorkspacesController from '../controllers/atlassian.workspaces.controller.js';

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
		.command('ls-workspaces')
		.description(
			'List Bitbucket workspaces accessible to the user, with pagination support.',
		)
		// NOTE: Sort option has been removed as the Bitbucket API's /2.0/user/permissions/workspaces endpoint
		// does not support sorting on any field
		.option(
			'-l, --limit <number>',
			'Maximum number of items to return (1-100). Controls the response size. Defaults to 25 if omitted.',
		)
		.option(
			'-c, --cursor <string>',
			'Pagination cursor for retrieving the next set of results. Obtained from previous response when more results are available.',
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.workspaces.cli.ts',
				'ls-workspaces',
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

				// Map CLI options to controller params
				const filterOptions = {
					limit: options.limit
						? parseInt(options.limit, 10)
						: undefined,
					cursor: options.cursor,
				};

				actionLogger.debug(
					'Fetching workspaces with filters:',
					filterOptions,
				);
				const result =
					await atlassianWorkspacesController.list(filterOptions);
				actionLogger.debug('Successfully retrieved workspaces');

				// Display the complete content which now includes pagination information
				console.log(result.content);
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
			'Get detailed information about a specific Bitbucket workspace using its slug.',
		)
		.requiredOption(
			'-w, --workspace-slug <slug>',
			'Workspace slug to retrieve detailed information for. Must be a valid workspace slug from your Bitbucket account. Example: "myteam"',
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
