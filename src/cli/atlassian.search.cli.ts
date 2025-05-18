import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';

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
			'Search for content across Bitbucket repositories, pull requests, commits, and code.',
		)
		.requiredOption(
			'-w, --workspace-slug <slug>',
			'Workspace slug to search in. Must be a valid workspace slug from your Bitbucket account. Example: "myteam"',
		)
		.option(
			'-r, --repo-slug <slug>',
			'Optional repository slug to limit the search scope. If omitted, searches across all repositories in the workspace.',
		)
		.requiredOption(
			'-q, --query <string>',
			'Search query text. Will match against content based on the selected search scope.',
		)
		.option(
			'-s, --scope <scope>',
			'Search scope: "repositories", "pullrequests", "commits", "code", or "all" (default).',
			'all',
		)
		.option(
			'--language <lang>',
			'Filter code search results by programming language (e.g., "typescript", "python").',
		)
		.option(
			'--extension <ext>',
			'Filter code search results by file extension (e.g., "ts", "py", "java").',
		)
		.option(
			'-l, --limit <number>',
			'Maximum number of items to return (1-100). Defaults to 25 if omitted.',
		)
		.option(
			'-c, --cursor <string>',
			'Pagination cursor for retrieving the next set of results.',
		)
		.option(
			'--page <number>',
			'Page number for code search results (alternative to cursor).',
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.search.cli.ts',
				'search',
			);
			try {
				actionLogger.debug('Processing command options:', options);

				// Validate options
				if (options.limit) {
					const limit = parseInt(options.limit, 10);
					if (isNaN(limit) || limit <= 0) {
						throw new Error(
							'Invalid --limit value: Must be a positive integer.',
						);
					}
				}

				if (options.page) {
					const page = parseInt(options.page, 10);
					if (isNaN(page) || page <= 0) {
						throw new Error(
							'Invalid --page value: Must be a positive integer.',
						);
					}
				}

				// Validate scope
				const validScopes = [
					'repositories',
					'pullrequests',
					'commits',
					'code',
					'all',
				];
				if (options.scope && !validScopes.includes(options.scope)) {
					throw new Error(
						`Invalid scope: "${options.scope}". Must be one of: ${validScopes.join(', ')}`,
					);
				}

				// Some scopes require a repository
				if (
					(options.scope === 'pullrequests' ||
						options.scope === 'commits') &&
					!options.repoSlug
				) {
					throw new Error(
						`The "${options.scope}" scope requires specifying a repository with --repo-slug`,
					);
				}

				// Map CLI options to controller params
				const searchOptions = {
					workspaceSlug: options.workspaceSlug,
					repoSlug: options.repoSlug,
					query: options.query,
					scope: options.scope,
					language: options.language,
					extension: options.extension,
					limit: options.limit
						? parseInt(options.limit, 10)
						: undefined,
					cursor: options.cursor,
					page: options.page ? parseInt(options.page, 10) : undefined,
				};

				actionLogger.debug('Searching with options:', searchOptions);
				const result =
					await atlassianSearchController.search(searchOptions);
				actionLogger.debug('Search completed successfully');

				// Display the content which now includes pagination information
				console.log(result.content);
			} catch (error) {
				actionLogger.error('Operation failed:', error);
				handleCliError(error);
			}
		});

	methodLogger.debug('Successfully registered Atlassian search commands');
}

export default { register };
