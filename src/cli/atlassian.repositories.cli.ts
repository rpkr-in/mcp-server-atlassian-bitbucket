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
		.description('List Bitbucket repositories with optional filtering')
		.argument('<workspace>', 'The workspace slug')
		.option(
			'-l, --limit <number>',
			'Maximum number of repositories to return',
		)
		.option(
			'-p, --page <number>',
			'Page number for pagination (starts at 1)',
		)
		.option(
			'-q, --query <query>',
			'Query string to filter repositories using Bitbucket query syntax (e.g., "name ~ \\"api\\"" for repositories with "api" in the name)',
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
					...(options.page && {
						cursor: options.page,
					}),
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
			'Get detailed information about a specific Bitbucket repository',
		)
		.argument('<workspace>', 'Workspace slug that contains the repository')
		.argument('<repo_slug>', 'Slug of the repository to retrieve')
		.action(async (workspace: string, repo_slug: string) => {
			const logPrefix =
				'[src/cli/atlassian.repositories.cli.ts@get-repository]';
			try {
				logger.debug(
					`${logPrefix} Fetching details for repository: ${workspace}/${repo_slug}`,
				);
				const result = await atlassianRepositoriesController.get(
					workspace,
					repo_slug,
				);
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
