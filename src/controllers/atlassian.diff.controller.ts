import { Logger } from '../utils/logger.util.js';
import { handleControllerError } from '../utils/error-handler.util.js';
import { DEFAULT_PAGE_SIZE, applyDefaults } from '../utils/defaults.util.js';
import { ControllerResponse } from '../types/common.types.js';
import {
	extractPaginationInfo,
	PaginationType,
} from '../utils/pagination.util.js';
import { formatPagination } from '../utils/formatter.util.js';
import * as diffService from '../services/vendor.atlassian.repositories.diff.service.js';
import { formatDiffstat, formatFullDiff } from './atlassian.diff.formatter.js';
import { getDefaultWorkspace } from '../utils/workspace.util.js';

const controllerLogger = Logger.forContext(
	'controllers/atlassian.diff.controller.ts',
);
controllerLogger.debug('Bitbucket diff controller initialized');

/**
 * Base interface that extends Record<string, unknown> for error handling compatibility
 */
interface BaseDiffOptions extends Record<string, unknown> {
	workspaceSlug?: string;
	repoSlug: string;
	includeFullDiff?: boolean;
	limit?: number;
	cursor?: number;
	topic?: boolean;
}

/**
 * Interface for branch diff options
 */
interface BranchDiffOptions extends BaseDiffOptions {
	sourceBranch: string;
	destinationBranch?: string;
}

/**
 * Interface for commit diff options
 */
interface CommitDiffOptions extends BaseDiffOptions {
	sinceCommit: string;
	untilCommit: string;
}

/**
 * Compare two branches and return the differences
 *
 * @param options - Options for branch comparison
 * @returns Promise with formatted diff content and pagination
 */
async function branchDiff(
	options: BranchDiffOptions,
): Promise<ControllerResponse> {
	const methodLogger = controllerLogger.forMethod('branchDiff');

	try {
		methodLogger.debug('Comparing branches', options);

		// Apply defaults
		const defaults = {
			limit: DEFAULT_PAGE_SIZE,
			includeFullDiff: true,
			destinationBranch: 'main', // Default to main if not provided
			topic: false, // Default to topic=false which shows all changes between branches
		};

		// Explicitly cast the result of applyDefaults to preserve the original types
		const params = applyDefaults(options, defaults) as typeof options &
			typeof defaults;

		// Handle optional workspaceSlug
		if (!params.workspaceSlug) {
			methodLogger.debug(
				'No workspace provided, fetching default workspace',
			);
			const defaultWorkspace = await getDefaultWorkspace();
			if (!defaultWorkspace) {
				throw new Error(
					'Could not determine a default workspace. Please provide a workspaceSlug.',
				);
			}
			params.workspaceSlug = defaultWorkspace;
			methodLogger.debug(
				`Using default workspace: ${params.workspaceSlug}`,
			);
		}

		// Construct the spec (e.g., "main..feature")
		// NOTE: Bitbucket API expects the destination branch first, then the source branch
		// This is the opposite of what some Git tools use (e.g., git diff source..destination)
		// The diff shows changes that would need to be applied to destination to match source
		//
		// IMPORTANT: This behavior is counterintuitive in two ways:
		// 1. The parameter names "sourceBranch" and "destinationBranch" suggest a certain direction,
		//    but the output is displayed as "destinationBranch → sourceBranch"
		// 2. When comparing branches with newer content in the feature branch (source), full diffs
		//    might only show when using parameters in one order, and only summaries in the other order
		//
		// We document this behavior clearly in the CLI and Tool interfaces
		const spec = `${params.destinationBranch}..${params.sourceBranch}`;

		methodLogger.debug(`Using diff spec: ${spec}`);

		try {
			// Fetch diffstat for the branches
			const diffstat = await diffService.getDiffstat({
				workspace: params.workspaceSlug,
				repo_slug: params.repoSlug,
				spec,
				pagelen: params.limit,
				cursor: params.cursor,
				topic: params.topic,
			});

			// Extract pagination info
			const pagination = extractPaginationInfo(
				diffstat,
				PaginationType.PAGE,
			);

			// Fetch full diff if requested
			let rawDiff: string | null = null;
			if (params.includeFullDiff) {
				rawDiff = await diffService.getRawDiff({
					workspace: params.workspaceSlug,
					repo_slug: params.repoSlug,
					spec,
				});
			}

			// Format the results
			let content =
				params.includeFullDiff && rawDiff
					? formatFullDiff(
							diffstat,
							rawDiff,
							params.destinationBranch,
							params.sourceBranch,
						)
					: formatDiffstat(
							diffstat,
							params.destinationBranch,
							params.sourceBranch,
						);

			// Add pagination information if available
			if (
				pagination &&
				(pagination.hasMore || pagination.count !== undefined)
			) {
				const paginationString = formatPagination(pagination);
				content += '\n\n' + paginationString;
			}

			return {
				content,
			};
		} catch (error) {
			// Enhance error handling for common diff-specific errors
			if (
				error instanceof Error &&
				error.message.includes(
					'source or destination could not be found',
				)
			) {
				// Create a more user-friendly error message
				throw new Error(
					`Unable to generate diff between '${params.sourceBranch}' and '${params.destinationBranch}'. ` +
						`One or both of these branches may not exist in the repository. ` +
						`Please verify both branch names and ensure you have access to view them.`,
				);
			}
			// Re-throw other errors to be handled by the outer catch block
			throw error;
		}
	} catch (error) {
		throw handleControllerError(error, {
			entityType: 'Branch Diff',
			operation: 'comparing branches',
			source: 'controllers/atlassian.diff.controller.ts@branchDiff',
			additionalInfo: options,
		});
	}
}

