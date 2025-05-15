import { Logger } from '../utils/logger.util.js';
import { handleControllerError } from '../utils/error-handler.util.js';
import { DEFAULT_PAGE_SIZE, applyDefaults } from '../utils/defaults.util.js';
import { ControllerResponse } from '../types/common.types.js';
import {
	extractPaginationInfo,
	PaginationType,
} from '../utils/pagination.util.js';
import * as diffService from '../services/vendor.atlassian.repositories.diff.service.js';
import { formatDiffstat, formatFullDiff } from './atlassian.diff.formatter.js';

const controllerLogger = Logger.forContext(
	'controllers/atlassian.diff.controller.ts',
);
controllerLogger.debug('Bitbucket diff controller initialized');

/**
 * Base interface that extends Record<string, unknown> for error handling compatibility
 */
interface BaseDiffOptions extends Record<string, unknown> {
	workspaceSlug: string;
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
			includeFullDiff: false,
			destinationBranch: 'main', // Default to main if not provided
			topic: false, // Default to topic=false which shows all changes between branches
		};

		// Explicitly cast the result of applyDefaults to preserve the original types
		const params = applyDefaults(options, defaults) as typeof options &
			typeof defaults;

		// Construct the spec (e.g., "main..feature")
		const spec = `${params.destinationBranch}..${params.sourceBranch}`;

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
		const pagination = extractPaginationInfo(diffstat, PaginationType.PAGE);

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
		const content =
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

		return {
			content,
			pagination,
		};
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
			includeFullDiff: false,
			topic: false, // Default to topic=false which shows all changes between commits
		};

		// Explicitly cast the result of applyDefaults to preserve the original types
		const params = applyDefaults(options, defaults) as typeof options &
			typeof defaults;

		// Construct the spec (e.g., "a1b2c3d..e4f5g6h")
		const spec = `${params.sinceCommit}..${params.untilCommit}`;

		// Fetch diffstat for the commits
		const diffstat = await diffService.getDiffstat({
			workspace: params.workspaceSlug,
			repo_slug: params.repoSlug,
			spec,
			pagelen: params.limit,
			cursor: params.cursor,
		});

		// Extract pagination info
		const pagination = extractPaginationInfo(diffstat, PaginationType.PAGE);

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
		const content =
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

		return {
			content,
			pagination,
		};
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
