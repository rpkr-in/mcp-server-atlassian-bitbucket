import { Logger } from '../utils/logger.util.js';
import { ControllerResponse } from '../types/common.types.js';
import { DEFAULT_PAGE_SIZE } from '../utils/defaults.util.js';
import {
	extractPaginationInfo,
	PaginationType,
} from '../utils/pagination.util.js';
import { formatPagination } from '../utils/formatter.util.js';
import { formatRepositoriesList } from './atlassian.repositories.formatter.js';
import { RepositoriesResponse } from '../services/vendor.atlassian.repositories.types.js';
import {
	fetchAtlassian,
	getAtlassianCredentials,
} from '../utils/transport.util.js';

/**
 * Handle search for repositories (limited functionality in the API)
 */
export async function handleRepositorySearch(
	workspaceSlug: string,
	_repoSlug?: string, // Renamed to indicate it's intentionally unused
	query?: string,
	limit: number = DEFAULT_PAGE_SIZE,
	cursor?: string,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.search.repositories.controller.ts',
		'handleRepositorySearch',
	);
	methodLogger.debug('Performing repository search');

	if (!query) {
		return {
			content: 'Please provide a search query for repository search.',
		};
	}

	try {
		const credentials = getAtlassianCredentials();
		if (!credentials) {
			throw new Error(
				'Atlassian credentials are required for this operation',
			);
		}

		// Build query params
		const queryParams = new URLSearchParams();

		// Format the query - Bitbucket's repository API allows filtering by name/description
		const formattedQuery = `(name ~ "${query}" OR description ~ "${query}")`;
		queryParams.set('q', formattedQuery);

		// Add pagination parameters
		queryParams.set('pagelen', limit.toString());
		if (cursor) {
			queryParams.set('page', cursor);
		}

		// Sort by most recently updated
		queryParams.set('sort', '-updated_on');

		// Use the repositories endpoint to search
		const path = `/2.0/repositories/${workspaceSlug}?${queryParams.toString()}`;

		methodLogger.debug(`Sending repository search request: ${path}`);

		const searchData = await fetchAtlassian<RepositoriesResponse>(
			credentials,
			path,
		);

		methodLogger.debug(
			`Search complete, found ${searchData.values?.length || 0} matches`,
		);

		// Extract pagination information
		const pagination = extractPaginationInfo(
			searchData,
			PaginationType.PAGE,
		);

		// Format the search results
		const formattedRepos = formatRepositoriesList(searchData);
		let finalContent = `# Repository Search Results\n\n${formattedRepos}`;

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
	} catch (searchError) {
		methodLogger.error('Error performing repository search:', searchError);
		throw searchError;
	}
}
