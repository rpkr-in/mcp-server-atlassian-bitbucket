import { Logger } from '../utils/logger.util.js';
import { ControllerResponse } from '../types/common.types.js';
import { DEFAULT_PAGE_SIZE } from '../utils/defaults.util.js';
import {
	extractPaginationInfo,
	PaginationType,
} from '../utils/pagination.util.js';
import { formatPagination } from '../utils/formatter.util.js';
import { formatContentSearchResults } from './atlassian.search.formatter.js';
import { ContentType } from '../utils/atlassian.util.js';
import { ContentSearchParams } from '../services/vendor.atlassian.search.types.js';
import atlassianSearchService from '../services/vendor.atlassian.search.service.js';

/**
 * Handle search for content (PRs, Issues, Wiki, etc.)
 */
export async function handleContentSearch(
	workspaceSlug: string,
	repoSlug?: string,
	query?: string,
	limit: number = DEFAULT_PAGE_SIZE,
	cursor?: string,
	contentType?: ContentType,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.search.content.controller.ts',
		'handleContentSearch',
	);
	methodLogger.debug('Performing content search');

	if (!query) {
		return {
			content: 'Please provide a search query for content search.',
		};
	}

	try {
		const params: ContentSearchParams = {
			workspaceSlug,
			query,
			limit,
			page: cursor ? parseInt(cursor, 10) : 1,
		};

		// Add optional parameters if provided
		if (repoSlug) {
			params.repoSlug = repoSlug;
		}

		if (contentType) {
			params.contentType = contentType;
		}

		methodLogger.debug('Content search params:', params);

		const searchResult = await atlassianSearchService.searchContent(params);

		methodLogger.debug(
			`Content search complete, found ${searchResult.size} matches`,
		);

		// Extract pagination information
		const pagination = extractPaginationInfo(
			{
				...searchResult,
				// For content search, the Bitbucket API returns values and size differently
				// We need to map it to a format that extractPaginationInfo can understand
				page: params.page,
				pagelen: limit,
			},
			PaginationType.PAGE,
		);

		// Format the search results
		const formattedResults = formatContentSearchResults(
			searchResult,
			contentType,
		);

		// Add pagination information if available
		let finalContent = formattedResults;
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
	} catch (searchError) {
		methodLogger.error('Error performing content search:', searchError);
		throw searchError;
	}
}
