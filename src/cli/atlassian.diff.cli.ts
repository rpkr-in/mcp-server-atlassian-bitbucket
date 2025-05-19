import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
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
		.description(
			'Display differences between two branches in a repository.\nIMPORTANT: The output shows changes as "destinationBranch → sourceBranch". For complete code changes (not just summary), try reversing the branch parameters if initial results show only summary.',
		)
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
			"Source branch for comparison (usually the feature branch). NOTE: Parameter naming might be counterintuitive - try reversing parameters if results aren't as expected.",
		)
		.option(
			'-d, --destination-branch <destinationBranch>',
			'Destination branch for comparison (defaults to "main"). NOTE: Parameter naming might be counterintuitive - try reversing parameters if results aren\'t as expected.',
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
					limit: options.limit,
					cursor: options.cursor,
				};

				// Call controller
				const result: ControllerResponse =
					await diffController.branchDiff(controllerOptions);

				// Output result content, which now includes pagination information
				console.log(result.content);
			} catch (error) {
				handleCliError(error);
			}
		});

	// Commit diff command
	program
		.command('diff-commits')
		.description(
			'Display differences between two commits in a repository.\nIMPORTANT: Parameter order is counterintuitive! For proper results, --since-commit should be the NEWER commit and --until-commit should be the OLDER commit. If you see "No changes detected", try reversing the commit order.',
		)
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
			'Base commit hash or reference (IMPORTANT: Should be the NEWER commit chronologically)',
		)
		.requiredOption(
			'-u, --until-commit <untilCommit>',
			'Target commit hash or reference (IMPORTANT: Should be the OLDER commit chronologically)',
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
					limit: options.limit,
					cursor: options.cursor,
				};

				// Call controller
				const result: ControllerResponse =
					await diffController.commitDiff(controllerOptions);

				// Output result content, which now includes pagination information
				console.log(result.content);
			} catch (error) {
				handleCliError(error);
			}
		});

	registerLogger.debug('CLI commands registered successfully');
}

export default { register };
