import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import atlassianRepositoriesController from '../controllers/atlassian.repositories.controller.js';
import {
	ListRepositoriesOptions,
	GetCommitHistoryOptions,
} from '../controllers/atlassian.repositories.types.js';
import { formatPagination } from '../utils/formatter.util.js';

/**
 * CLI module for managing Bitbucket repositories.
 * Provides commands for listing repositories and retrieving repository details.
 * All commands require valid Atlassian credentials.
 */

// Create a contextualized logger for this file
const cliLogger = Logger.forContext('cli/atlassian.repositories.cli.ts');

// Log CLI initialization
cliLogger.debug('Bitbucket repositories CLI module initialized');

/**
 * Register Bitbucket Repositories CLI commands with the Commander program
 * @param program - The Commander program instance to register commands with
 * @throws Error if command registration fails
 */
function register(program: Command): void {
	const methodLogger = Logger.forContext(
		'cli/atlassian.repositories.cli.ts',
		'register',
	);
	methodLogger.debug('Registering Bitbucket Repositories CLI commands...');

	registerListRepositoriesCommand(program);
	registerGetRepositoryCommand(program);
	registerGetCommitHistoryCommand(program);

	methodLogger.debug('CLI commands registered successfully');
}

/**
 * Register the command for listing repositories within a workspace
 * @param program - The Commander program instance
 */
function registerListRepositoriesCommand(program: Command): void {
	program
		.command('ls-repos')
		.description(
			'List repositories within a specific Bitbucket workspace, with filtering and pagination.',
		)
		.requiredOption(
			'-w, --workspace-slug <slug>',
			'Workspace slug containing the repositories. Must be a valid workspace slug from your Bitbucket account. Example: "myteam"',
		)
		.option(
			'-q, --query <text>',
			'Query string to filter repositories by name or other properties (text search). Example: "api" for repositories with "api" in the name/description. If omitted, returns all repositories.',
		)
		.option(
			'-r, --role <string>',
			'Filter repositories by the authenticated user\'s role. Common values: "owner", "admin", "contributor", "member". If omitted, returns repositories of all roles.',
		)
		.option(
			'-s, --sort <string>',
			'Field to sort results by. Common values: "name", "created_on", "updated_on". Prefix with "-" for descending order. Example: "-updated_on" for most recently updated first.',
		)
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
				'cli/atlassian.repositories.cli.ts',
				'ls-repos',
			);
			try {
				actionLogger.debug('Processing command options:', options);

				// Validate workspace slug
				if (
					!options.workspaceSlug ||
					typeof options.workspaceSlug !== 'string' ||
					options.workspaceSlug.trim() === ''
				) {
					throw new Error(
						'Workspace slug is required and must be a valid slug string',
					);
				}

				// Map CLI options to controller format
				const controllerOptions: ListRepositoriesOptions = {
					workspaceSlug: options.workspaceSlug,
					query: options.query,
					role: options.role,
					sort: options.sort,
				};

				// Parse limit as number if provided
				if (options.limit) {
					const limit = parseInt(options.limit, 10);
					if (isNaN(limit) || limit < 1 || limit > 100) {
						throw new Error(
							'Limit must be a number between 1 and 100',
						);
					}
					controllerOptions.limit = limit;
				}

				// Add cursor if provided
				if (options.cursor) {
					controllerOptions.cursor = options.cursor;
				}

				actionLogger.debug(
					'Calling controller with options:',
					controllerOptions,
				);
				const result =
					await atlassianRepositoriesController.list(
						controllerOptions,
					);
				actionLogger.debug('API call completed, displaying results...');

				console.log(result.content);

				if (result.pagination) {
					console.log(
						formatPagination(
							result.pagination.count || 0,
							result.pagination.hasMore,
							result.pagination.nextCursor,
						),
					);
				}
			} catch (error) {
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
		.command('get-repo')
		.description(
			'Get detailed information about a specific Bitbucket repository using its slugs.',
		)
		.requiredOption(
			'-w, --workspace-slug <slug>',
			'Workspace slug containing the repository. Must be a valid workspace slug from your Bitbucket account. Example: "myteam"',
		)
		.requiredOption(
			'-r, --repo-slug <slug>',
			'Repository slug to retrieve. This must be a valid repository in the specified workspace. Example: "project-api"',
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.repositories.cli.ts',
				'get-repo',
			);
			try {
				actionLogger.debug('Processing command options:', options);

				// Validate workspace slug
				if (
					!options.workspaceSlug ||
					typeof options.workspaceSlug !== 'string' ||
					options.workspaceSlug.trim() === ''
				) {
					throw new Error(
						'Workspace slug is required and must be a valid slug string',
					);
				}

				// Validate repository slug
				if (
					!options.repoSlug ||
					typeof options.repoSlug !== 'string' ||
					options.repoSlug.trim() === ''
				) {
					throw new Error(
						'Repository slug is required and must be a valid slug string',
					);
				}

				// Map CLI options to controller format
				const params = {
					workspaceSlug: options.workspaceSlug,
					repoSlug: options.repoSlug,
				};

				actionLogger.debug('Calling controller with params:', params);
				const result =
					await atlassianRepositoriesController.get(params);
				actionLogger.debug('API call completed, displaying results...');

				console.log(result.content);
			} catch (error) {
				handleCliError(error);
			}
		});
}

