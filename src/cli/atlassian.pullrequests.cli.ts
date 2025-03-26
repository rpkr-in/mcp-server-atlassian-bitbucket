import { Command } from 'commander';
import { logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import atlassianPullRequestsController from '../controllers/atlassian.pullrequests.controller.js';
import { ListPullRequestsOptions } from '../controllers/atlassian.pullrequests.type.js';
import { PullRequestState } from '../services/vendor.atlassian.pullrequests.types.js';
import { formatHeading, formatPagination } from '../utils/formatter.util.js';

/**
 * CLI module for managing Bitbucket pull requests.
 * Provides commands for listing pull requests and retrieving pull request details.
 * All commands require valid Atlassian credentials.
 */

/**
 * Register Bitbucket Pull Requests CLI commands with the Commander program
 * @param program - The Commander program instance to register commands with
 * @throws Error if command registration fails
 */
function register(program: Command): void {
	const logPrefix = '[src/cli/atlassian.pullrequests.cli.ts@register]';
	logger.debug(
		`${logPrefix} Registering Bitbucket Pull Requests CLI commands...`,
	);

	registerListPullRequestsCommand(program);
	registerGetPullRequestCommand(program);

	logger.debug(`${logPrefix} CLI commands registered successfully`);
}

/**
 * Register the command for listing Bitbucket pull requests
 * @param program - The Commander program instance
 */
function registerListPullRequestsCommand(program: Command): void {
	program
		.command('list-pull-requests')
		.description(
			'List Bitbucket pull requests with optional filtering\n\n' +
				'Retrieves pull requests from a specific repository with filtering and pagination options.\n\n' +
				'Examples:\n' +
				'  $ list-pull-requests my-workspace my-repo --state OPEN\n' +
				'  $ list-pull-requests my-workspace my-repo --limit 50 --state MERGED\n' +
				'  $ list-pull-requests my-workspace my-repo --filter "title:feature"',
		)
		.argument('<workspace>', 'Workspace slug containing the repository')
		.argument('<repo-slug>', 'Repository slug to list pull requests from')
		.option(
			'-l, --limit <number>',
			'Maximum number of items to return (1-100)',
			'25',
		)
		.option(
			'-c, --cursor <string>',
			'Pagination cursor for retrieving the next set of results',
		)
		.option(
			'-f, --filter <string>',
			'Filter pull requests by title, description, or author',
		)
		.option(
			'-s, --state <string>',
			'Filter by state: OPEN, MERGED, DECLINED, or SUPERSEDED',
			'OPEN',
		)
		.action(async (workspace, repoSlug, options) => {
			const logPrefix =
				'[src/cli/atlassian.pullrequests.cli.ts@list-pull-requests]';
			try {
				logger.debug(`${logPrefix} Processing command options:`, {
					workspace,
					repoSlug,
					...options,
				});

				// Validate state option
				const validStates = [
					'OPEN',
					'MERGED',
					'DECLINED',
					'SUPERSEDED',
				];
				if (
					options.state &&
					!validStates.includes(options.state.toUpperCase())
				) {
					throw new Error(
						`Invalid state value. Must be one of: ${validStates.join(
							', ',
						)}`,
					);
				}

				const filterOptions: ListPullRequestsOptions = {
					workspace,
					repoSlug,
					...(options.state && {
						state: options.state.toUpperCase() as PullRequestState,
					}),
					...(options.limit && {
						limit: parseInt(options.limit, 10),
					}),
					...(options.cursor && { cursor: options.cursor }),
					...(options.filter && { filter: options.filter }),
				};

				logger.debug(
					`${logPrefix} Fetching pull requests with filters:`,
					filterOptions,
				);
				const result =
					await atlassianPullRequestsController.list(filterOptions);
				logger.debug(
					`${logPrefix} Successfully retrieved pull requests`,
				);

				// Print the main content
				console.log(formatHeading('Pull Requests', 2));
				console.log(result.content);

				// Print pagination information if available
				if (result.pagination) {
					console.log(
						'\n' +
							formatPagination(
								result.pagination.count || 0,
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
 * Register the command for retrieving a specific Bitbucket pull request
 * @param program - The Commander program instance
 */
function registerGetPullRequestCommand(program: Command): void {
	program
		.command('get-pull-request')
		.description(
			'Get detailed information about a specific Bitbucket pull request\n\n  Retrieves comprehensive details for a pull request including description, comments, and branch information.',
		)
		.argument('<workspace>', 'Workspace slug containing the repository')
		.argument('<repo-slug>', 'Repository slug containing the pull request')
		.argument('<id>', 'Pull request ID to retrieve')
		.action(async (workspace, repoSlug, id) => {
			const logPrefix =
				'[src/cli/atlassian.pullrequests.cli.ts@get-pull-request]';
			try {
				logger.debug(
					`${logPrefix} Fetching details for pull request: ${workspace}/${repoSlug}/${id}`,
				);

				const pullRequestId = parseInt(id, 10);
				if (isNaN(pullRequestId)) {
					throw new Error('Pull request ID must be a number');
				}

				const result = await atlassianPullRequestsController.get({
					workspace,
					repoSlug,
					pullRequestId: id,
				});
				logger.debug(
					`${logPrefix} Successfully retrieved pull request details`,
				);

				console.log(result.content);
			} catch (error) {
				logger.error(`${logPrefix} Operation failed:`, error);
				handleCliError(error);
			}
		});
}

export default { register };
