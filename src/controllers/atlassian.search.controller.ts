import { Logger } from '../utils/logger.util.js';
import { handleControllerError } from '../utils/error-handler.util.js';
import {
	extractPaginationInfo,
	PaginationType,
} from '../utils/pagination.util.js';
import atlassianPullRequestsService from '../services/vendor.atlassian.pullrequests.service.js';
import atlassianSearchService from '../services/vendor.atlassian.search.service.js';
import { ControllerResponse } from '../types/common.types.js';
import { SearchToolArgsType } from '../tools/atlassian.search.types.js';
import {
	formatCodeSearchResults,
	formatCommitsResults,
} from './atlassian.search.formatter.js';
import { formatPullRequestsList } from './atlassian.pullrequests.formatter.js';
import { formatRepositoriesList } from './atlassian.repositories.formatter.js';
import {
	fetchAtlassian,
	getAtlassianCredentials,
} from '../utils/transport.util.js';
import { DEFAULT_PAGE_SIZE, applyDefaults } from '../utils/defaults.util.js';
import { formatBitbucketQuery } from '../utils/query.util.js';
import { ListPullRequestsParams } from '../services/vendor.atlassian.pullrequests.types.js';
import { RepositoriesResponse } from '../services/vendor.atlassian.repositories.types.js';

// Create a contextualized logger for this file
const controllerLogger = Logger.forContext(
	'controllers/atlassian.search.controller.ts',
);

// Log controller initialization
controllerLogger.debug('Bitbucket search controller initialized');

/**
 * Controller for managing Bitbucket search functionality.
 * Provides capability to search across repositories, pull requests, commits, or code.
 */

/**
 * Search Bitbucket for content matching the provided query
 * @param options - Options for the search operation
 * @returns Promise with formatted search results content and pagination information
 */
async function search(
	options: SearchToolArgsType,
): Promise<ControllerResponse> {
	const { workspaceSlug, repoSlug, query, scope = 'all' } = options;
	const methodLogger = Logger.forContext(
		'controllers/atlassian.search.controller.ts',
		'search',
	);

	methodLogger.debug(`Searching Bitbucket with query: ${query}`, {
		workspace: workspaceSlug,
		repository: repoSlug,
		scope,
	});

	try {
		// Create defaults object
		const defaults: Partial<SearchToolArgsType> = {
			limit: DEFAULT_PAGE_SIZE,
			scope: 'all',
		};

		// Apply defaults to options
		const mergedOptions = applyDefaults<SearchToolArgsType>(
			options,
			defaults,
		);

		// Validate that workspace slug is provided and not empty
		if (!mergedOptions.workspaceSlug) {
			throw new Error(
				'The workspaceSlug parameter is required for search operations.',
			);
		}

		if (!mergedOptions.query) {
			return {
				content: 'Please provide a search query.',
			};
		}

		// For scope-specific searches
		let result: ControllerResponse;

		// The search API varies by scope
		switch (mergedOptions.scope) {
			case 'code':
				// Code search is a special case and uses the v1 Search API
				result = await handleCodeSearch(
					mergedOptions.workspaceSlug,
					mergedOptions.repoSlug,
					mergedOptions.query,
					mergedOptions.limit,
					mergedOptions.cursor,
				);
				break;

			case 'pullrequests':
				// Pull request search is handled through the PR API
				result = await handlePullRequestSearch(
					mergedOptions.workspaceSlug,
					mergedOptions.repoSlug,
					mergedOptions.query,
					mergedOptions.limit,
					mergedOptions.cursor,
				);
				break;

			case 'repositories':
				// Repository search is performed using the Workspace Repositories API
				result = await handleRepositorySearch(
					mergedOptions.workspaceSlug,
					mergedOptions.repoSlug,
					mergedOptions.query,
					mergedOptions.limit,
					mergedOptions.cursor,
				);
				break;

			case 'commits':
				// Commits search is a special case and not directly supported by the API
				result = await handleCommitSearch(
					mergedOptions.workspaceSlug,
					mergedOptions.repoSlug,
					mergedOptions.query,
					mergedOptions.limit,
					mergedOptions.cursor,
				);
				break;

			case 'all':
			default:
				// Default search performs repository and PR search and combines results
				result = await handleDefaultSearch(
					mergedOptions.workspaceSlug,
					mergedOptions.repoSlug,
					mergedOptions.query,
					mergedOptions.limit,
					mergedOptions.cursor,
				);
				break;
		}

		return result;
	} catch (error) {
		// Use the standardized error handler
		throw handleControllerError(error, {
			entityType: 'Search',
			operation: 'searching',
			source: 'controllers/atlassian.search.controller.ts@search',
			additionalInfo: { options },
		});
	}
}