/**
 * Register the command for retrieving commit history for a repository.
 * @param program - The Commander program instance
 */
function registerGetCommitHistoryCommand(program: Command): void {
	program
		.command('get-commit-history')
		.description(
			'Retrieve the commit history for a specific repository, with optional branch/path filtering.',
		)
		.requiredOption(
			'-w, --workspace-slug <slug>',
			'Workspace slug containing the repository.',
		)
		.requiredOption(
			'-r, --repo-slug <slug>',
			'Repository slug to retrieve history from.',
		)
		.option(
			'--rev, --revision <string>',
			'Optional branch, tag, or commit hash to start history from.',
		)
		.option(
			'-p, --path <string>',
			'Optional file path to filter commits by.',
		)
		.option(
			'-l, --limit <number>',
			'Maximum number of commits to return (1-100).',
		)
		.option(
			'-c, --cursor <string>',
			'Pagination cursor (page number) for the next set of results.',
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.repositories.cli.ts',
				'get-commit-history',
			);
			try {
				actionLogger.debug('Processing command options:', options);

				// Validate required slugs
				if (!options.workspaceSlug || !options.repoSlug) {
					throw new Error(
						'Workspace slug and repository slug are required.',
					);
				}

				// Map CLI options to controller format
				const identifier = {
					workspaceSlug: options.workspaceSlug,
					repoSlug: options.repoSlug,
				};
				const controllerOptions: GetCommitHistoryOptions = {};

				if (options.revision) {
					controllerOptions.revision = options.revision;
				}
				if (options.path) {
					controllerOptions.path = options.path;
				}
				if (options.limit) {
					const limit = parseInt(options.limit, 10);
					if (isNaN(limit) || limit < 1 || limit > 100) {
						throw new Error(
							'Limit must be a number between 1 and 100',
						);
					}
					controllerOptions.limit = limit;
				}
				if (options.cursor) {
					controllerOptions.cursor = options.cursor;
				}

				actionLogger.debug(
					'Calling controller with identifier:',
					identifier,
					'and options:',
					controllerOptions,
				);
				const result =
					await atlassianRepositoriesController.getCommitHistory(
						identifier,
						controllerOptions,
					);
				actionLogger.debug('API call completed, displaying results...');

				console.log(result.content);

				if (result.pagination) {
					console.log(
						formatPagination(
							result.pagination.count || 0,
							result.pagination.hasMore,
							result.pagination.nextCursor,
						),
					);
				}
			} catch (error) {
				handleCliError(error);
			}
		});
}

export default { register };
