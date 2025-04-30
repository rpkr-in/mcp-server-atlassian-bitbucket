import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import { formatPagination } from '../utils/formatter.util.js';

import atlassianSearchController from '../controllers/atlassian.search.controller.js';

const cliLogger = Logger.forContext('cli/atlassian.search.cli.ts');

/**
 * Register Atlassian Search commands
 *
 * @param {Command} program - Commander program instance
 */
function register(program: Command) {
	const methodLogger = cliLogger.forMethod('register');
	methodLogger.debug('Registering Atlassian search commands...');

	// Register the search command
	program
		.command('search')
		.description(
			'Search for Bitbucket content across various scopes within a workspace.',
		)
		.requiredOption(
			'-w, --workspace-slug <slug>',
			'Workspace slug containing the content to search. Must be a valid workspace slug from your Bitbucket account. Example: "myteam"',
		)
		.option(
			'-r, --repo-slug <slug>',
			'Repository slug to search within. Required for pull requests search. Optional for code search (limits search to the specified repo). Example: "backend-api"',
		)
		.option(
			'-q, --query <query>',
			'Search query to filter results by name, description, or code content. Required for code search. Use this to find specific content matching certain terms.',
		)
		.option(
			'-s, --scope <scope>',
			'Scope of the search. Options include: "repositories" (search only repositories), "pullrequests" (search only pull requests), "commits" (search only commits), "code" (search file content), or "all" (search both repositories and pull requests). Defaults to "all" if not specified.',
		)
		.option(
			'-l, --limit <number>',
			'Maximum number of items to return (1-100). Use this to control the response size. Useful for pagination or when you only need a few results.',
		)
		.option(
			'-c, --cursor <string>',
			'Pagination cursor for retrieving the next set of results. For repositories and pull requests, this is a cursor string. For code search, this is a page number. Use this to navigate through large result sets.',
		)
		.action(async (options) => {
			try {
				const actionLogger = cliLogger.forMethod('search');
				actionLogger.debug(
					'Executing search command with options:',
					options,
				);

				// Parse limit as number if provided
				if (options.limit) {
					options.limit = parseInt(options.limit, 10);
				}

				// For code search, cursor is actually a page number
				if (options.scope === 'code' && options.cursor) {
					options.page = parseInt(options.cursor, 10);
				}

				// Map CLI options to controller options
				const controllerOptions = {
					workspaceSlug: options.workspaceSlug,
					repoSlug: options.repoSlug,
					query: options.query,
					scope: options.scope,
					limit: options.limit,
					cursor: options.cursor,
					page: options.page,
				};

				const result =
					await atlassianSearchController.search(controllerOptions);

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

	methodLogger.debug('Successfully registered Atlassian search commands');
}

export default { register };
