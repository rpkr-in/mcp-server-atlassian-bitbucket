import { Logger } from '../utils/logger.util.js';
import { handleControllerError } from '../utils/error-handler.util.js';
import { applyDefaults, DEFAULT_PAGE_SIZE } from '../utils/defaults.util.js';
import {
	ControllerResponse,
	ResponsePagination,
} from '../types/common.types.js';

import atlassianRepositoriesController from './atlassian.repositories.controller.js';
import atlassianPullRequestsController from './atlassian.pullrequests.controller.js';

/**
 * Search options interface
 * Defines the parameters for searching Bitbucket content
 */
export interface SearchOptions {
	workspaceSlug?: string;
	repoSlug?: string;
	query?: string;
	scope?: 'repositories' | 'pullrequests' | 'all';
	limit?: number;
	cursor?: string;
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
	const controllerLogger = Logger.forContext(
		'controllers/atlassian.search.controller.ts',
		'search',
	);
	controllerLogger.debug(
		'Searching Bitbucket content with options:',
		options,
	);

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
			combinedContent += `# Repository Search Results\n\n${repoResults.content}\n\n`;
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
		const summaryContent = `## Search Summary\n\nFound ${totalCount} results for query "${query}" in workspace "${workspaceSlug}".\n\n${combinedContent}`;

		// Create pagination response
		const pagination: ResponsePagination = {
			count: totalCount,
			hasMore,
			// We don't have a proper way to combine cursors from both sources,
			// so we just use one of them if available (not ideal but functional)
			nextCursor:
				(repoResults.pagination as ResponsePagination | undefined)
					?.nextCursor ||
				(prResults.pagination as ResponsePagination | undefined)
					?.nextCursor,
		};

		controllerLogger.debug(
			'Successfully retrieved and formatted search results',
			{ totalCount, hasMore },
		);

		return {
			content: summaryContent,
			pagination,
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
};