/**
 * Handle search for code content (uses Bitbucket's Code Search API)
 */
async function handleCodeSearch(
	workspaceSlug?: string,
	repoSlug?: string,
	query?: string,
	limit: number = DEFAULT_PAGE_SIZE,
	cursor?: string,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.search.controller.ts',
		'handleCodeSearch',
	);
	methodLogger.debug('Performing code search');

	if (!workspaceSlug) {
		return {
			content:
				'A workspace is required for code search. Please provide a workspace slug.',
		};
	}

	if (!query) {
		return {
			content: 'Please provide a search query for code search.',
		};
	}

	try {
		// Convert cursor to page number if provided
		let page = 1;
		if (cursor) {
			const parsedPage = parseInt(cursor, 10);
			if (!isNaN(parsedPage)) {
				page = parsedPage;
			} else {
				methodLogger.warn('Invalid page cursor:', cursor);
			}
		}

		// Use the search service
		const searchResponse = await atlassianSearchService.searchCode({
			workspaceSlug: workspaceSlug,
			searchQuery: query,
			repoSlug: repoSlug,
			page: page,
			pageLen: limit,
		});

		methodLogger.debug(
			`Search complete, found ${searchResponse.size} matches`,
		);

		// Extract pagination information
		const transformedResponse = {
			pagelen: limit,
			page: page,
			size: searchResponse.size,
			values: searchResponse.values || [],
			next:
				searchResponse.values?.length === limit
					? 'available'
					: undefined,
		};

		const pagination = extractPaginationInfo(
			transformedResponse,
			PaginationType.PAGE,
		);

		// Format the code search results
		const formattedCode = formatCodeSearchResults(searchResponse);

		return {
			content: formattedCode,
			pagination,
		};
	} catch (searchError) {
		methodLogger.error('Error performing code search:', searchError);
		throw searchError;
	}
}

/**
 * Handle search for pull requests (uses PR API with query filter)
 */
async function handlePullRequestSearch(
	workspaceSlug?: string,
	repoSlug?: string,
	query?: string,
	limit: number = DEFAULT_PAGE_SIZE,
	cursor?: string,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.search.controller.ts',
		'handlePullRequestSearch',
	);
	methodLogger.debug('Performing pull request search');

	if (!workspaceSlug || !repoSlug) {
		return {
			content:
				'Both workspace and repository are required for pull request search. Please provide workspace and repo slugs.',
		};
	}

	if (!query) {
		return {
			content: 'Please provide a search query for pull request search.',
		};
	}

	try {
		// Format query for the Bitbucket API - specifically target title/description
		const formattedQuery = formatBitbucketQuery(query, 'title,description');

		// Create the parameters for the PR service
		const params: ListPullRequestsParams = {
			workspace: workspaceSlug,
			repo_slug: repoSlug,
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
		return {
			content: `# Pull Request Search Results\n\n${formattedPrs}`,
			pagination,
		};
	} catch (error) {
		methodLogger.error('Error performing pull request search:', error);
		throw error;
	}
}

/**
 * Handle search for repositories (limited functionality in the API)
 */
async function handleRepositorySearch(
	workspaceSlug?: string,
	_repoSlug?: string, // Renamed to indicate it's intentionally unused
	query?: string,
	limit: number = DEFAULT_PAGE_SIZE,
	cursor?: string,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.search.controller.ts',
		'handleRepositorySearch',
	);
	methodLogger.debug('Performing repository search');

	if (!workspaceSlug) {
		return {
			content:
				'A workspace is required for repository search. Please provide a workspace slug.',
		};
	}

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
		const formattedQuery = formatBitbucketQuery(query, 'name,description');
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

		return {
			content: `# Repository Search Results\n\n${formattedRepos}`,
			pagination,
		};
	} catch (searchError) {
		methodLogger.error('Error performing repository search:', searchError);
		throw searchError;
	}
}

