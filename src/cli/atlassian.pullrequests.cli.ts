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
	registerAddPullRequestCommentCommand(program);

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
			'-w, --workspace-slug <slug>',
			'Workspace slug containing the repository',
		)
		.requiredOption(
			'-r, --repo-slug <slug>',
			'Repository slug to list pull requests from',
		)
		.option(
			'-S, --state <state>',
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
			const actionLogger = Logger.forContext(
				'cli/atlassian.pullrequests.cli.ts',
				'list-pull-requests',
			);
			try {
				actionLogger.debug('Processing command options:', options);

				// Map CLI options to controller format
				const controllerOptions: ListPullRequestsOptions = {
					workspaceSlug: options.workspaceSlug,
					repoSlug: options.repoSlug,
					state: options.state,
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
			'-w, --workspace-slug <slug>',
			'Workspace slug containing the repository',
		)
		.requiredOption(
			'-r, --repo-slug <slug>',
			'Repository slug containing the pull request',
		)
		.requiredOption('-p, --pr-id <id>', 'Pull request ID to retrieve')
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.pullrequests.cli.ts',
				'get-pull-request',
			);
			try {
				actionLogger.debug('Processing command options:', options);

				// Map CLI options to controller format
				const params = {
					workspaceSlug: options.workspaceSlug,
					repoSlug: options.repoSlug,
					prId: options.prId,
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
			'-w, --workspace-slug <slug>',
			'Workspace slug containing the repository',
		)
		.requiredOption(
			'-r, --repo-slug <slug>',
			'Repository slug containing the pull request',
		)
		.requiredOption(
			'-p, --pr-id <id>',
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
					workspaceSlug: options.workspaceSlug,
					repoSlug: options.repoSlug,
					prId: options.prId,
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

/**
 * Register the command for adding a comment to a pull request
 * @param program - The Commander program instance
 */
function registerAddPullRequestCommentCommand(program: Command): void {
	program
		.command('add-pr-comment')
		.description(
			`Add a comment to a specific Bitbucket pull request.

        PURPOSE: Create comments on a pull request to provide feedback, ask questions, or communicate with other reviewers/developers. Supports both general PR comments and inline code comments.

        EXAMPLES:
        $ mcp-atlassian-bitbucket add-pr-comment -w workspace-slug -r repo-slug -p 1 -c "This looks good to merge!"
        $ mcp-atlassian-bitbucket add-pr-comment -w workspace-slug -r repo-slug -p 1 -c "Consider using a const here" --file src/utils.ts --line 42`,
		)
		.requiredOption(
			'-w, --workspace-slug <slug>',
			'Workspace slug containing the repository',
		)
		.requiredOption(
			'-r, --repo-slug <slug>',
			'Repository slug containing the pull request',
		)
		.requiredOption('-p, --pr-id <id>', 'Pull request ID to comment on')
		.requiredOption('-c, --content <text>', 'Content of the comment to add')
		.option(
			'--file <path>',
			'File path for inline comments (requires --line)',
		)
		.option(
			'--line <number>',
			'Line number for inline comments (requires --file)',
			(val) => parseInt(val, 10),
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.pullrequests.cli.ts',
				'add-pr-comment',
			);
			try {
				actionLogger.debug('Processing command options:', options);

				// Validate inline comment options
				if (
					(options.file && !options.line) ||
					(!options.file && options.line)
				) {
					throw new Error(
						'Both --file and --line must be provided together for inline comments',
					);
				}

				// Build inline comment params if needed
				const inline =
					options.file && options.line
						? { path: options.file, line: options.line }
						: undefined;

				// Call controller
				const result = await atlassianPullRequestsController.addComment(
					{
						workspaceSlug: options.workspaceSlug,
						repoSlug: options.repoSlug,
						prId: options.prId,
						content: options.content,
						inline,
					},
				);

				console.log(result.content);
			} catch (error) {
				handleCliError(error);
			}
		});
}

export default { register };
