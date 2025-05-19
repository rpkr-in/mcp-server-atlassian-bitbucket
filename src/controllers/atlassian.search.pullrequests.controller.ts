import { Logger } from '../utils/logger.util.js';
import { ControllerResponse } from '../types/common.types.js';
import { DEFAULT_PAGE_SIZE } from '../utils/defaults.util.js';
import atlassianPullRequestsService from '../services/vendor.atlassian.pullrequests.service.js';
import {
	extractPaginationInfo,
	PaginationType,
} from '../utils/pagination.util.js';
import { formatPagination } from '../utils/formatter.util.js';
import { formatPullRequestsList } from './atlassian.pullrequests.formatter.js';
import { ListPullRequestsParams } from '../services/vendor.atlassian.pullrequests.types.js';

/**
 * Handle search for pull requests (uses PR API with query filter)
 */
export async function handlePullRequestSearch(
	workspaceSlug: string,
	repoSlug?: string,
	query?: string,
	limit: number = DEFAULT_PAGE_SIZE,
	cursor?: string,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.search.pullrequests.controller.ts',
		'handlePullRequestSearch',
	);
	methodLogger.debug('Performing pull request search');

	if (!query) {
		return {
			content: 'Please provide a search query for pull request search.',
		};
	}

	try {
		// Format query for the Bitbucket API - specifically target title/description
		const formattedQuery = `(title ~ "${query}" OR description ~ "${query}")`;

		// Create the parameters for the PR service
		const params: ListPullRequestsParams = {
			workspace: workspaceSlug,
			repo_slug: repoSlug!, // Can safely use non-null assertion now that schema validation ensures it's present
			q: formattedQuery,
			pagelen: limit,
			page: cursor ? parseInt(cursor, 10) : undefined,
			sort: '-updated_on',
		};

		methodLogger.debug('Using PR search params:', params);

		const prData = await atlassianPullRequestsService.list(params);
		methodLogger.debug(
			`Search complete, found ${prData.values.length} matches`,
		);

		// Extract pagination information
		const pagination = extractPaginationInfo(prData, PaginationType.PAGE);

		// Format the search results
		const formattedPrs = formatPullRequestsList(prData);
		let finalContent = `# Pull Request Search Results\n\n${formattedPrs}`;

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
		methodLogger.error('Error performing pull request search:', error);
		throw error;
	}
}
