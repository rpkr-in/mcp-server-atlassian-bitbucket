import { Logger } from '../utils/logger.util.js';
import { ContentType } from '../utils/atlassian.util.js';
import { handleCodeSearch } from './atlassian.search.code.controller.js';
import { handleContentSearch } from './atlassian.search.content.controller.js';
import { handleRepositorySearch } from './atlassian.search.repositories.controller.js';
import { handlePullRequestSearch } from './atlassian.search.pullrequests.controller.js';
import { DEFAULT_PAGE_SIZE, applyDefaults } from '../utils/defaults.util.js';
import { ControllerResponse } from '../types/common.types.js';
import { handleControllerError } from '../utils/error-handler.util.js';

// Logger instance for this module
const logger = Logger.forContext('controllers/atlassian.search.controller.ts');

/**
 * Search interface options
 */
export interface SearchOptions {
	/** The workspace to search in */
	workspace?: string;
	/** The repository to search in (optional) */
	repo?: string;
	/** The search query */
	query?: string;
	/** The type of search to perform */
	type?: string;
	/** The content type to filter by (for content search) */
	contentType?: string;
	/** The language to filter by (for code search) */
	language?: string;
	/** File extension to filter by (for code search) */
	extension?: string;
	/** Maximum number of results to return */
	limit?: number;
	/** Pagination cursor */
	cursor?: string;
}

/**
 * Perform a search across various Bitbucket data types
 *
 * @param options Search options
 * @returns Formatted search results
 */
async function search(
	options: SearchOptions = {},
): Promise<ControllerResponse> {
	const methodLogger = logger.forMethod('search');

	try {
		// Apply default values
		const defaults: Partial<SearchOptions> = {
			type: 'code',
			workspace: '',
			limit: DEFAULT_PAGE_SIZE,
		};
		const params = applyDefaults<SearchOptions>(options, defaults);
		methodLogger.debug('Search options (with defaults):', params);

		// Validate parameters
		if (!params.workspace) {
			methodLogger.warn('No workspace provided for search');
			return {
				content: 'Error: Please provide a workspace to search in.',
			};
		}

		// Convert content type string to enum if provided (outside the switch statement)
		let contentTypeEnum: ContentType | undefined = undefined;
		if (params.contentType) {
			contentTypeEnum = params.contentType.toLowerCase() as ContentType;
		}

		// Dispatch to the appropriate search function based on type
		switch (params.type?.toLowerCase()) {
			case 'code':
				return await handleCodeSearch(
					params.workspace,
					params.repo,
					params.query,
					params.limit,
					params.cursor,
					params.language,
					params.extension,
				);

			case 'content':
				return await handleContentSearch(
					params.workspace,
					params.repo,
					params.query,
					params.limit,
					params.cursor,
					contentTypeEnum,
				);

			case 'repos':
			case 'repositories':
				return await handleRepositorySearch(
					params.workspace,
					params.repo,
					params.query,
					params.limit,
					params.cursor,
				);

			case 'prs':
			case 'pullrequests':
				if (!params.repo) {
					return {
						content:
							'Error: Repository is required for pull request search.',
					};
				}
				return await handlePullRequestSearch(
					params.workspace,
					params.repo,
					params.query,
					params.limit,
					params.cursor,
				);

			default:
				methodLogger.warn(`Unknown search type: ${params.type}`);
				return {
					content: `Error: Unknown search type "${params.type}". Supported types are: code, content, repositories, pullrequests.`,
				};
		}
	} catch (error) {
		// Pass the error to the handler with context
		throw handleControllerError(error, {
			entityType: 'Search',
			operation: 'search',
			source: 'controllers/atlassian.search.controller.ts@search',
			additionalInfo: options as Record<string, unknown>,
		});
	}
}

export default { search };
