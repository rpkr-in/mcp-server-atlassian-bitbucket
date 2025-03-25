import { Command } from 'commander';
import { logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import atlassianRepositoriesController from '../controllers/atlassian.repositories.controller.js';
import { ListRepositoriesOptions } from '../controllers/atlassian.repositories.type.js';

/**
 * CLI module for managing Bitbucket repositories.
 * Provides commands for listing repositories and retrieving repository details.
 * All commands require valid Atlassian credentials.
 */

/**
 * Register Bitbucket Repositories CLI commands with the Commander program
 * @param program - The Commander program instance to register commands with
 * @throws Error if command registration fails
 */
function register(program: Command): void {
	const logPrefix = '[src/cli/atlassian.repositories.cli.ts@register]';
	logger.debug(
		`${logPrefix} Registering Bitbucket Repositories CLI commands...`,
	);

	registerListRepositoriesCommand(program);
	registerGetRepositoryCommand(program);

	logger.debug(`${logPrefix} CLI commands registered successfully`);
}

/**
 * Register the command for listing Bitbucket repositories
 * @param program - The Commander program instance
 */
function registerListRepositoriesCommand(program: Command): void {
	program
		.command('list-repositories')
		.description(
			'List Bitbucket repositories with optional filtering\n\n  Retrieves repositories from a specific workspace with filtering and pagination options.',
		)
		.argument('<workspace>', 'Workspace slug containing the repositories')
		.option(
			'-l, --limit <number>',
			'Maximum number of repositories to return (1-100). Use this to control the response size. If omitted, defaults to 25.',
		)
		.option(
			'-c, --cursor <string>',
			'Pagination cursor for retrieving the next set of results. Obtain this value from the previous response when more results are available.',
		)
		.option(
			'-q, --query <query>',
			'Query string to filter repositories using Bitbucket query syntax. Example: "name ~ \\"api\\"" for repositories with "api" in the name.',
		)
		.action(async (workspace, options) => {
			const logPrefix =
				'[src/cli/atlassian.repositories.cli.ts@list-repositories]';
			try {
				logger.debug(`${logPrefix} Processing command options:`, {
					workspace,
					...options,
				});

				const filterOptions: ListRepositoriesOptions = {
					workspace,
					...(options.limit && {
						limit: parseInt(options.limit, 10),
					}),
					...(options.cursor && { cursor: options.cursor }),
					...(options.query && {
						query: options.query,
					}),
				};

				logger.debug(
					`${logPrefix} Fetching repositories with filters:`,
					filterOptions,
				);
				const result =
					await atlassianRepositoriesController.list(filterOptions);
				logger.debug(
					`${logPrefix} Successfully retrieved repositories`,
				);

				console.log(result.content);
			} catch (error) {
				logger.error(`${logPrefix} Operation failed:`, error);
				handleCliError(error);
			}
		});
}

/**
 * Register the command for retrieving a specific Bitbucket repository
 * @param program - The Commander program instance
 */
function registerGetRepositoryCommand(program: Command): void {
	program
		.command('get-repository')
		.description(
			'Get detailed information about a specific Bitbucket repository\n\n  Retrieves comprehensive details for a repository including branches, permissions, and settings.',
		)
		.argument('<workspace>', 'Workspace slug containing the repository')
		.argument('<repo-slug>', 'Slug of the repository to retrieve')
		.action(async (workspace: string, repoSlug: string) => {
			const logPrefix =
				'[src/cli/atlassian.repositories.cli.ts@get-repository]';
			try {
				logger.debug(
					`${logPrefix} Fetching details for repository: ${workspace}/${repoSlug}`,
				);
				const result = await atlassianRepositoriesController.get({
					workspace,
					repoSlug,
				});
				logger.debug(
					`${logPrefix} Successfully retrieved repository details`,
				);

				console.log(result.content);
			} catch (error) {
				logger.error(`${logPrefix} Operation failed:`, error);
				handleCliError(error);
			}
		});
}

export default { register };
