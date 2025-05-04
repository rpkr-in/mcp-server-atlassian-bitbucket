import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import atlassianPullRequestsController from '../controllers/atlassian.pullrequests.controller.js';
import { formatPagination } from '../utils/formatter.util.js';

/**
 * CLI module for managing Bitbucket pull requests.
 * Provides commands for listing, retrieving, and manipulating pull requests.
 * All commands require valid Atlassian credentials.
 */

// Create a contextualized logger for this file
const cliLogger = Logger.forContext('cli/atlassian.pullrequests.cli.ts');

// Log CLI initialization
cliLogger.debug('Bitbucket pull requests CLI module initialized');

/**
 * Register Bitbucket pull requests CLI commands with the Commander program
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
	registerCreatePullRequestCommentCommand(program);
	registerCreatePullRequestCommand(program);

	methodLogger.debug('CLI commands registered successfully');
}

/**
 * Register the command for listing Bitbucket pull requests
 * @param program - The Commander program instance
 */
function registerListPullRequestsCommand(program: Command): void {
	program
		.command('ls-prs')
		.description(
			'List pull requests in a Bitbucket repository, with filtering and pagination.',
		)
		.requiredOption(
			'-w, --workspace-slug <slug>',
			'Workspace slug containing the repository. Must be a valid workspace slug from your Bitbucket account. Example: "myteam"',
		)
		.requiredOption(
			'-r, --repo-slug <slug>',
			'Repository slug containing the pull requests. Must be a valid repository in the specified workspace. Example: "project-api"',
		)
		.option(
			'-s, --state <state>',
			'Filter by pull request state: "OPEN", "MERGED", "DECLINED", or "SUPERSEDED". If omitted, returns pull requests in all states.',
		)
		.option(
			'-q, --query <string>',
			'Filter pull requests by query string. Searches pull request title and description.',
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
				'cli/atlassian.pullrequests.cli.ts',
				'ls-prs',
			);
			try {
				actionLogger.debug('Processing command options:', options);

				// Validate limit if provided
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
					repoSlug: options.repoSlug,
					state: options.state as
						| 'OPEN'
						| 'MERGED'
						| 'DECLINED'
						| 'SUPERSEDED'
						| undefined,
					query: options.query,
					limit: options.limit
						? parseInt(options.limit, 10)
						: undefined,
					cursor: options.cursor,
				};

				actionLogger.debug(
					'Fetching pull requests with filters:',
					filterOptions,
				);
				const result =
					await atlassianPullRequestsController.list(filterOptions);
				actionLogger.debug('Successfully retrieved pull requests');

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
				actionLogger.error('Operation failed:', error);
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
		.command('get-pr')
		.description(
			'Get detailed information about a specific Bitbucket pull request.',
		)
		.requiredOption(
			'-w, --workspace-slug <slug>',
			'Workspace slug containing the repository. Must be a valid workspace slug from your Bitbucket account. Example: "myteam"',
		)
		.requiredOption(
			'-r, --repo-slug <slug>',
			'Repository slug containing the pull request. Must be a valid repository in the specified workspace. Example: "project-api"',
		)
		.requiredOption(
			'-p, --pr-id <id>',
			'Numeric ID of the pull request to retrieve. Must be a valid pull request ID in the specified repository. Example: "42"',
		)
		.option(
			'-f, --full-diff',
			'Retrieve the full diff content instead of just the summary. Default: false',
			false,
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.pullrequests.cli.ts',
				'get-pr',
			);
			try {
				actionLogger.debug('Processing command options:', options);

				// Map CLI options to controller params
				const params = {
					workspaceSlug: options.workspaceSlug,
					repoSlug: options.repoSlug,
					prId: options.prId,
					fullDiff: options.fullDiff,
				};

				actionLogger.debug('Fetching pull request:', params);
				const result =
					await atlassianPullRequestsController.get(params);
				actionLogger.debug('Successfully retrieved pull request');

				console.log(result.content);
			} catch (error) {
				actionLogger.error('Operation failed:', error);
				handleCliError(error);
			}
		});
}

/**
 * Register the command for listing comments on a Bitbucket pull request
 * @param program - The Commander program instance
 */
function registerListPullRequestCommentsCommand(program: Command): void {
	program
		.command('ls-pr-comments')
		.description(
			'List comments on a specific Bitbucket pull request, with pagination.',
		)
		.requiredOption(
			'-w, --workspace-slug <slug>',
			'Workspace slug containing the repository. Must be a valid workspace slug from your Bitbucket account. Example: "myteam"',
		)
		.requiredOption(
			'-r, --repo-slug <slug>',
			'Repository slug containing the pull request. Must be a valid repository in the specified workspace. Example: "project-api"',
		)
		.requiredOption(
			'-p, --pr-id <id>',
			'Numeric ID of the pull request to retrieve comments from. Must be a valid pull request ID in the specified repository. Example: "42"',
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
				'cli/atlassian.pullrequests.cli.ts',
				'ls-pr-comments',
			);
			try {
				actionLogger.debug('Processing command options:', options);

				// Validate limit if provided
				if (options.limit) {
					const limit = parseInt(options.limit, 10);
					if (isNaN(limit) || limit <= 0) {
						throw new Error(
							'Invalid --limit value: Must be a positive integer.',
						);
					}
				}

				// Map CLI options to controller params
				const params = {
					workspaceSlug: options.workspaceSlug,
					repoSlug: options.repoSlug,
					prId: options.prId,
					limit: options.limit
						? parseInt(options.limit, 10)
						: undefined,
					cursor: options.cursor,
				};

				actionLogger.debug('Fetching pull request comments:', params);
				const result =
					await atlassianPullRequestsController.listComments(params);
				actionLogger.debug(
					'Successfully retrieved pull request comments',
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
				actionLogger.error('Operation failed:', error);
				handleCliError(error);
			}
		});
}

