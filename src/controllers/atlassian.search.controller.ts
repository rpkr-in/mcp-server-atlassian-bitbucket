import { Logger } from '../utils/logger.util.js';
import { handleControllerError } from '../utils/error-handler.util.js';
import { applyDefaults, DEFAULT_PAGE_SIZE } from '../utils/defaults.util.js';
import {
	ControllerResponse,
	ResponsePagination,
} from '../types/common.types.js';

import atlassianRepositoriesController from './atlassian.repositories.controller.js';
import atlassianPullRequestsController from './atlassian.pullrequests.controller.js';
import {
	formatCodeSearchResults,
	formatCommitsResults,
} from './atlassian.search.formatter.js';
import atlassianSearchService from '../services/vendor.atlassian.search.service.js';
import { formatPagination } from '../utils/formatter.util.js';

const controllerLogger = Logger.forContext(
	'controllers/atlassian.search.controller.ts',
);

/**
 * Search options interface
 * Defines the parameters for searching Bitbucket content
 */
export interface SearchOptions {
	workspaceSlug?: string;
	repoSlug?: string;
	query?: string;
	scope?: 'repositories' | 'pullrequests' | 'commits' | 'code' | 'all';
	limit?: number;
	cursor?: string;
	page?: number;
	pageLen?: number;
}

/**
 * Search for code in repositories
 *
 * @param options Options for code search
 * @returns Promise with formatted code search results
 */
async function searchCode(
	options: SearchOptions = {},
): Promise<ControllerResponse> {
	const methodLogger = controllerLogger.forMethod('searchCode');
	methodLogger.debug('Searching code with options:', options);

	try {
		// Validate required parameters
		if (!options.workspaceSlug) {
			throw new Error('workspaceSlug is required for code search');
		}

		if (!options.query) {
			throw new Error('query is required for code search');
		}

		// Apply defaults
		const mergedOptions = applyDefaults<SearchOptions>(options, {
			page: 1,
			pageLen: options.limit || DEFAULT_PAGE_SIZE,
		});

		// Call the code search service
		const response = await atlassianSearchService.searchCode({
			workspaceSlug: mergedOptions.workspaceSlug as string,
			searchQuery: mergedOptions.query || '',
			repoSlug: mergedOptions.repoSlug,
			page: mergedOptions.page,
			pageLen: mergedOptions.pageLen,
			// Add fields to get repository information for better display
			fields: '+values.file.commit.repository',
		});

		// Format the results into markdown
		const content = formatCodeSearchResults(response);

		// Create pagination information
		const pagination: ResponsePagination = {
			count: response.size || 0,
			hasMore: response.page * response.pagelen < response.size,
			// For cursor-based pagination, use the page number as the cursor
			nextCursor:
				response.page * response.pagelen < response.size
					? (response.page + 1).toString()
					: undefined,
		};

		methodLogger.debug('Successfully retrieved code search results', {
			count: response.size,
			hasMore: pagination.hasMore,
		});

		return {
			content,
			pagination,
		};
	} catch (error) {
		return handleControllerError(error, {
			source: 'Bitbucket',
			operation: 'searchCode',
			entityType: 'code',
			entityId: options.workspaceSlug,
		});
	}
}

/**
 * Search for commits in a repository
 *
 * @param options Options for commit search
 * @returns Promise with formatted commit search results
 */
async function searchCommits(
	options: SearchOptions = {},
): Promise<ControllerResponse> {
	const methodLogger = controllerLogger.forMethod('searchCommits');
	methodLogger.debug('Searching commits with options:', options);

	try {
		// Validate required parameters
		if (!options.workspaceSlug) {
			throw new Error('workspaceSlug is required for commit search');
		}

		if (!options.repoSlug) {
			throw new Error('repoSlug is required for commit search');
		}

		// Apply defaults
		const mergedOptions = applyDefaults<SearchOptions>(options, {
			page: 1,
			pageLen: options.limit || DEFAULT_PAGE_SIZE,
		});

		// Call the commits search service
		const response = await atlassianSearchService.searchCommits({
			workspaceSlug: mergedOptions.workspaceSlug as string,
			repoSlug: mergedOptions.repoSlug as string,
			searchQuery: mergedOptions.query || '',
			page: mergedOptions.page,
			pageLen: mergedOptions.pageLen,
			// Add fields to get repository information for better display
			fields: '',
		});

		// Format the results into markdown
		const content = formatCommitsResults(
			response,
			mergedOptions.repoSlug as string,
			mergedOptions.workspaceSlug as string,
		);

		// Create pagination information
		const pagination: ResponsePagination = {
			count: response.size || response.values?.length || 0,
			hasMore: response.page * response.pagelen < response.size,
			// For cursor-based pagination, use the page number as the cursor
			nextCursor:
				response.page * response.pagelen < response.size
					? (response.page + 1).toString()
					: undefined,
		};

		methodLogger.debug('Successfully retrieved commit search results', {
			count: pagination.count,
			hasMore: pagination.hasMore,
		});

		return {
			content,
			pagination,
		};
	} catch (error) {
		return handleControllerError(error, {
			source: 'Bitbucket',
			operation: 'searchCommits',
			entityType: 'commits',
			entityId: `${options.workspaceSlug}/${options.repoSlug}`,
		});
	}
}

