import { Command } from 'commander';
import { logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import atlassianPullRequestsController from '../controllers/atlassian.pullrequests.controller.js';
import { formatPagination } from '../utils/formatter.util.js';
import { ListPullRequestsOptions } from '../controllers/atlassian.pullrequests.types.js';

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
 * Register the command for listing pull requests within a repository
 * @param program - The Commander program instance
 */
function registerListPullRequestsCommand(program: Command): void {
	program
		.command('list-pull-requests')
		.description(
			'List pull requests within a Bitbucket repository\n\n' +
				'Retrieves pull requests from the specified repository with filtering and pagination options.\n\n' +
				'Examples:\n' +
				'  $ list-pull-requests --workspace my-workspace --repository my-repo --state OPEN\n' +
				'  $ list-pull-requests --workspace my-workspace --repository my-repo --limit 50 --state MERGED\n' +
				'  $ list-pull-requests --workspace my-workspace --repository my-repo --query "title:feature"',
		)
		.requiredOption(
			'--workspace <slug>',
			'Workspace slug containing the repository',
		)
		.requiredOption(
			'--repository <slug>',
			'Repository slug to list pull requests from',
		)
		.option(
			'--state <state>',
			'Filter by pull request state: OPEN, MERGED, DECLINED, SUPERSEDED',
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
			const logPrefix =
				'[src/cli/atlassian.pullrequests.cli.ts@list-pull-requests]';
			try {
				logger.debug(
					`${logPrefix} Listing pull requests for repository: ${options.workspace}/${options.repository}`,
				);

				// Prepare filter options from command parameters
				const filterOptions: ListPullRequestsOptions = {
					workspaceSlug: options.workspace,
					repoSlug: options.repository,
					state: options.state?.toUpperCase() as ListPullRequestsOptions['state'],
					query: options.query,
				};

				// Validate workspace slug
				if (
					!options.workspace ||
					typeof options.workspace !== 'string' ||
					options.workspace.trim() === ''
				) {
					throw new Error(
						'Workspace slug must be a valid non-empty string',
					);
				}

				// Validate repository slug
				if (
					!options.repository ||
					typeof options.repository !== 'string' ||
					options.repository.trim() === ''
				) {
					throw new Error(
						'Repository slug must be a valid non-empty string',
					);
				}

				// Validate state if provided
				if (
					options.state &&
					!['OPEN', 'MERGED', 'DECLINED', 'SUPERSEDED'].includes(
						options.state.toUpperCase(),
					)
				) {
					throw new Error(
						'State must be one of: OPEN, MERGED, DECLINED, SUPERSEDED',
					);
				}

				// Apply pagination options if provided
				if (options.limit) {
					filterOptions.limit = parseInt(options.limit, 10);
				}

				if (options.cursor) {
					filterOptions.cursor = options.cursor;
				}

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
 * Register the command for retrieving a specific Bitbucket pull request
 * @param program - The Commander program instance
 */
function registerGetPullRequestCommand(program: Command): void {
	program
		.command('get-pull-request')
		.description(
			'Get detailed information about a specific Bitbucket pull request\n\n' +
				'Retrieves comprehensive details for a pull request including description, reviewers, and diff statistics.',
		)
		.requiredOption(
			'--workspace <slug>',
			'Workspace slug containing the repository',
		)
		.requiredOption(
			'--repository <slug>',
			'Repository slug containing the pull request',
		)
		.requiredOption('--pull-request <id>', 'Pull request ID to retrieve')
		.action(async (options) => {
			const logPrefix =
				'[src/cli/atlassian.pullrequests.cli.ts@get-pull-request]';
			try {
				logger.debug(
					`${logPrefix} Fetching details for pull request: ${options.workspace}/${options.repository}/${options.pullRequest}`,
				);

				// Validate workspace slug
				if (
					!options.workspace ||
					typeof options.workspace !== 'string' ||
					options.workspace.trim() === ''
				) {
					throw new Error(
						'Workspace slug must be a valid non-empty string',
					);
				}

				// Validate repository slug
				if (
					!options.repository ||
					typeof options.repository !== 'string' ||
					options.repository.trim() === ''
				) {
					throw new Error(
						'Repository slug must be a valid non-empty string',
					);
				}

				// Validate PR ID
				const prIdNum = parseInt(options.pullRequest, 10);
				if (isNaN(prIdNum) || prIdNum <= 0) {
					throw new Error(
						'Pull request ID must be a positive integer',
					);
				}

				const result = await atlassianPullRequestsController.get({
					workspaceSlug: options.workspace,
					repoSlug: options.repository,
					prId: options.pullRequest,
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
