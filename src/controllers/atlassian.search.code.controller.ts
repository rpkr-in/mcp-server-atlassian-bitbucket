import { Logger } from '../utils/logger.util.js';
import { ControllerResponse } from '../types/common.types.js';
import { DEFAULT_PAGE_SIZE } from '../utils/defaults.util.js';
import atlassianSearchService from '../services/vendor.atlassian.search.service.js';
import {
	extractPaginationInfo,
	PaginationType,
} from '../utils/pagination.util.js';
import { formatPagination } from '../utils/formatter.util.js';
import { formatCodeSearchResults } from './atlassian.search.formatter.js';

/**
 * Handle search for code content (uses Bitbucket's Code Search API)
 */
export async function handleCodeSearch(
	workspaceSlug: string,
	repoSlug?: string,
	query?: string,
	limit: number = DEFAULT_PAGE_SIZE,
	cursor?: string,
	language?: string,
	extension?: string,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.search.code.controller.ts',
		'handleCodeSearch',
	);
	methodLogger.debug('Performing code search');

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

		// Post-filter by language if specified and Bitbucket API returned mixed results
		let filteredValues = searchResponse.values || [];
		let originalSize = searchResponse.size;

		if (language && filteredValues.length > 0) {
			// Language extension mapping for post-filtering
			const languageExtMap: Record<string, string[]> = {
				hcl: ['.tf', '.tfvars', '.hcl'],
				terraform: ['.tf', '.tfvars', '.hcl'],
				java: ['.java', '.class', '.jar'],
				javascript: ['.js', '.jsx', '.mjs'],
				typescript: ['.ts', '.tsx'],
				python: ['.py', '.pyw', '.pyc'],
				ruby: ['.rb', '.rake'],
				go: ['.go'],
				rust: ['.rs'],
				c: ['.c', '.h'],
				cpp: ['.cpp', '.cc', '.cxx', '.h', '.hpp'],
				csharp: ['.cs'],
				php: ['.php'],
				html: ['.html', '.htm'],
				css: ['.css'],
				shell: ['.sh', '.bash', '.zsh'],
				sql: ['.sql'],
				yaml: ['.yml', '.yaml'],
				json: ['.json'],
				xml: ['.xml'],
				markdown: ['.md', '.markdown'],
			};

			// Normalize the language name to lowercase
			const normalizedLang = language.toLowerCase();
			const extensions = languageExtMap[normalizedLang] || [];

			// Only apply post-filtering if we have extension mappings for this language
			if (extensions.length > 0) {
				const beforeFilterCount = filteredValues.length;

				// Filter results to only include files with the expected extensions
				filteredValues = filteredValues.filter((result) => {
					const filePath = result.file.path.toLowerCase();
					return extensions.some((ext) => filePath.endsWith(ext));
				});

				const afterFilterCount = filteredValues.length;

				if (afterFilterCount !== beforeFilterCount) {
					methodLogger.debug(
						`Post-filtered code search results by language=${language}: ${afterFilterCount} of ${beforeFilterCount} matched extensions ${extensions.join(', ')}`,
					);

					// Adjust the size estimate
					originalSize = searchResponse.size;
					const filterRatio = afterFilterCount / beforeFilterCount;
					searchResponse.size = Math.max(
						afterFilterCount,
						Math.ceil(searchResponse.size * filterRatio),
					);

					methodLogger.debug(
						`Adjusted size from ${originalSize} to ${searchResponse.size} based on filtering`,
					);
				}
			}
		}

		// Extract pagination information
		const transformedResponse = {
			pagelen: limit,
			page: page,
			size: searchResponse.size,
			values: filteredValues,
			next: 'available', // Fallback to 'available' since searchResponse doesn't have a next property
		};

		const pagination = extractPaginationInfo(
			transformedResponse,
			PaginationType.PAGE,
		);

		// Format the code search results
		let formattedCode = formatCodeSearchResults({
			...searchResponse,
			values: filteredValues,
		});

		// Add note about language filtering if applied
		if (language) {
			// Make it clear that language filtering is a best-effort by the API and we've improved it
			const languageNote = `> **Note:** Language filtering for '${language}' combines Bitbucket API filtering with client-side filtering for more accurate results. Due to limitations in the Bitbucket API, some files in other languages might still appear in search results, and filtering is based on file extensions rather than content analysis. This is a known limitation of the Bitbucket API that this tool attempts to mitigate through additional filtering.`;
			formattedCode = `${languageNote}\n\n${formattedCode}`;
		}

		// Add pagination information if available
		let finalContent = formattedCode;
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
		methodLogger.error('Error performing code search:', searchError);
		throw searchError;
	}
}