/**
 * Handle search for commits (needs repository context)
 */
async function handleCommitSearch(
	workspaceSlug?: string,
	repoSlug?: string,
	query?: string,
	limit: number = DEFAULT_PAGE_SIZE,
	cursor?: string,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.search.controller.ts',
		'handleCommitSearch',
	);
	methodLogger.debug('Performing commit search');

	if (!workspaceSlug || !repoSlug) {
		return {
			content:
				'Both workspace and repository are required for commit search. Please provide workspace and repo slugs.',
		};
	}

	if (!query) {
		return {
			content: 'Please provide a search query for commit search.',
		};
	}

	try {
		// Convert cursor to page number if provided
		let page = 1;
		if (cursor) {
			try {
				page = parseInt(cursor, 10);
			} catch {
				methodLogger.warn('Invalid page cursor:', cursor);
			}
		}

		// Use the search service for commits
		const searchResponse = await atlassianSearchService.searchCommits({
			workspaceSlug: workspaceSlug,
			repoSlug: repoSlug,
			searchQuery: query,
			page: page,
			pageLen: limit,
		});

		methodLogger.debug(
			`Search complete, found ${searchResponse.values?.length || 0} matches`,
		);

		// Extract pagination information
		const pagination = extractPaginationInfo(
			searchResponse,
			PaginationType.PAGE,
		);

		// Format the search results using the formatter
		const formattedResults = formatCommitsResults(
			searchResponse,
			repoSlug,
			workspaceSlug,
		);

		return {
			content: formattedResults,
			pagination,
		};
	} catch (error) {
		methodLogger.error('Error performing commit search:', error);
		throw error;
	}
}

/**
 * Handle default search that combines repo and PR search
 */
async function handleDefaultSearch(
	workspaceSlug?: string,
	repoSlug?: string,
	query?: string,
	limit: number = DEFAULT_PAGE_SIZE,
	cursor?: string,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.search.controller.ts',
		'handleDefaultSearch',
	);
	methodLogger.debug('Performing default (combined) search');

	if (!query) {
		return {
			content: 'Please provide a search query.',
		};
	}

	if (!workspaceSlug) {
		return {
			content:
				'A workspace is required for search. Please provide a workspace slug.',
		};
	}

	// If we have a repository, prioritize pull request and commits search
	if (repoSlug) {
		try {
			// First try pull requests
			const prResults = await handlePullRequestSearch(
				workspaceSlug,
				repoSlug,
				query,
				limit,
				cursor,
			);

			// If we found pull requests, return them
			if (
				prResults.content &&
				!prResults.content.includes('No pull requests found')
			) {
				return prResults;
			}

			// If no pull requests, try commits
			const commitResults = await handleCommitSearch(
				workspaceSlug,
				repoSlug,
				query,
				limit,
				cursor,
			);

			// If we found commits, return them
			if (
				commitResults.content &&
				!commitResults.content.includes('No commits found')
			) {
				return commitResults;
			}

			// Finally, try code search
			return handleCodeSearch(
				workspaceSlug,
				repoSlug,
				query,
				limit,
				cursor,
			);
		} catch (searchError) {
			methodLogger.warn(
				'Error in PR/commit search, falling back to code search',
				searchError,
			);
			return handleCodeSearch(
				workspaceSlug,
				repoSlug,
				query,
				limit,
				cursor,
			);
		}
	} else {
		// Without a specific repo, search for repositories first
		try {
			const repoResults = await handleRepositorySearch(
				workspaceSlug,
				undefined,
				query,
				limit,
				cursor,
			);

			// If we found repositories, return them
			if (
				repoResults.content &&
				!repoResults.content.includes('No repositories found')
			) {
				return repoResults;
			}

			// If no repositories found, try code search
			return handleCodeSearch(
				workspaceSlug,
				undefined,
				query,
				limit,
				cursor,
			);
		} catch (repoSearchError) {
			methodLogger.warn(
				'Error in repository search, falling back to code search',
				repoSearchError,
			);
			return handleCodeSearch(
				workspaceSlug,
				undefined,
				query,
				limit,
				cursor,
			);
		}
	}
}

export default { search };
