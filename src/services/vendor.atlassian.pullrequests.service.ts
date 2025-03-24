import { createAuthMissingError } from '../utils/error.util.js';
import { logger } from '../utils/logger.util.js';
import {
	fetchAtlassian,
	getAtlassianCredentials,
} from '../utils/transport.util.js';
import {
	PullRequestDetailed,
	PullRequestsResponse,
	ListPullRequestsParams,
	GetPullRequestParams,
} from './vendor.atlassian.pullrequests.types.js';

/**
 * Base API path for Bitbucket REST API v2
 * @see https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pullrequests/
 * @constant {string}
 */
const API_PATH = '/2.0';

/**
 * @namespace VendorAtlassianPullRequestsService
 * @description Service for interacting with Bitbucket Pull Requests API.
 * Provides methods for listing pull requests and retrieving pull request details.
 * All methods require valid Atlassian credentials configured in the environment.
 */

/**
 * List pull requests for a repository
 * @param {ListPullRequestsParams} params - Parameters for the request
 * @param {string} params.workspace - The workspace slug or UUID
 * @param {string} params.repo_slug - The repository slug or UUID
 * @param {PullRequestState | PullRequestState[]} [params.state] - Filter by pull request state (default: 'OPEN')
 * @param {string} [params.q] - Query string to filter pull requests
 * @param {string} [params.sort] - Property to sort by (e.g., 'created_on', '-updated_on')
 * @param {number} [params.page] - Page number for pagination
 * @param {number} [params.pagelen] - Number of items per page
 * @returns {Promise<PullRequestsResponse>} Response containing pull requests
 * @example
 * ```typescript
 * // List open pull requests in a repository, sorted by creation date
 * const response = await list({
 *   workspace: 'myworkspace',
 *   repo_slug: 'myrepo',
 *   sort: '-created_on',
 *   pagelen: 25
 * });
 * ```
 */
async function list(
	params: ListPullRequestsParams,
): Promise<PullRequestsResponse> {
	const logPrefix =
		'[src/services/vendor.atlassian.pullrequests.service.ts@list]';
	logger.debug(
		`${logPrefix} Listing Bitbucket pull requests with params:`,
		params,
	);

	if (!params.workspace || !params.repo_slug) {
		throw new Error('Both workspace and repo_slug parameters are required');
	}

	const credentials = getAtlassianCredentials();
	if (!credentials) {
		throw createAuthMissingError(
			'Atlassian credentials are required for this operation',
		);
	}

	// Construct query parameters
	const queryParams = new URLSearchParams();

	// Add state parameter(s) - default to OPEN if not specified
	if (params.state) {
		if (Array.isArray(params.state)) {
			// For multiple states, repeat the parameter
			params.state.forEach((state) => {
				queryParams.append('state', state);
			});
		} else {
			queryParams.set('state', params.state);
		}
	} else {
		// Default to OPEN if not specified
		queryParams.set('state', 'OPEN');
	}

	// Add optional query parameters
	if (params.q) {
		queryParams.set('q', params.q);
	}
	if (params.sort) {
		queryParams.set('sort', params.sort);
	}
	if (params.pagelen) {
		queryParams.set('pagelen', params.pagelen.toString());
	}
	if (params.page) {
		queryParams.set('page', params.page.toString());
	}

	const queryString = queryParams.toString()
		? `?${queryParams.toString()}`
		: '';
	const path = `${API_PATH}/repositories/${params.workspace}/${params.repo_slug}/pullrequests${queryString}`;

	logger.debug(`${logPrefix} Sending request to: ${path}`);
	return fetchAtlassian<PullRequestsResponse>(credentials, path);
}

/**
 * Get detailed information about a specific Bitbucket pull request
 *
 * Retrieves comprehensive details about a single pull request.
 *
 * @async
 * @memberof VendorAtlassianPullRequestsService
 * @param {GetPullRequestParams} params - Parameters for the request
 * @param {string} params.workspace - The workspace slug or UUID
 * @param {string} params.repo_slug - The repository slug or UUID
 * @param {number} params.pull_request_id - The ID of the pull request
 * @returns {Promise<PullRequestDetailed>} Promise containing the detailed pull request information
 * @throws {Error} If Atlassian credentials are missing or API request fails
 * @example
 * // Get pull request details
 * const pullRequest = await get({
 *   workspace: 'my-workspace',
 *   repo_slug: 'my-repo',
 *   pull_request_id: 123
 * });
 */
async function get(params: GetPullRequestParams): Promise<PullRequestDetailed> {
	const logPrefix =
		'[src/services/vendor.atlassian.pullrequests.service.ts@get]';
	logger.debug(
		`${logPrefix} Getting Bitbucket pull request: ${params.workspace}/${params.repo_slug}/${params.pull_request_id}`,
	);

	if (!params.workspace || !params.repo_slug || !params.pull_request_id) {
		throw new Error(
			'workspace, repo_slug, and pull_request_id parameters are all required',
		);
	}

	const credentials = getAtlassianCredentials();
	if (!credentials) {
		throw createAuthMissingError(
			'Atlassian credentials are required for this operation',
		);
	}

	const path = `${API_PATH}/repositories/${params.workspace}/${params.repo_slug}/pullrequests/${params.pull_request_id}`;

	logger.debug(`${logPrefix} Sending request to: ${path}`);
	return fetchAtlassian<PullRequestDetailed>(credentials, path);
}

export default { list, get };
