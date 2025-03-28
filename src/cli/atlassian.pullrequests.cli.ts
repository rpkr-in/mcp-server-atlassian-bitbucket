import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import atlassianPullRequestsController from '../controllers/atlassian.pullrequests.controller.js';
import { formatPagination } from '../utils/formatter.util.js';
import { ListPullRequestsOptions } from '../controllers/atlassian.pullrequests.types.js';

/**
 * CLI module for managing Bitbucket pull requests.
 * Provides commands for listing pull requests and retrieving pull request details.
 * All commands require valid Atlassian credentials.
 */

// Create a contextualized logger for this file
const cliLogger = Logger.forContext('cli/atlassian.pullrequests.cli.ts');

// Log CLI initialization
cliLogger.debug('Bitbucket pull requests CLI module initialized');

// Define interfaces for controller options
interface PullRequestControllerOptions {
	workspaceSlug: string;
	repoSlug: string;
	prId: string;
	limit?: number;
	cursor?: string;
	[key: string]: unknown;
}

/**
 * Register Bitbucket Pull Requests CLI commands with the Commander program
 * @param program - The Commander program instance to register commands with
 * @throws Error if command registration fails
 */
function register(program: Command): void {
	const methodLogger = Logger.forContext(
		'cli/atlassian.pullrequests.cli.ts',
		'register',
	);
	methodLogger.debug('Registering Bitbucket Pull Requests CLI commands...');

	registerListPullRequestsCommand(program);
	registerGetPullRequestCommand(program);
	registerListPullRequestCommentsCommand(program);

	methodLogger.debug('CLI commands registered successfully');
}

/**
 * Register the command for listing pull requests within a repository
 * @param program - The Commander program instance
 */
function registerListPullRequestsCommand(program: Command): void {
	program
		.command('list-pull-requests')
		.description(
			`List pull requests within a specific Bitbucket repository.

        PURPOSE: Discover pull requests in a repository and get their basic metadata, including title, state, author, source/destination branches, and reviewer information. Requires workspace and repository slugs.`,
		)
		.requiredOption(
			'-w, --workspace <slug>',
			'Workspace slug containing the repository',
		)
		.requiredOption(
			'-r, --repository <slug>',
			'Repository slug to list pull requests from',
		)
		.option(
			'-S, --status <status>',
			'Filter by pull request status: OPEN, MERGED, DECLINED, SUPERSEDED',
		)
		.option(
			'-q, --query <text>',
			'Filter pull requests by title, description, or other properties (simple text search, not query language)',
		)
		.option(
			'-l, --limit <number>',
			'Maximum number of pull requests to return (1-100)',
		)
		.option(
			'-c, --cursor <string>',
			'Pagination cursor for retrieving the next set of results',
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.pullrequests.cli.ts',
				'list-pull-requests',
			);
			try {
				actionLogger.debug('Processing command options:', options);

				// Map CLI options to controller format
				const controllerOptions: ListPullRequestsOptions = {
					workspaceSlug: options.workspace,
					repoSlug: options.repository,
					state: options.status,
					query: options.query,
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

				const result =
					await atlassianPullRequestsController.list(
						controllerOptions,
					);

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
 * Register the command for retrieving a specific Bitbucket pull request
 * @param program - The Commander program instance
 */
function registerGetPullRequestCommand(program: Command): void {
	program
		.command('get-pull-request')
		.description(
			`Get detailed information about a specific Bitbucket pull request.

        PURPOSE: Retrieve comprehensive metadata for a pull request, including its description, state, author, reviewers, branches, and links.`,
		)
		.requiredOption(
			'-w, --workspace <slug>',
			'Workspace slug containing the repository',
		)
		.requiredOption(
			'-r, --repository <slug>',
			'Repository slug containing the pull request',
		)
		.requiredOption(
			'-p, --pull-request <id>',
			'Pull request ID to retrieve',
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.pullrequests.cli.ts',
				'get-pull-request',
			);
			try {
				actionLogger.debug('Processing command options:', options);

				// Map CLI options to controller format
				const params = {
					workspaceSlug: options.workspace,
					repoSlug: options.repository,
					prId: options['pull-request'],
				};

				const result =
					await atlassianPullRequestsController.get(params);

				console.log(result.content);
			} catch (error) {
				handleCliError(error);
			}
		});
}

/**
 * Register the command for listing comments on a specific pull request
 * @param program - The Commander program instance
 */
function registerListPullRequestCommentsCommand(program: Command): void {
	program
		.command('list-pr-comments')
		.description(
			`List comments on a specific Bitbucket pull request.

        PURPOSE: View all review feedback, discussions, and task comments on a pull request to understand code review context without accessing the web UI.`,
		)
		.requiredOption(
			'-w, --workspace <slug>',
			'Workspace slug containing the repository',
		)
		.requiredOption(
			'-r, --repository <slug>',
			'Repository slug containing the pull request',
		)
		.requiredOption(
			'-p, --pull-request <id>',
			'Pull request ID to list comments from',
		)
		.option(
			'-l, --limit <number>',
			'Maximum number of comments to return (1-100)',
		)
		.option(
			'-c, --cursor <string>',
			'Pagination cursor for retrieving the next set of results',
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.pullrequests.cli.ts',
				'list-pr-comments',
			);
			try {
				actionLogger.debug('Processing command options:', options);

				// Map CLI options to controller format
				const controllerOptions: PullRequestControllerOptions = {
					workspaceSlug: options.workspace,
					repoSlug: options.repository,
					prId: options['pull-request'],
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

				const result =
					await atlassianPullRequestsController.listComments(
						controllerOptions,
					);

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