/**
 * Register the command for creating a comment on a Bitbucket pull request
 * @param program - The Commander program instance
 */
function registerCreatePullRequestCommentCommand(program: Command): void {
	program
		.command('add-pr-comment')
		.description('Add a comment to a specific Bitbucket pull request.')
		.requiredOption(
			'-w, --workspace-slug <slug>',
			'Workspace slug containing the repository. Must be a valid workspace slug from your Bitbucket account. Example: "myteam"',
		)
		.requiredOption(
			'-r, --repo-slug <slug>',
			'Repository slug containing the pull request. Must be a valid repository in the specified workspace. Example: "project-api"',
		)
		.requiredOption(
			'-p, --pr-id <id>',
			'Numeric ID of the pull request to add a comment to. Must be a valid pull request ID in the specified repository. Example: "42"',
		)
		.requiredOption(
			'-c, --content <text>',
			'The content of the comment to add to the pull request. Can include markdown formatting.',
		)
		.option(
			'--path <file-path>',
			'Optional: The file path to add an inline comment to.',
		)
		.option(
			'--line <line-number>',
			'Optional: The line number to add the inline comment to.',
			parseInt,
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.pullrequests.cli.ts',
				'create-pr-comment',
			);
			try {
				actionLogger.debug('Processing command options:', options);

				// Validate line number if provided
				if (options.line && isNaN(options.line)) {
					throw new Error('Line number must be a valid integer');
				}

				// Build parameters object
				const params = {
					workspaceSlug: options.workspaceSlug,
					repoSlug: options.repoSlug,
					prId: options.prId,
					content: options.content,
				};

				// Add inline comment details if both path and line are provided
				if (options.path && options.line) {
					Object.assign(params, {
						inline: {
							path: options.path,
							line: options.line,
						},
					});
				} else if (options.path || options.line) {
					throw new Error(
						'Both --path and --line are required for inline comments',
					);
				}

				actionLogger.debug('Creating pull request comment:', {
					...params,
					content: '(content length: ' + options.content.length + ')',
				});
				const result =
					await atlassianPullRequestsController.createComment(params);
				actionLogger.debug('Successfully created pull request comment');

				console.log(result.content);
			} catch (error) {
				actionLogger.error('Operation failed:', error);
				handleCliError(error);
			}
		});
}

/**
 * Register the command for creating a new Bitbucket pull request
 * @param program - The Commander program instance
 */
function registerCreatePullRequestCommand(program: Command): void {
	program
		.command('create-pr')
		.description('Create a new pull request in a Bitbucket repository.')
		.requiredOption(
			'-w, --workspace-slug <slug>',
			'Workspace slug containing the repository. Must be a valid workspace slug from your Bitbucket account. Example: "myteam"',
		)
		.requiredOption(
			'-r, --repo-slug <slug>',
			'Repository slug to create the pull request in. Must be a valid repository in the specified workspace. Example: "project-api"',
		)
		.requiredOption(
			'-t, --title <title>',
			'Title for the pull request. Example: "Add new feature"',
		)
		.requiredOption(
			'-s, --source-branch <branch>',
			'Source branch name (the branch containing your changes). Example: "feature/new-login"',
		)
		.option(
			'-d, --destination-branch <branch>',
			'Destination branch name (the branch you want to merge into, defaults to main). Example: "develop"',
		)
		.option(
			'--description <text>',
			'Optional description for the pull request.',
		)
		.option(
			'--close-source-branch',
			'Whether to close the source branch after the pull request is merged. Default: false',
			false,
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.pullrequests.cli.ts',
				'create-pr',
			);
			try {
				actionLogger.debug('Processing command options:', options);

				// Map CLI options to controller params
				const params = {
					workspaceSlug: options.workspaceSlug,
					repoSlug: options.repoSlug,
					title: options.title,
					sourceBranch: options.sourceBranch,
					destinationBranch: options.destinationBranch,
					description: options.description,
					closeSourceBranch: options.closeSourceBranch,
				};

				actionLogger.debug('Creating pull request:', {
					...params,
					description: options.description
						? '(description provided)'
						: '(no description)',
				});
				const result =
					await atlassianPullRequestsController.create(params);
				actionLogger.debug('Successfully created pull request');

				console.log(result.content);
			} catch (error) {
				actionLogger.error('Operation failed:', error);
				handleCliError(error);
			}
		});
}

export default { register };
