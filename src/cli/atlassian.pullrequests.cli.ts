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
		.description('List Bitbucket pull requests with optional filtering')
		.requiredOption('-w, --workspace <string>', 'Workspace slug')
		.requiredOption('-r, --repo-slug <string>', 'Repository slug')
		.option(
			'-s, --state <string>',
			'Filter by state (OPEN, MERGED, DECLINED, SUPERSEDED)',
			'OPEN',
		)
		.option(
			'-l, --limit <number>',
			'Maximum number of pull requests to return',
			'25',
		)
		.option(
			'-p, --page <number>',
			'Page number for pagination (starts at 1)',
		)
		.action(async (options) => {
			const logPrefix =
				'[src/cli/atlassian.pullrequests.cli.ts@list-pull-requests]';
			try {
				logger.debug(
					`${logPrefix} Processing command options:`,
					options,
				);

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
					workspace: options.workspace,
					repoSlug: options.repoSlug,
					...(options.state && {
						state: options.state.toUpperCase() as PullRequestState,
					}),
					...(options.limit && {
						limit: parseInt(options.limit, 10),
					}),
					...(options.page && {
						page: parseInt(options.page, 10),
					}),
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
			'Get detailed information about a specific Bitbucket pull request',
		)
		.requiredOption('-w, --workspace <string>', 'Workspace slug')
		.requiredOption('-r, --repo-slug <string>', 'Repository slug')
		.requiredOption('-i, --id <number>', 'Pull request ID')
		.action(async (options) => {
			const logPrefix =
				'[src/cli/atlassian.pullrequests.cli.ts@get-pull-request]';
			try {
				logger.debug(
					`${logPrefix} Fetching details for pull request: ${options.workspace}/${options.repoSlug}/${options.id}`,
				);

				const pullRequestId = parseInt(options.id, 10);
				if (isNaN(pullRequestId)) {
					throw new Error('Pull request ID must be a number');
				}

				const result = await atlassianPullRequestsController.get(
					options.workspace,
					options.repoSlug,
					pullRequestId,
				);
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
