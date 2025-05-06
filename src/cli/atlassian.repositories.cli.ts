import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import atlassianRepositoriesController from '../controllers/atlassian.repositories.controller.js';
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
 * Register Bitbucket repositories CLI commands with the Commander program
 *
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
	registerAddBranchCommand(program);

	methodLogger.debug('CLI commands registered successfully');
}

/**
 * Register the command for listing Bitbucket repositories in a workspace
 *
 * @param program - The Commander program instance
 */
function registerListRepositoriesCommand(program: Command): void {
	program
		.command('ls-repos')
		.description(
			'List repositories in a Bitbucket workspace, with filtering and pagination.',
		)
		.requiredOption(
			'-w, --workspace-slug <slug>',
			'Workspace slug containing the repositories. Must be a valid workspace slug from your Bitbucket account. Example: "myteam"',
		)
		.option(
			'-q, --query <string>',
			'Filter repositories by this query string. Searches repository name and description.',
		)
		.option(
			'-k, --project-key <key>',
			'Filter repositories belonging to the specified project key. Example: "PROJ"',
		)
		.option(
			'-r, --role <string>',
			'Filter repositories where the authenticated user has the specified role or higher. Valid roles: `owner`, `admin`, `contributor`, `member`. Note: `member` typically includes all accessible repositories.',
		)
		.option(
			'-s, --sort <string>',
			'Sort repositories by this field. Examples: "name", "-updated_on" (default), "size".',
		)
		.option(
			'-l, --limit <number>',
			'Maximum number of items to return (1-100). Defaults to 25 if omitted.',
		)
		.option(
			'-c, --cursor <string>',
			'Pagination cursor for retrieving the next set of results.',
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.repositories.cli.ts',
				'ls-repos',
			);
			try {
				actionLogger.debug('Processing command options:', options);

				// Validate options
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
					workspaceSlug: options.workspaceSlug,
					query: options.query,
					projectKey: options.projectKey,
					role: options.role,
					sort: options.sort,
					limit: options.limit
						? parseInt(options.limit, 10)
						: undefined,
					cursor: options.cursor,
				};

				actionLogger.debug(
					'Fetching repositories with filters:',
					filterOptions,
				);
				const result =
					await atlassianRepositoriesController.list(filterOptions);
				actionLogger.debug('Successfully retrieved repositories');

				console.log(result.content);

				// Display pagination information if available
				if (result.pagination) {
					console.log('\n' + formatPagination(result.pagination));
				}
			} catch (error) {
				actionLogger.error('Operation failed:', error);
				handleCliError(error);
			}
		});
}

/**
 * Register the command for retrieving details of a specific Bitbucket repository
 *
 * @param program - The Commander program instance
 */
function registerGetRepositoryCommand(program: Command): void {
	program
		.command('get-repo')
		.description(
			'Get detailed information about a specific Bitbucket repository.',
		)
		.requiredOption(
			'-w, --workspace-slug <slug>',
			'Workspace slug containing the repository. Must be a valid workspace slug from your Bitbucket account. Example: "myteam"',
		)
		.requiredOption(
			'-r, --repo-slug <slug>',
			'Repository slug to retrieve. Must be a valid repository slug in the specified workspace. Example: "project-api"',
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.repositories.cli.ts',
				'get-repo',
			);
			try {
				actionLogger.debug(
					`Fetching repository: ${options.workspaceSlug}/${options.repoSlug}`,
				);

				const result = await atlassianRepositoriesController.get({
					workspaceSlug: options.workspaceSlug,
					repoSlug: options.repoSlug,
				});

				console.log(result.content);

				// No pagination footer needed for 'get' commands
			} catch (error) {
				actionLogger.error('Operation failed:', error);
				handleCliError(error);
			}
		});
}

/**
 * Register the command for retrieving commit history of a Bitbucket repository
 *
 * @param program - The Commander program instance
 */
function registerGetCommitHistoryCommand(program: Command): void {
	program
		.command('get-commit-history')
		.description('Get commit history for a Bitbucket repository.')
		.requiredOption(
			'-w, --workspace-slug <slug>',
			'Workspace slug containing the repository. Must be a valid workspace slug from your Bitbucket account. Example: "myteam"',
		)
		.requiredOption(
			'-r, --repo-slug <slug>',
			'Repository slug to retrieve commit history from. Must be a valid repository slug in the specified workspace. Example: "project-api"',
		)
		.option(
			'--revision <branch-or-tag>',
			'Filter commits by a specific branch, tag, or commit hash.',
		)
		.option(
			'--path <file-path>',
			'Filter commits to those that affect this specific file path.',
		)
		.option(
			'-l, --limit <number>',
			'Maximum number of commits to return (1-100). Defaults to 25 if omitted.',
		)
		.option(
			'-c, --cursor <string>',
			'Pagination cursor for retrieving the next set of results.',
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.repositories.cli.ts',
				'get-commit-history',
			);
			try {
				actionLogger.debug('Processing command options:', options);

				// Validate options
				if (options.limit) {
					const limit = parseInt(options.limit, 10);
					if (isNaN(limit) || limit <= 0) {
						throw new Error(
							'Invalid --limit value: Must be a positive integer.',
						);
					}
				}

				// Map CLI options to controller params
				const requestOptions = {
					workspaceSlug: options.workspaceSlug,
					repoSlug: options.repoSlug,
					revision: options.revision,
					path: options.path,
					limit: options.limit
						? parseInt(options.limit, 10)
						: undefined,
					cursor: options.cursor,
				};

				actionLogger.debug(
					'Fetching commit history with options:',
					requestOptions,
				);
				const result =
					await atlassianRepositoriesController.getCommitHistory(
						requestOptions,
					);
				actionLogger.debug('Successfully retrieved commit history');

				console.log(result.content);

				// Display pagination information if available
				if (result.pagination) {
					console.log('\n' + formatPagination(result.pagination));
				}
			} catch (error) {
				actionLogger.error('Operation failed:', error);
				handleCliError(error);
			}
		});
}

/**
 * Register the command for adding a branch to a repository
 * @param program - The Commander program instance
 */
function registerAddBranchCommand(program: Command): void {
	program
		.command('add-branch')
		.description('Add a new branch in a Bitbucket repository.')
		.requiredOption(
			'-w, --workspace-slug <slug>',
			'Workspace slug containing the repository.',
		)
		.requiredOption(
			'-r, --repo-slug <slug>',
			'Repository slug where the branch will be created.',
		)
		.requiredOption(
			'-n, --new-branch-name <n>',
			'The name for the new branch.',
		)
		.requiredOption(
			'-s, --source-branch-or-commit <target>',
			'The name of the existing branch or a full commit hash to branch from.',
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.repositories.cli.ts',
				'add-branch',
			);
			try {
				actionLogger.debug('Processing command options:', options);

				// Map CLI options to controller params
				const requestOptions = {
					workspaceSlug: options.workspaceSlug,
					repoSlug: options.repoSlug,
					newBranchName: options.newBranchName,
					sourceBranchOrCommit: options.sourceBranchOrCommit,
				};

				actionLogger.debug(
					'Creating branch with options:',
					requestOptions,
				);
				const result =
					await atlassianRepositoriesController.createBranch(
						requestOptions,
					);
				actionLogger.debug('Successfully created branch');

				console.log(result.content);
			} catch (error) {
				actionLogger.error('Operation failed:', error);
				handleCliError(error);
			}
		});
}

export default { register };
