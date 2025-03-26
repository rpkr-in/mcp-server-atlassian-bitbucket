import { Command } from 'commander';
import { logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import atlassianRepositoriesController from '../controllers/atlassian.repositories.controller.js';
import { ListRepositoriesOptions } from '../controllers/atlassian.repositories.types.js';
import { formatPagination } from '../utils/formatter.util.js';

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
 * Register the command for listing repositories within a workspace
 * @param program - The Commander program instance
 */
function registerListRepositoriesCommand(program: Command): void {
	program
		.command('list-repositories')
		.description(
			'List repositories within a Bitbucket workspace\n\n' +
				'Retrieves repositories from the specified workspace with filtering and pagination options.\n\n' +
				'Examples:\n' +
				'  $ list-repositories --workspace myworkspace --limit 25\n' +
				'  $ list-repositories --workspace myworkspace --query "api" --role admin\n' +
				'  $ list-repositories --workspace myworkspace --cursor "next-page-token"',
		)
		.requiredOption(
			'--workspace <slug>',
			'Workspace slug (e.g., myteam) to list repositories from',
		)
		.option(
			'-q, --query <text>',
			'Filter repositories by name or other properties (simple text search, not query language)',
		)
		.option(
			'-r, --role <string>',
			'Filter repositories by the user\'s role (e.g., "owner", "admin", "contributor")',
		)
		.option(
			'-S, --sort <string>',
			'Field to sort results by (e.g., "name", "-updated_on")',
		)
		.option(
			'-l, --limit <number>',
			'Maximum number of repositories to return (1-100)',
		)
		.option(
			'-c, --cursor <string>',
			'Pagination cursor for retrieving the next set of results',
		)
		.action(async (options) => {
			const logPrefix =
				'[src/cli/atlassian.repositories.cli.ts@list-repositories]';
			try {
				logger.debug(
					`${logPrefix} Listing repositories for workspace: ${options.workspace}`,
				);

				// Prepare filter options from command parameters
				const filterOptions: ListRepositoriesOptions = {
					parentId: options.workspace,
					query: options.query,
					role: options.role,
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
					`${logPrefix} Fetching repositories with filters:`,
					filterOptions,
				);

				const result =
					await atlassianRepositoriesController.list(filterOptions);

				logger.debug(
					`${logPrefix} Successfully retrieved repositories`,
				);

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
 * Register the command for retrieving a specific Bitbucket repository
 * @param program - The Commander program instance
 */
function registerGetRepositoryCommand(program: Command): void {
	program
		.command('get-repository')
		.description(
			'Get detailed information about a specific Bitbucket repository\n\n' +
				'Retrieves comprehensive details for a repository including branches, permissions, and settings.\n\n' +
				'Examples:\n' +
				'  $ get-repository --workspace myworkspace --repository myrepo',
		)
		.requiredOption(
			'--workspace <slug>',
			'Workspace slug containing the repository',
		)
		.requiredOption(
			'--repository <slug>',
			'Slug of the repository to retrieve',
		)
		.action(async (options) => {
			const logPrefix =
				'[src/cli/atlassian.repositories.cli.ts@get-repository]';
			try {
				logger.debug(
					`${logPrefix} Fetching details for repository: ${options.workspace}/${options.repository}`,
				);

				const result = await atlassianRepositoriesController.get({
					parentId: options.workspace,
					entityId: options.repository,
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
