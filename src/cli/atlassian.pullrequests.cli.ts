import { Command } from 'commander';
import { logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import atlassianPullRequestsController from '../controllers/atlassian.pullrequests.controller.js';
import { formatPagination } from '../utils/formatter.util.js';
import {
	ListPullRequestsOptions,
	ListPullRequestCommentsOptions,
} from '../controllers/atlassian.pullrequests.types.js';

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
	registerListPullRequestCommentsCommand(program);

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
			`List pull requests within a specific Bitbucket repository.

        PURPOSE: Discover pull requests within a given repository, find their IDs, and get basic metadata like title, state, author, and branches. Requires workspace and repository slugs.

        Use Case: Essential for finding the 'prId' needed for 'get-pull-request'. Shows all PR states by default, but allows filtering by state (OPEN, MERGED, etc.) or text query.

        Output: Formatted list of pull requests including ID, title, state, author, branches, description snippet, and URL. Supports filtering and sorting.

        Examples:
  $ mcp-bitbucket list-pull-requests --workspace my-team --repository backend-api
  $ mcp-bitbucket list-pull-requests --workspace my-team --repository backend-api --state OPEN
  $ mcp-bitbucket list-pull-requests --workspace my-team --repository backend-api --limit 50 --state MERGED
  $ mcp-bitbucket list-pull-requests --workspace my-team --repository backend-api --query "bugfix" --cursor "next-page-token"`,
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
			`Get detailed information about a specific Bitbucket pull request using its workspace, repository, and PR ID.

        PURPOSE: Retrieve comprehensive details for a *known* pull request, including its description, state, author, reviewers, branches, and links to diffs/commits. Requires workspace slug, repository slug, and pull request ID.

        Use Case: Essential for understanding the full context of a specific PR identified via 'list-pull-requests' or prior knowledge.

        Output: Formatted details of the specified pull request. Fetches all available details by default.

        Examples:
  $ mcp-bitbucket get-pull-request --workspace my-team --repository backend-api --pull-request 42`,
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

/**
 * Register the command for listing comments on a specific pull request
 * @param program - The Commander program instance
 */
function registerListPullRequestCommentsCommand(program: Command): void {
	program
		.command('list-pr-comments')
		.description(
			`List comments on a specific Bitbucket pull request.

        PURPOSE: View all review feedback, discussions, and task comments on a pull request to understand code review context without accessing the web UI.

        Use Case: Essential for understanding reviewer feedback, code discussions, and decision rationale. Shows both general comments and inline code comments with file/line context.

        Output: Formatted list of comments including author, timestamp, content, and inline code context. Supports pagination for PRs with many comments.

        Examples:
  $ mcp-bitbucket list-pr-comments --workspace my-team --repository backend-api --pull-request 123
  $ mcp-bitbucket list-pr-comments --workspace my-team --repository backend-api --pull-request 123 --limit 50
  $ mcp-bitbucket list-pr-comments --workspace my-team --repository backend-api --pull-request 123 --cursor "next-page-token"`,
		)
		.requiredOption(
			'--workspace <slug>',
			'Workspace slug containing the repository',
		)
		.requiredOption(
			'--repository <slug>',
			'Repository slug containing the pull request',
		)
		.requiredOption(
			'--pull-request <id>',
			'Pull request ID to retrieve comments for',
		)
		.option(
			'-l, --limit <number>',
			'Maximum number of comments to return (1-100)',
		)
		.option(
			'-c, --cursor <string>',
			'Pagination cursor for retrieving the next set of results',
		)
		.option(
			'-S, --sort <string>',
			'Field to sort results by (e.g., "created_on", "-updated_on")',
		)
		.action(async (options) => {
			const logPrefix =
				'[src/cli/atlassian.pullrequests.cli.ts@list-pr-comments]';
			try {
				logger.debug(
					`${logPrefix} Listing comments for pull request: ${options.workspace}/${options.repository}/${options.pullRequest}`,
				);

				const commentOptions: ListPullRequestCommentsOptions = {
					workspaceSlug: options.workspace,
					repoSlug: options.repository,
					prId: options.pullRequest,
					...(options.limit && {
						limit: parseInt(options.limit, 10),
					}),
					...(options.cursor && { cursor: options.cursor }),
					...(options.sort && { sort: options.sort }),
				};

				logger.debug(
					`${logPrefix} Fetching comments with options:`,
					commentOptions,
				);

				const result =
					await atlassianPullRequestsController.listComments(
						commentOptions,
					);

				logger.debug(
					`${logPrefix} Successfully retrieved pull request comments`,
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

export default { register };
