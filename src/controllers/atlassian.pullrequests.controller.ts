import atlassianPullRequestsService from '../services/vendor.atlassian.pullrequests.service.js';
import { logger } from '../utils/logger.util.js';
import { createApiError } from '../utils/error.util.js';
import { handleControllerError } from '../utils/error-handler.util.js';
import {
	extractPaginationInfo,
	PaginationType,
} from '../utils/pagination.util.js';
import { ControllerResponse } from '../types/common.types.js';
import {
	ListPullRequestsOptions,
	PullRequestIdentifier,
} from './atlassian.pullrequests.types.js';
import {
	formatPullRequestsList,
	formatPullRequestDetails,
} from './atlassian.pullrequests.formatter.js';
import {
	ListPullRequestsParams,
	GetPullRequestParams,
} from '../services/vendor.atlassian.pullrequests.types.js';
import { formatBitbucketQuery } from '../utils/query.util.js';

// Default constants
const DEFAULT_PAGE_LENGTH = 25;

/**
 * Controller for managing Bitbucket pull requests.
 * Provides functionality for listing pull requests and retrieving pull request details.
 */

/**
 * List Bitbucket pull requests with optional filtering
 * @param options - Options for listing pull requests
 * @param options.workspaceSlug - The workspace slug containing the repository
 * @param options.repoSlug - The repository slug to list pull requests from
 * @param options.state - Pull request state filter
 * @param options.limit - Maximum number of pull requests to return
 * @param options.cursor - Pagination cursor for retrieving the next set of results
 * @returns Promise with formatted pull request list content and pagination information
 */
async function list(
	options: ListPullRequestsOptions,
): Promise<ControllerResponse> {
	const source =
		'[src/controllers/atlassian.pullrequests.controller.ts@list]';
	logger.debug(`${source} Listing Bitbucket pull requests...`, options);

	try {
		if (!options.workspaceSlug || !options.repoSlug) {
			throw createApiError(
				'Both workspaceSlug and repoSlug parameters are required',
			);
		}

		// Process the query parameter
		let queryParam: string | undefined;

		// State filter takes precedence over free-text query
		if (options.state) {
			queryParam = `state="${options.state}"`;
		} else if (options.query) {
			// Format the free-text query using the utility function
			queryParam = formatBitbucketQuery(options.query, 'title');
		}

		// Map controller filters to service params
		const serviceParams: ListPullRequestsParams = {
			// Required parameters
			workspace: options.workspaceSlug,
			repo_slug: options.repoSlug,

			// Optional parameters
			...(queryParam && { q: queryParam }),
			pagelen: options.limit || DEFAULT_PAGE_LENGTH,
			page: options.cursor ? parseInt(options.cursor, 10) : undefined,
		};

		logger.debug(`${source} Using filters:`, serviceParams);

		// Call the service to get the pull requests data
		const pullRequestsData =
			await atlassianPullRequestsService.list(serviceParams);

		// Log the count of pull requests retrieved
		const count = pullRequestsData.values?.length || 0;
		logger.debug(`${source} Retrieved ${count} pull requests`);

		// Extract pagination information using the utility
		const pagination = extractPaginationInfo(
			pullRequestsData,
			PaginationType.PAGE,
			source,
		);

		// Format the pull requests data for display using the formatter
		const formattedPullRequests = formatPullRequestsList(pullRequestsData);

		return {
			content: formattedPullRequests,
			pagination,
		};
	} catch (error) {
		// Use the standardized error handler
		handleControllerError(error, {
			entityType: 'Pull Requests',
			operation: 'listing',
			source: 'src/controllers/atlassian.pullrequests.controller.ts@list',
			additionalInfo: {
				options,
				workspaceSlug: options.workspaceSlug,
				repoSlug: options.repoSlug,
			},
		});
	}
}

/**
 * Get details of a specific Bitbucket pull request
 * @param identifier - Object containing pull request identifiers
 * @param identifier.workspaceSlug - The workspace slug containing the repository
 * @param identifier.repoSlug - The repository slug containing the pull request
 * @param identifier.prId - The pull request ID
 * @returns Promise with formatted pull request details content
 * @throws Error if pull request retrieval fails
 */
async function get(
	identifier: PullRequestIdentifier,
): Promise<ControllerResponse> {
	const { workspaceSlug, repoSlug, prId } = identifier;

	logger.debug(
		`[src/controllers/atlassian.pullrequests.controller.ts@get] Getting pull request details for ${workspaceSlug}/${repoSlug}/${prId}...`,
	);

	try {
		// Get basic pull request information
		const params: GetPullRequestParams = {
			workspace: workspaceSlug,
			repo_slug: repoSlug,
			pull_request_id: parseInt(prId, 10),
		};

		const pullRequestData = await atlassianPullRequestsService.get(params);

		logger.debug(
			`[src/controllers/atlassian.pullrequests.controller.ts@get] Retrieved pull request: ${pullRequestData.id}`,
		);

		// Format the pull request data for display using the formatter
		// We don't have comments data available from the service
		const formattedPullRequest = formatPullRequestDetails(pullRequestData);

		return {
			content: formattedPullRequest,
		};
	} catch (error) {
		// Use the standardized error handler
		handleControllerError(error, {
			entityType: 'Pull Request',
			entityId: identifier,
			operation: 'retrieving',
			source: 'src/controllers/atlassian.pullrequests.controller.ts@get',
		});
	}
}

export default { list, get };
