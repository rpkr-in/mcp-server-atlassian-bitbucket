import atlassianRepositoriesService from '../services/vendor.atlassian.repositories.service.js';
import { Logger } from '../utils/logger.util.js';
import { handleControllerError } from '../utils/error-handler.util.js';
import { DEFAULT_PAGE_SIZE, applyDefaults } from '../utils/defaults.util.js';
import {
	extractPaginationInfo,
	PaginationType,
} from '../utils/pagination.util.js';
import { formatPagination } from '../utils/formatter.util.js';
import { ControllerResponse } from '../types/common.types.js';
import { GetCommitHistoryToolArgsType } from '../tools/atlassian.repositories.types.js';
import { formatCommitHistory } from './atlassian.repositories.formatter.js';
import { ListCommitsParams } from '../services/vendor.atlassian.repositories.types.js';
import { getDefaultWorkspace } from '../utils/workspace.util.js';

// Logger instance for this module
const logger = Logger.forContext(
	'controllers/atlassian.repositories.commit.controller.ts',
);

/**
 * Get commit history for a repository
 *
 * @param options - Options containing repository identifiers and filters
 * @returns Promise with formatted commit history content and pagination info
 */
export async function handleCommitHistory(
	options: GetCommitHistoryToolArgsType,
): Promise<ControllerResponse> {
	const methodLogger = logger.forMethod('handleCommitHistory');

	try {
		methodLogger.debug('Getting commit history', options);

		// Apply defaults
		const defaults = {
			limit: DEFAULT_PAGE_SIZE,
		};
		const params = applyDefaults(
			options,
			defaults,
		) as GetCommitHistoryToolArgsType & {
			limit: number;
		};

		// Handle optional workspaceSlug
		if (!params.workspaceSlug) {
			methodLogger.debug(
				'No workspace provided, fetching default workspace',
			);
			const defaultWorkspace = await getDefaultWorkspace();
			if (!defaultWorkspace) {
				throw new Error(
					'No default workspace found. Please provide a workspace slug.',
				);
			}
			params.workspaceSlug = defaultWorkspace;
			methodLogger.debug(`Using default workspace: ${defaultWorkspace}`);
		}

		const serviceParams: ListCommitsParams = {
			workspace: params.workspaceSlug,
			repo_slug: params.repoSlug,
			include: params.revision,
			path: params.path,
			pagelen: params.limit,
			page: params.cursor ? parseInt(params.cursor, 10) : undefined,
		};

		methodLogger.debug('Fetching commits with params:', serviceParams);
		const commitsData =
			await atlassianRepositoriesService.listCommits(serviceParams);
		methodLogger.debug(
			`Retrieved ${commitsData.values?.length || 0} commits`,
		);

		// Extract pagination info before formatting
		const pagination = extractPaginationInfo(
			commitsData,
			PaginationType.PAGE,
		);

		const formattedHistory = formatCommitHistory(commitsData, {
			revision: params.revision,
			path: params.path,
		});

		// Create the final content by combining the formatted commit history with pagination information
		let finalContent = formattedHistory;

		// Add pagination information if available
		if (
			pagination &&
			(pagination.hasMore || pagination.count !== undefined)
		) {
			const paginationString = formatPagination(pagination);
			finalContent += '\n\n' + paginationString;
		}

		return {
			content: finalContent,
		};
	} catch (error) {
		throw handleControllerError(error, {
			entityType: 'Commit History',
			operation: 'retrieving',
			source: 'controllers/atlassian.repositories.commit.controller.ts@handleCommitHistory',
			additionalInfo: { options },
		});
	}
}
