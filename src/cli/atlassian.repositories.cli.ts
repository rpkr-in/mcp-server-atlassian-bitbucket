import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import atlassianRepositoriesController from '../controllers/atlassian.repositories.controller.js';
import { ListRepositoriesOptions } from '../controllers/atlassian.repositories.types.js';
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
 * Register Bitbucket Repositories CLI commands with the Commander program
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

	methodLogger.debug('CLI commands registered successfully');
}

/**
 * Register the command for listing repositories within a workspace
 * @param program - The Commander program instance
 */
function registerListRepositoriesCommand(program: Command): void {
	program
		.command('list-repositories')
		.description(
			`List repositories within a specific Bitbucket workspace.

        PURPOSE: Discover repositories within a given workspace, find their slugs, and get basic metadata like owner, description, and URLs. Requires the workspace slug as input.

        Use Case: Essential for finding the 'repoSlug' needed for pull request commands or 'get-repository'. Allows filtering by name, role, and sorting.

        Output: Formatted list of repositories including name, full name, owner, description, privacy status, dates, and URL. Supports filtering and sorting.

        Examples:
  $ mcp-atlassian-bitbucket list-repositories --workspace-slug my-team --limit 25
  $ mcp-atlassian-bitbucket list-repositories --workspace-slug my-team --query "backend-api" --role contributor
  $ mcp-atlassian-bitbucket list-repositories --workspace-slug my-team --sort "-updated_on" --cursor "next-page-token"`,
		)
		.requiredOption(
			'-w, --workspace-slug <slug>',
			'Workspace slug containing the repositories',
		)
		.option(
			'-q, --query <text>',
			'Filter repositories by name or other properties (simple text search, not query language)',
		)
		.option(
			'-r, --role <string>',
			'Filter repositories by the user\'s role (e.g., "owner", "admin", "contributor")',
		)
		.option(
			'-s, --sort <string>',
			'Field to sort results by (e.g., "name", "-updated_on")',
		)
		.option(
			'-l, --limit <number>',
			'Maximum number of repositories to return (1-100)',
		)
		.option(
			'-c, --cursor <string>',
			'Pagination cursor for retrieving the next set of results',
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.repositories.cli.ts',
				'list-repositories',
			);
			try {
				actionLogger.debug('Processing command options:', options);

				// Validate workspace slug
				if (
					!options.workspaceSlug ||
					typeof options.workspaceSlug !== 'string' ||
					options.workspaceSlug.trim() === ''
				) {
					throw new Error(
						'Workspace slug is required and must be a valid slug string',
					);
				}

				// Map CLI options to controller format
				const controllerOptions: ListRepositoriesOptions = {
					workspaceSlug: options.workspaceSlug,
					query: options.query,
					role: options.role,
					sort: options.sort,
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

				actionLogger.debug(
					'Calling controller with options:',
					controllerOptions,
				);
				const result =
					await atlassianRepositoriesController.list(
						controllerOptions,
					);
				actionLogger.debug('API call completed, displaying results...');

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
 * Register the command for retrieving a specific Bitbucket repository
 * @param program - The Commander program instance
 */
function registerGetRepositoryCommand(program: Command): void {
	program
		.command('get-repository')
		.description(
			`Get detailed information about a specific Bitbucket repository.

        PURPOSE: Retrieve comprehensive metadata for a repository, including its full description, owner, language, size, dates, and links.`,
		)
		.requiredOption(
			'-w, --workspace-slug <slug>',
			'Workspace slug containing the repository',
		)
		.requiredOption(
			'-r, --repo-slug <slug>',
			'Slug of the repository to retrieve',
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.repositories.cli.ts',
				'get-repository',
			);
			try {
				actionLogger.debug('Processing command options:', options);

				// Validate workspace slug
				if (
					!options.workspaceSlug ||
					typeof options.workspaceSlug !== 'string' ||
					options.workspaceSlug.trim() === ''
				) {
					throw new Error(
						'Workspace slug is required and must be a valid slug string',
					);
				}

				// Validate repository slug
				if (
					!options.repoSlug ||
					typeof options.repoSlug !== 'string' ||
					options.repoSlug.trim() === ''
				) {
					throw new Error(
						'Repository slug is required and must be a valid slug string',
					);
				}

				// Map CLI options to controller format
				const params = {
					workspaceSlug: options.workspaceSlug,
					repoSlug: options.repoSlug,
				};

				actionLogger.debug('Calling controller with params:', params);
				const result =
					await atlassianRepositoriesController.get(params);
				actionLogger.debug('API call completed, displaying results...');

				console.log(result.content);
			} catch (error) {
				handleCliError(error);
			}
		});
}

export default { register };