/**
 * Search for Bitbucket content across repositories and pull requests
 *
 * @param {SearchOptions} options - Options for the search
 * @returns {Promise<ControllerResponse>} Formatted search results in Markdown
 */
async function search(
	options: SearchOptions = {},
): Promise<ControllerResponse> {
	const methodLogger = controllerLogger.forMethod('search');
	methodLogger.debug('Searching Bitbucket content with options:', options);

	try {
		// Validate required parameters
		if (!options.workspaceSlug) {
			throw new Error('workspaceSlug is required for Bitbucket search');
		}

		// Apply defaults to options
		const mergedOptions = applyDefaults<SearchOptions>(options, {
			limit: DEFAULT_PAGE_SIZE,
			scope: 'all',
			query: '',
		});

		// Determine what to search based on the scope
		const scope = mergedOptions.scope || 'all';
		const workspaceSlug = mergedOptions.workspaceSlug as string;
		const query = mergedOptions.query || '';

		// If scope is code, use the code search handler
		if (scope === 'code') {
			return searchCode(mergedOptions);
		}

		// If scope is commits, use the commits search handler
		if (scope === 'commits') {
			// Commits search requires a repository slug
			if (!mergedOptions.repoSlug) {
				throw new Error('repoSlug is required for commits search');
			}
			return searchCommits(mergedOptions);
		}

		let repoResults: ControllerResponse = {
			content: '',
			pagination: { count: 0, hasMore: false },
		};
		let prResults: ControllerResponse = {
			content: '',
			pagination: { count: 0, hasMore: false },
		};

		// Search repositories if scope is 'all' or 'repositories'
		if (scope === 'all' || scope === 'repositories') {
			repoResults = await atlassianRepositoriesController.list({
				workspaceSlug,
				query,
				limit: mergedOptions.limit,
				cursor: mergedOptions.cursor,
			});
		}

		// Search pull requests if scope is 'all' or 'pullrequests' and a repository slug is provided
		if (
			(scope === 'all' || scope === 'pullrequests') &&
			mergedOptions.repoSlug
		) {
			prResults = await atlassianPullRequestsController.list({
				workspaceSlug,
				repoSlug: mergedOptions.repoSlug,
				query,
				limit: mergedOptions.limit,
				cursor: mergedOptions.cursor,
			});
		}

		// Combine results with headers
		let combinedContent = '';
		let totalCount = 0;
		let hasMore = false;

		if (scope === 'all' || scope === 'repositories') {
			combinedContent += `${repoResults.content}\n\n`;
			totalCount += repoResults.pagination?.count || 0;
			hasMore = hasMore || repoResults.pagination?.hasMore || false;
		}

		if (
			(scope === 'all' || scope === 'pullrequests') &&
			mergedOptions.repoSlug
		) {
			combinedContent += `# Pull Request Search Results\n\n${prResults.content}\n\n`;
			totalCount += prResults.pagination?.count || 0;
			hasMore = hasMore || prResults.pagination?.hasMore || false;
		}

		// Add a summary at the top
		let summaryContent = `## Search Summary\n\nFound ${totalCount} results for query "${query}" in workspace "${workspaceSlug}".\n\n${combinedContent}`;

		// Create pagination response
		const pagination: ResponsePagination = {
			count: totalCount,
			hasMore,
			nextCursor:
				(repoResults.pagination as ResponsePagination | undefined)
					?.nextCursor ||
				(prResults.pagination as ResponsePagination | undefined)
					?.nextCursor,
			// Note: Total is not easily available when combining results
		};

		// Format pagination string using the combined pagination info
		const formattedPagination =
			pagination.count !== undefined
				? formatPagination(
						pagination.count,
						pagination.hasMore,
						pagination.nextCursor,
						pagination.total, // Will be undefined here
					)
				: '';

		// Append formatted pagination to the summary content
		if (formattedPagination) {
			summaryContent += `\n\n${formattedPagination}`;
		}

		methodLogger.debug(
			'Successfully retrieved and formatted search results',
			{ totalCount, hasMore },
		);

		return {
			content: summaryContent, // Return the content with pagination appended
			pagination, // Keep the combined pagination object
		};
	} catch (error) {
		return handleControllerError(error, {
			source: 'Bitbucket',
			operation: 'search',
			entityType: 'content',
			entityId: options.workspaceSlug,
		});
	}
}

export default {
	search,
	searchCode,
	searchCommits,
};
