import { Logger } from '../utils/logger.util.js';
import { handleControllerError } from '../utils/error-handler.util.js';
import {
	extractPaginationInfo,
	PaginationType,
} from '../utils/pagination.util.js';
import atlassianPullRequestsService from '../services/vendor.atlassian.pullrequests.service.js';
import atlassianSearchService from '../services/vendor.atlassian.search.service.js';
import {
	ControllerResponse,
	ResponsePagination,
} from '../types/common.types.js';
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
	// Remove language and extension from here, they are handled via mergedOptions
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
					mergedOptions.language, // Pass from mergedOptions
					mergedOptions.extension, // Pass from mergedOptions
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
				// Note: Language/extension filters only apply if it falls back to code search
				result = await handleDefaultSearch(
					mergedOptions.workspaceSlug,
					mergedOptions.repoSlug,
					mergedOptions.query,
					mergedOptions.limit,
					mergedOptions.cursor,
					mergedOptions.language, // Pass from mergedOptions
					mergedOptions.extension, // Pass from mergedOptions
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
	language?: string,
	extension?: string,
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
			language: language,
			extension: extension,
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
			next: 'available', // Fallback to 'available' since searchResponse doesn't have a next property
		};

		const pagination = extractPaginationInfo(
			transformedResponse,
			PaginationType.PAGE,
		);

		// Format the code search results
		let formattedCode = formatCodeSearchResults(searchResponse);

		// Add note about language filtering if applied
		if (
			language &&
			(searchResponse.size > 0 || searchResponse.size === 0)
		) {
			// Make it clear that language filtering is a best-effort by the API
			const languageNote = `> **Note:** Language filtering for '${language}' is applied as a best effort by the Bitbucket API. Results may include files in other languages or may be restricted based on Bitbucket's language detection.`;
			formattedCode = `${languageNote}\n\n${formattedCode}`;
		}

		return {
			content: formattedCode,
			pagination,
			metadata: language
				? {
						appliedLanguageFilter: language,
					}
				: undefined,
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
		const formattedQuery = `(title ~ "${query}" OR description ~ "${query}")`;

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
 * Handle default search that searches across multiple scopes and combines results
 */
async function handleDefaultSearch(
	workspaceSlug?: string,
	repoSlug?: string,
	query?: string,
	limit: number = DEFAULT_PAGE_SIZE,
	cursor?: string,
	language?: string,
	extension?: string,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.search.controller.ts',
		'handleDefaultSearch',
	);
	methodLogger.debug('Performing combined multi-scope search');

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

	// Track results from each scope
	interface ScopeResult {
		scope: string;
		content: string;
		count: number;
		pagination?: ResponsePagination;
	}

	const results: ScopeResult[] = [];
	const searchPromises: Promise<void>[] = [];

	// Helper function to extract count from search results
	function extractResultCount(content: string): number {
		const match = content.match(
			/Found (\d+) matches|Showing (\d+) of (\d+) total items/,
		);
		if (match) {
			// Return the first captured number that isn't undefined
			for (let i = 1; i < match.length; i++) {
				if (match[i] !== undefined) {
					return parseInt(match[i], 10);
				}
			}
		}

		// Check for empty results messages
		if (
			content.includes('No repositories found') ||
			content.includes('No pull requests found') ||
			content.includes('No commits found') ||
			content.includes('No code matches found')
		) {
			return 0;
		}

		// Default to 1 if we couldn't extract a count but content exists
		return 1;
	}

	// Search for repositories
	searchPromises.push(
		(async () => {
			try {
				const repoResults = await handleRepositorySearch(
					workspaceSlug,
					undefined,
					query,
					Math.min(limit, 10), // Limit to top 10 repo results
					cursor,
				);

				const content = repoResults.content.replace(
					'# Repository Search Results\n\n',
					'',
				);
				const count = extractResultCount(content);

				results.push({
					scope: 'repositories',
					content,
					count,
					pagination: repoResults.pagination,
				});

				methodLogger.debug(`Found ${count} matching repositories`);
			} catch (error) {
				methodLogger.warn('Repository search failed:', error);
			}
		})(),
	);

	// If a specific repo is provided, search pull requests and commits
	if (repoSlug) {
		// Search for pull requests
		searchPromises.push(
			(async () => {
				try {
					const prResults = await handlePullRequestSearch(
						workspaceSlug,
						repoSlug,
						query,
						Math.min(limit, 10), // Limit to top 10 PR results
						cursor,
					);

					const content = prResults.content.replace(
						'# Pull Request Search Results\n\n',
						'',
					);
					const count = extractResultCount(content);

					results.push({
						scope: 'pull requests',
						content,
						count,
						pagination: prResults.pagination,
					});

					methodLogger.debug(`Found ${count} matching pull requests`);
				} catch (error) {
					methodLogger.warn('Pull request search failed:', error);
				}
			})(),
		);

		// Search for commits
		searchPromises.push(
			(async () => {
				try {
					const commitResults = await handleCommitSearch(
						workspaceSlug,
						repoSlug,
						query,
						Math.min(limit, 10), // Limit to top 10 commit results
						cursor,
					);

					const content = commitResults.content.replace(
						'# Commit Search Results\n\n',
						'',
					);
					const count = extractResultCount(content);

					results.push({
						scope: 'commits',
						content,
						count,
						pagination: commitResults.pagination,
					});

					methodLogger.debug(`Found ${count} matching commits`);
				} catch (error) {
					methodLogger.warn('Commit search failed:', error);
				}
			})(),
		);
	}

	// Always search for code
	searchPromises.push(
		(async () => {
			try {
				const codeResults = await handleCodeSearch(
					workspaceSlug,
					repoSlug,
					query,
					Math.min(limit, 15), // Limit to top 15 code results
					cursor,
					language,
					extension,
				);

				// Remove the language note to avoid repetition in the combined results
				let content = codeResults.content.replace(
					/> \*\*Note:\*\* Language filtering.+\n\n/,
					'',
				);
				content = content.replace('# Code Search Results\n\n', '');
				const count = extractResultCount(content);

				results.push({
					scope: 'code',
					content,
					count,
					pagination: codeResults.pagination,
				});

				methodLogger.debug(`Found ${count} matching code files`);
			} catch (error) {
				methodLogger.warn('Code search failed:', error);
			}
		})(),
	);

	// Wait for all search promises to complete
	await Promise.all(searchPromises);

	// If we didn't find any results, provide a message
	if (results.length === 0 || results.every((r) => r.count === 0)) {
		return {
			content: `No results found for query "${query}" across any search scope.`,
		};
	}

	// Sort results by count (most matches first)
	results.sort((a, b) => b.count - a.count);

	// Create a summary section
	const summaryLines = [`# Search Results for "${query}"\n`];
	summaryLines.push('## Summary of Results\n');

	results.forEach((result) => {
		const countText = result.count === 1 ? 'match' : 'matches';
		summaryLines.push(
			`- **${result.scope}**: ${result.count} ${countText}`,
		);
	});

	// Add note about language filtering if applied
	if (language) {
		summaryLines.push('');
		summaryLines.push(
			`> **Note:** Language filtering for '${language}' is applied to code search results as a best effort. Results may include files in other languages based on Bitbucket's language detection.`,
		);
	}

	// Create content sections for each scope with results
	const contentSections: string[] = [];

	for (const result of results) {
		if (result.count > 0) {
			contentSections.push(
				`\n## Results from ${result.scope}\n\n${result.content}`,
			);
		}
	}

	// Combine everything
	const combinedContent =
		summaryLines.join('\n') + '\n' + contentSections.join('\n');

	// For pagination, use the pagination from the first scope with results
	// In a production environment, we would need a more sophisticated approach to handle pagination across scopes
	const firstResultWithPagination = results.find(
		(r) => r.pagination?.hasMore,
	);

	return {
		content: combinedContent,
		pagination: firstResultWithPagination?.pagination,
		metadata: {
			totalScopes: results.length,
			scopeResults: results.map((r) => ({
				scope: r.scope,
				count: r.count,
			})),
		},
	};
}

export default { search };
