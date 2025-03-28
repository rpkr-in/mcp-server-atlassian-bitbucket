import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import { formatPagination } from '../utils/formatter.util.js';

import atlassianSearchController from '../controllers/atlassian.search.controller.js';

/**
 * Register Atlassian Search commands
 *
 * @param {Command} program - Commander program instance
 */
function register(program: Command) {
	const cliLogger = Logger.forContext(
		'cli/atlassian.search.cli.ts',
		'register',
	);
	cliLogger.debug('Registering Atlassian search commands...');

	// Register the search command
	program
		.command('search')
		.description(
			'Search for Bitbucket content across repositories and pull requests',
		)
		.requiredOption(
			'-w, --workspace <slug>',
			'Workspace slug containing the content to search',
		)
		.option(
			'-r, --repository <slug>',
			'Repository slug (required for pull request search)',
		)
		.option(
			'-q, --query <query>',
			'Search query to filter results by name, description, etc.',
		)
		.option(
			'-s, --scope <scope>',
			'Search scope: "repositories", "pullrequests", or "all" (default)',
		)
		.option(
			'-l, --limit <number>',
			'Maximum number of items to return (1-100)',
		)
		.option(
			'-c, --cursor <string>',
			'Pagination cursor for retrieving the next set of results',
		)
		.action(async (options) => {
			try {
				const cliLogger = Logger.forContext(
					'cli/atlassian.search.cli.ts',
					'search',
				);
				cliLogger.debug(
					'Executing search command with options:',
					options,
				);

				// Parse limit as number if provided
				if (options.limit) {
					options.limit = parseInt(options.limit, 10);
				}

				// Map CLI options to controller options
				const controllerOptions = {
					workspaceSlug: options.workspace,
					repoSlug: options.repository,
					query: options.query,
					scope: options.scope,
					limit: options.limit,
					cursor: options.cursor,
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

	cliLogger.debug('Successfully registered Atlassian search commands');
}

export default { register };