/**
 * Compare two commits and return the differences
 *
 * @param options - Options for commit comparison
 * @returns Promise with formatted diff content and pagination
 */
async function commitDiff(
	options: CommitDiffOptions,
): Promise<ControllerResponse> {
	const methodLogger = controllerLogger.forMethod('commitDiff');

	try {
		methodLogger.debug('Comparing commits', options);

		// Apply defaults
		const defaults = {
			limit: DEFAULT_PAGE_SIZE,
			includeFullDiff: true,
			topic: false, // Default to topic=false which shows all changes between commits
		};

		// Explicitly cast the result of applyDefaults to preserve the original types
		const params = applyDefaults(options, defaults) as typeof options &
			typeof defaults;

		// Handle optional workspaceSlug
		if (!params.workspaceSlug) {
			methodLogger.debug(
				'No workspace provided, fetching default workspace',
			);
			const defaultWorkspace = await getDefaultWorkspace();
			if (!defaultWorkspace) {
				throw new Error(
					'Could not determine a default workspace. Please provide a workspaceSlug.',
				);
			}
			params.workspaceSlug = defaultWorkspace;
			methodLogger.debug(
				`Using default workspace: ${params.workspaceSlug}`,
			);
		}

		// Construct the spec (e.g., "a1b2c3d..e4f5g6h")
		// NOTE: Bitbucket API expects the base/since commit first, then the target/until commit
		// The diff shows changes that would need to be applied to base to match target
		//
		// IMPORTANT: The parameter names are counterintuitive to how they must be used:
		// 1. For proper results with full code changes, sinceCommit should be the NEWER commit,
		//    and untilCommit should be the OLDER commit (reverse chronological order)
		// 2. If used with chronological order (older → newer), the result may show "No changes detected"
		//
		// We document this behavior clearly in the CLI and Tool interfaces
		const spec = `${params.sinceCommit}..${params.untilCommit}`;

		methodLogger.debug(`Using diff spec: ${spec}`);

		try {
			// Fetch diffstat for the commits
			const diffstat = await diffService.getDiffstat({
				workspace: params.workspaceSlug,
				repo_slug: params.repoSlug,
				spec,
				pagelen: params.limit,
				cursor: params.cursor,
			});

			// Extract pagination info
			const pagination = extractPaginationInfo(
				diffstat,
				PaginationType.PAGE,
			);

			// Fetch full diff if requested
			let rawDiff: string | null = null;
			if (params.includeFullDiff) {
				rawDiff = await diffService.getRawDiff({
					workspace: params.workspaceSlug,
					repo_slug: params.repoSlug,
					spec,
				});
			}

			// Format the results
			let content =
				params.includeFullDiff && rawDiff
					? formatFullDiff(
							diffstat,
							rawDiff,
							params.sinceCommit,
							params.untilCommit,
						)
					: formatDiffstat(
							diffstat,
							params.sinceCommit,
							params.untilCommit,
						);

			// Add pagination information if available
			if (
				pagination &&
				(pagination.hasMore || pagination.count !== undefined)
			) {
				const paginationString = formatPagination(pagination);
				content += '\n\n' + paginationString;
			}

			return {
				content,
			};
		} catch (error) {
			// Enhance error handling for common diff-specific errors
			if (
				error instanceof Error &&
				error.message.includes(
					'source or destination could not be found',
				)
			) {
				// Create a more user-friendly error message
				throw new Error(
					`Unable to generate diff between commits '${params.sinceCommit}' and '${params.untilCommit}'. ` +
						`One or both of these commits may not exist in the repository or may be in the wrong order. ` +
						`Please verify both commit hashes and ensure you have access to view them.`,
				);
			}
			// Re-throw other errors to be handled by the outer catch block
			throw error;
		}
	} catch (error) {
		throw handleControllerError(error, {
			entityType: 'Commit Diff',
			operation: 'comparing commits',
			source: 'controllers/atlassian.diff.controller.ts@commitDiff',
			additionalInfo: options,
		});
	}
}

export default { branchDiff, commitDiff };
