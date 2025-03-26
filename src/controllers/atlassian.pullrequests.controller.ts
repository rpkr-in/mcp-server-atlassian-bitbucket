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
	GetPullRequestOptions,
	PullRequestIdentifier,
} from './atlassian.pullrequests.type.js';
import {
	formatPullRequestsList,
	formatPullRequestDetails,
} from './atlassian.pullrequests.formatter.js';
import {
	ListPullRequestsParams,
	GetPullRequestParams,
} from '../services/vendor.atlassian.pullrequests.types.js';

// Default constants
const DEFAULT_PAGE_LENGTH = 25;

/**
 * Controller for managing Bitbucket pull requests.
 * Provides functionality for listing pull requests and retrieving pull request details.
 */

/**
 * List Bitbucket pull requests with optional filtering
 * @param options - Options for listing pull requests
 * @param options.workspace - The workspace slug containing the repository
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
		if (!options.workspace || !options.repoSlug) {
			throw createApiError(
				'Both workspace and repoSlug parameters are required',
			);
		}

		// Map controller filters to service params
		const serviceParams: ListPullRequestsParams = {
			// Required parameters
			workspace: options.workspace,
			repo_slug: options.repoSlug,

			// Optional parameters
			q: options.state ? `state="${options.state}"` : undefined,
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
		const formattedPullRequests = formatPullRequestsList(
			pullRequestsData,
			pagination,
		);

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
				workspace: options.workspace,
				repoSlug: options.repoSlug,
			},
		});
	}
}

/**
 * Get details of a specific Bitbucket pull request
 * @param identifier - Object containing pull request identifiers
 * @param identifier.workspace - The workspace slug containing the repository
 * @param identifier.repoSlug - The repository slug containing the pull request
 * @param identifier.pullRequestId - The pull request ID
 * @param options - Options for retrieving the pull request details
 * @returns Promise with formatted pull request details content
 * @throws Error if pull request retrieval fails
 */
async function get(
	identifier: PullRequestIdentifier,
	options: GetPullRequestOptions = {},
): Promise<ControllerResponse> {
	const { workspace, repoSlug, pullRequestId } = identifier;

	logger.debug(
		`[src/controllers/atlassian.pullrequests.controller.ts@get] Getting pull request details for ${workspace}/${repoSlug}/${pullRequestId}...`,
		options,
	);

	try {
		// Get basic pull request information
		const params: GetPullRequestParams = {
			workspace,
			repo_slug: repoSlug,
			pull_request_id: parseInt(pullRequestId, 10),
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
			additionalInfo: { options },
		});
	}
}

export default { list, get };
