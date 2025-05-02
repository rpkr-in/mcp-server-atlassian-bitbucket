import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import atlassianPullRequestsController from '../controllers/atlassian.pullrequests.controller.js';
import { formatPagination } from '../utils/formatter.util.js';
import {
	ListPullRequestsOptions,
	GetPullRequestOptions,
} from '../controllers/atlassian.pullrequests.types.js';

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
 * Register the command for creating a pull request
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
			'Repository slug to create the pull request in. This must be a valid repository in the specified workspace. Example: "project-api"',
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

				// Call controller
				const result = await atlassianPullRequestsController.create({
					workspaceSlug: options.workspaceSlug,
					repoSlug: options.repoSlug,
					title: options.title,
					sourceBranch: options.sourceBranch,
					destinationBranch: options.destinationBranch,
					description: options.description,
					closeSourceBranch: options.closeSourceBranch,
				});

				console.log(result.content);
			} catch (error) {
				handleCliError(error);
			}
		});
}

/**
 * Register pull request commands with the Commander program
 * @param program - The Commander program instance
 */
export function register(program: Command): void {
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
 * Register the command for listing pull requests within a repository
 * @param program - The Commander program instance
 */
function registerListPullRequestsCommand(program: Command): void {
	program
		.command('ls-prs')
		.description(
			'List pull requests within a specific Bitbucket repository, with filtering and pagination.',
		)
		.requiredOption(
			'-w, --workspace-slug <slug>',
			'Workspace slug containing the repository. Must be a valid workspace slug from your Bitbucket account. Example: "myteam"',
		)
		.requiredOption(
			'-r, --repo-slug <slug>',
			'Repository slug containing the pull requests. This must be a valid repository in the specified workspace. Example: "project-api"',
		)
		.option(
			'-S, --state <state>',
			'Filter pull requests by state. Options: "OPEN" (active PRs), "MERGED" (completed PRs), "DECLINED" (rejected PRs), or "SUPERSEDED" (replaced PRs). If omitted, defaults to showing all states.',
		)
		.option(
			'-q, --query <text>',
			'Filter pull requests by title, description, or author (text search). Uses Bitbucket query syntax.',
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
				'cli/atlassian.pullrequests.cli.ts',
				'ls-prs',
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
		.command('get-pr')
		.description(
			'Get detailed information about a specific Bitbucket pull request using its ID.',
		)
		.requiredOption(
			'-w, --workspace-slug <slug>',
			'Workspace slug containing the repository. Must be a valid workspace slug from your Bitbucket account. Example: "myteam"',
		)
		.requiredOption(
			'-r, --repo-slug <slug>',
			'Repository slug containing the pull request. This must be a valid repository in the specified workspace. Example: "project-api"',
		)
		.requiredOption(
			'-p, --pr-id <id>',
			'Numeric ID of the pull request to retrieve as a string. Must be a valid pull request ID in the specified repository. Example: "42"',
		)
		.option(
			'--full-diff',
			'Optional: Retrieve the full diff instead of summary',
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.pullrequests.cli.ts',
				'get-pr',
			);
			try {
				actionLogger.debug('Processing command options:', options);

				// Map CLI options to controller format
				const params: GetPullRequestOptions = {
					workspaceSlug: options.workspaceSlug,
					repoSlug: options.repoSlug,
					prId: options.prId,
					fullDiff: options.fullDiff,
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
			'Repository slug containing the pull request. This must be a valid repository in the specified workspace. Example: "project-api"',
		)
		.requiredOption(
			'-p, --pr-id <id>',
			'Numeric ID of the pull request to retrieve comments from as a string. Must be a valid pull request ID in the specified repository. Example: "42"',
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
				'cli/atlassian.pullrequests.cli.ts',
				'ls-pr-comments',
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
 * Register the command for creating a comment on a pull request
 * @param program - The Commander program instance
 */
function registerCreatePullRequestCommentCommand(program: Command): void {
	program
		.command('create-pr-comment')
		.description(
			'Create a comment on a specific Bitbucket pull request. Supports inline comments.',
		)
		.requiredOption(
			'-w, --workspace-slug <slug>',
			'Workspace slug containing the repository. Must be a valid workspace slug from your Bitbucket account. Example: "myteam"',
		)
		.requiredOption(
			'-r, --repo-slug <slug>',
			'Repository slug containing the pull request. This must be a valid repository in the specified workspace. Example: "project-api"',
		)
		.requiredOption(
			'-p, --pr-id <id>',
			'Numeric ID of the pull request to add a comment to as a string. Must be a valid pull request ID in the specified repository. Example: "42"',
		)
		.requiredOption(
			'-c, --content <text>',
			'The content of the comment to add to the pull request. Can include markdown formatting.',
		)
		.option('--file <path>', 'The file path to add the comment to.')
		.option(
			'--line <number>',
			'The line number to add the comment to.',
			(val) => parseInt(val, 10),
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.pullrequests.cli.ts',
				'create-pr-comment',
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

				// Call renamed controller function
				const result =
					await atlassianPullRequestsController.createComment({
						workspaceSlug: options.workspaceSlug,
						repoSlug: options.repoSlug,
						prId: options.prId,
						content: options.content,
						inline,
					});

				console.log(result.content);
			} catch (error) {
				handleCliError(error);
			}
		});
}

export default { register };
