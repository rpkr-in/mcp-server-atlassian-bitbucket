import { Command } from 'commander';
import { logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import atlassianPullRequestsController from '../controllers/atlassian.pullrequests.controller.js';
import { ListPullRequestsOptions } from '../controllers/atlassian.pullrequests.type.js';
import { PullRequestState } from '../services/vendor.atlassian.pullrequests.types.js';

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
			'List Bitbucket pull requests with optional filtering\n\n  Retrieves pull requests from a specific repository with filtering and pagination options.',
		)
		.argument('<workspace>', 'Workspace slug containing the repository')
		.argument('<repo-slug>', 'Repository slug to list pull requests from')
		.option(
			'-s, --state <string>',
			'Filter pull requests by state. Options: "OPEN" (active PRs), "MERGED" (completed PRs), "DECLINED" (rejected PRs), or "SUPERSEDED" (replaced PRs). If omitted, defaults to showing all states.',
			'OPEN',
		)
		.option(
			'-l, --limit <number>',
			'Maximum number of pull requests to return (1-100). Use this to control the response size. If omitted, defaults to 25.',
			'25',
		)
		.option(
			'-c, --cursor <string>',
			'Pagination cursor for retrieving the next set of results. Obtain this value from the previous response when more results are available.',
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

				console.log(result.content);
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
