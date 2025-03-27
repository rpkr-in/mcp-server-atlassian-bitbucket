import { createAuthMissingError } from '../utils/error.util.js';
import { Logger } from '../utils/logger.util.js';
import {
	fetchAtlassian,
	getAtlassianCredentials,
} from '../utils/transport.util.js';
import {
	RepositoryDetailed,
	RepositoriesResponse,
	ListRepositoriesParams,
	GetRepositoryParams,
} from './vendor.atlassian.repositories.types.js';

/**
 * Base API path for Bitbucket REST API v2
 * @see https://developer.atlassian.com/cloud/bitbucket/rest/api-group-repositories/
 * @constant {string}
 */
const API_PATH = '/2.0';

/**
 * @namespace VendorAtlassianRepositoriesService
 * @description Service for interacting with Bitbucket Repositories API.
 * Provides methods for listing repositories and retrieving repository details.
 * All methods require valid Atlassian credentials configured in the environment.
 */

// Create a contextualized logger for this file
const serviceLogger = Logger.forContext(
	'services/vendor.atlassian.repositories.service.ts',
);

// Log service initialization
serviceLogger.debug('Bitbucket repositories service initialized');

/**
 * List repositories for a workspace
 * @param {string} workspace - Workspace name or UUID
 * @param {ListRepositoriesParams} [params={}] - Optional parameters
 * @param {string} [params.q] - Query string to filter repositories
 * @param {string} [params.sort] - Property to sort by (e.g., 'name', '-created_on')
 * @param {number} [params.page] - Page number for pagination
 * @param {number} [params.pagelen] - Number of items per page
 * @returns {Promise<RepositoriesResponse>} Response containing repositories
 * @example
 * ```typescript
 * // List repositories in a workspace, filtered and sorted
 * const response = await listRepositories('myworkspace', {
 *   q: 'name~"api"',
 *   sort: 'name',
 *   pagelen: 25
 * });
 * ```
 */
async function list(
	params: ListRepositoriesParams,
): Promise<RepositoriesResponse> {
	const methodLogger = Logger.forContext(
		'services/vendor.atlassian.repositories.service.ts',
		'list',
	);
	methodLogger.debug('Listing Bitbucket repositories with params:', params);

	if (!params.workspace) {
		throw new Error('Workspace parameter is required');
	}

	const credentials = getAtlassianCredentials();
	if (!credentials) {
		throw createAuthMissingError(
			'Atlassian credentials are required for this operation',
		);
	}

	// Construct query parameters
	const queryParams = new URLSearchParams();

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
	const path = `${API_PATH}/repositories/${params.workspace}${queryString}`;

	methodLogger.debug(`Sending request to: ${path}`);
	return fetchAtlassian<RepositoriesResponse>(credentials, path);
}

/**
 * Get detailed information about a specific Bitbucket repository
 *
 * Retrieves comprehensive details about a single repository.
 *
 * @async
 * @memberof VendorAtlassianRepositoriesService
 * @param {GetRepositoryParams} params - Parameters for the request
 * @param {string} params.workspace - The workspace slug
 * @param {string} params.repo_slug - The repository slug
 * @returns {Promise<RepositoryDetailed>} Promise containing the detailed repository information
 * @throws {Error} If Atlassian credentials are missing or API request fails
 * @example
 * // Get repository details
 * const repository = await get({
 *   workspace: 'my-workspace',
 *   repo_slug: 'my-repo'
 * });
 */
async function get(params: GetRepositoryParams): Promise<RepositoryDetailed> {
	const methodLogger = Logger.forContext(
		'services/vendor.atlassian.repositories.service.ts',
		'get',
	);
	methodLogger.debug(
		`Getting Bitbucket repository: ${params.workspace}/${params.repo_slug}`,
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

	const path = `${API_PATH}/repositories/${params.workspace}/${params.repo_slug}`;

	methodLogger.debug(`Sending request to: ${path}`);
	return fetchAtlassian<RepositoryDetailed>(credentials, path);
}

export default { list, get };
