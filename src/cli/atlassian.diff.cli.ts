import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { formatPagination } from '../utils/formatter.util.js';
import { handleCliError } from '../utils/error.util.js';
import diffController from '../controllers/atlassian.diff.controller.js';
import { ControllerResponse } from '../types/common.types.js';

// Create a contextualized logger for this file
const cliLogger = Logger.forContext('cli/atlassian.diff.cli.ts');

// Log initialization
cliLogger.debug('Bitbucket diff CLI module initialized');

/**
 * Register diff-related CLI commands
 * @param program - Commander instance
 */
function register(program: Command) {
	const registerLogger = cliLogger.forMethod('register');
	registerLogger.debug('Registering Bitbucket Diff CLI commands...');

	// Branch diff command
	program
		.command('diff-branches')
		.description('Display differences between two branches in a repository')
		.option(
			'-w, --workspace-slug <workspaceSlug>',
			'Workspace slug containing the repository. If not provided, the system will use your default workspace (either configured via BITBUCKET_DEFAULT_WORKSPACE or the first workspace in your account).',
		)
		.requiredOption(
			'-r, --repo-slug <repoSlug>',
			'Repository slug to compare branches',
		)
		.requiredOption(
			'-s, --source-branch <sourceBranch>',
			'Source branch for comparison (feature branch)',
		)
		.option(
			'-d, --destination-branch <destinationBranch>',
			'Destination branch for comparison (defaults to "main")',
		)
		.option(
			'-f, --full-diff',
			'Include full code diff in the output (included by default, flag kept for backward compatibility)',
		)
		.option(
			'--limit <limit>',
			'Maximum number of files to show in results',
			(value) => parseInt(value, 10),
		)
		.option(
			'--cursor <cursor>',
			'Pagination cursor for additional results',
			(value) => parseInt(value, 10),
		)
		.action(async (options) => {
			const methodLogger = cliLogger.forMethod('diff-branches');
			try {
				methodLogger.debug('CLI diff-branches called', options);

				// Map CLI options to controller options
				const controllerOptions = {
					workspaceSlug: options.workspaceSlug,
					repoSlug: options.repoSlug,
					sourceBranch: options.sourceBranch,
					destinationBranch: options.destinationBranch,
					...(options.fullDiff !== undefined && {
						includeFullDiff: true,
					}),
					limit: options.limit,
					cursor: options.cursor,
				};

				// Call controller
				const result: ControllerResponse =
					await diffController.branchDiff(controllerOptions);

				// Output result content
				console.log(result.content);

				// If pagination information exists, append it
				if (result.pagination) {
					console.log('\n' + formatPagination(result.pagination));
				}
			} catch (error) {
				handleCliError(error);
			}
		});

	// Commit diff command
	program
		.command('diff-commits')
		.description('Display differences between two commits in a repository')
		.option(
			'-w, --workspace-slug <workspaceSlug>',
			'Workspace slug containing the repository. If not provided, the system will use your default workspace.',
		)
		.requiredOption(
			'-r, --repo-slug <repoSlug>',
			'Repository slug to compare commits',
		)
		.requiredOption(
			'-s, --since-commit <sinceCommit>',
			'Base commit hash or reference (starting point)',
		)
		.requiredOption(
			'-u, --until-commit <untilCommit>',
			'Target commit hash or reference (ending point)',
		)
		.option(
			'-f, --full-diff',
			'Include full code diff in the output (included by default, flag kept for backward compatibility)',
		)
		.option(
			'--limit <limit>',
			'Maximum number of files to show in results',
			(value) => parseInt(value, 10),
		)
		.option(
			'--cursor <cursor>',
			'Pagination cursor for additional results',
			(value) => parseInt(value, 10),
		)
		.action(async (options) => {
			const methodLogger = cliLogger.forMethod('diff-commits');
			try {
				methodLogger.debug('CLI diff-commits called', options);

				// Map CLI options to controller options
				const controllerOptions = {
					workspaceSlug: options.workspaceSlug,
					repoSlug: options.repoSlug,
					sinceCommit: options.sinceCommit,
					untilCommit: options.untilCommit,
					...(options.fullDiff !== undefined && {
						includeFullDiff: true,
					}),
					limit: options.limit,
					cursor: options.cursor,
				};

				// Call controller
				const result: ControllerResponse =
					await diffController.commitDiff(controllerOptions);

				// Output result content
				console.log(result.content);

				// If pagination information exists, append it
				if (result.pagination) {
					console.log('\n' + formatPagination(result.pagination));
				}
			} catch (error) {
				handleCliError(error);
			}
		});

	registerLogger.debug('CLI commands registered successfully');
}

export default { register };
