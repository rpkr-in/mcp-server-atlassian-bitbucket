import { Command } from 'commander';
import { logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import atlassianProjectsController from '../controllers/atlassian.projects.controller.js';
import { ListProjectsOptions } from '../controllers/atlassian.projects.type.js';

/**
 * CLI module for managing Jira projects.
 * Provides commands for listing projects and retrieving project details.
 * All commands require valid Atlassian credentials.
 */

/**
 * Register Jira Projects CLI commands with the Commander program
 * @param program - The Commander program instance to register commands with
 * @throws Error if command registration fails
 */
function register(program: Command): void {
	const logPrefix = '[src/cli/atlassian.projects.cli.ts@register]';
	logger.debug(`${logPrefix} Registering Jira Projects CLI commands...`);

	registerListProjectsCommand(program);
	registerGetProjectCommand(program);

	logger.debug(`${logPrefix} CLI commands registered successfully`);
}

/**
 * Register the command for listing Jira projects
 * @param program - The Commander program instance
 */
function registerListProjectsCommand(program: Command): void {
	program
		.command('list-projects')
		.description('List Jira projects with optional filtering')
		.option('-q, --query <query>', 'Filter by project name or key')
		.option('-l, --limit <number>', 'Maximum number of projects to return')
		.option(
			'-c, --cursor <cursor>',
			'Pagination cursor for retrieving the next set of results',
		)
		.action(async (options) => {
			const logPrefix =
				'[src/cli/atlassian.projects.cli.ts@list-projects]';
			try {
				logger.debug(
					`${logPrefix} Processing command options:`,
					options,
				);

				const filterOptions: ListProjectsOptions = {
					...(options.query && { query: options.query }),
					...(options.limit && {
						limit: parseInt(options.limit, 10),
					}),
					...(options.cursor && { cursor: options.cursor }),
				};

				logger.debug(
					`${logPrefix} Fetching projects with filters:`,
					filterOptions,
				);
				const result =
					await atlassianProjectsController.list(filterOptions);
				logger.debug(`${logPrefix} Successfully retrieved projects`);

				console.log(result.content);
			} catch (error) {
				logger.error(`${logPrefix} Operation failed:`, error);
				handleCliError(error);
			}
		});
}

/**
 * Register the command for retrieving a specific Jira project
 * @param program - The Commander program instance
 */
function registerGetProjectCommand(program: Command): void {
	program
		.command('get-project')
		.description('Get detailed information about a specific Jira project')
		.argument('<idOrKey>', 'ID or key of the project to retrieve')
		.action(async (idOrKey: string) => {
			const logPrefix = '[src/cli/atlassian.projects.cli.ts@get-project]';
			try {
				logger.debug(
					`${logPrefix} Fetching details for project ID/key: ${idOrKey}`,
				);
				const result = await atlassianProjectsController.get(idOrKey);
				logger.debug(
					`${logPrefix} Successfully retrieved project details`,
				);

				console.log(result.content);
			} catch (error) {
				logger.error(`${logPrefix} Operation failed:`, error);
				handleCliError(error);
			}
		});
}

export default { register };
