import { createAuthMissingError } from '../utils/error.util.js';
import { logger } from '../utils/logger.util.js';
import {
	fetchAtlassian,
	getAtlassianCredentials,
} from '../utils/transport.util.js';
import {
	ProjectDetailed,
	ProjectsResponse,
	ListProjectsParams,
	GetProjectByIdParams,
} from './vendor.atlassian.projects.types.js';

/**
 * Base API path for Jira REST API v3
 * @see https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/
 * @constant {string}
 */
const API_PATH = '/rest/api/3';

/**
 * @namespace VendorAtlassianProjectsService
 * @description Service for interacting with Jira Projects API.
 * Provides methods for listing projects and retrieving project details.
 * All methods require valid Atlassian credentials configured in the environment.
 */

/**
 * List Jira projects with optional filtering and pagination
 *
 * Retrieves a list of projects from Jira with support for various filters
 * and pagination options. Projects can be filtered by IDs, keys, query, etc.
 *
 * @async
 * @memberof VendorAtlassianProjectsService
 * @param {ListProjectsParams} [params={}] - Optional parameters for customizing the request
 * @param {string[]} [params.ids] - Filter by project IDs
 * @param {string[]} [params.keys] - Filter by project keys
 * @param {string} [params.query] - Filter by project name or key
 * @param {string} [params.typeKey] - Filter by project type
 * @param {string} [params.categoryId] - Filter by project category ID
 * @param {string} [params.action] - Filter by user action
 * @param {string[]} [params.expand] - Fields to expand in the response
 * @param {string[]} [params.status] - Filter by project status
 * @param {string} [params.orderBy] - Sort order for results
 * @param {number} [params.startAt] - Pagination start index
 * @param {number} [params.maxResults] - Maximum number of results to return
 * @returns {Promise<ProjectsResponse>} Promise containing the projects response with results and pagination info
 * @throws {Error} If Atlassian credentials are missing or API request fails
 * @example
 * // List projects with pagination
 * const response = await list({
 *   maxResults: 10,
 *   orderBy: 'key'
 * });
 */
async function list(
	params: ListProjectsParams = {},
): Promise<ProjectsResponse> {
	const logPrefix =
		'[src/services/vendor.atlassian.projects.service.ts@list]';
	logger.debug(`${logPrefix} Listing Jira projects with params:`, params);

	const credentials = getAtlassianCredentials();
	if (!credentials) {
		throw createAuthMissingError(
			'Atlassian credentials are required for this operation',
		);
	}

	// Build query parameters
	const queryParams = new URLSearchParams();

	// Project identifiers
	if (params.ids?.length) {
		queryParams.set('id', params.ids.join(','));
	}
	if (params.keys?.length) {
		queryParams.set('keys', params.keys.join(','));
	}

	// Filtering
	if (params.query) {
		queryParams.set('query', params.query);
	}
	if (params.typeKey) {
		queryParams.set('typeKey', params.typeKey);
	}
	if (params.categoryId) {
		queryParams.set('categoryId', params.categoryId);
	}
	if (params.action) {
		queryParams.set('action', params.action);
	}
	if (params.expand?.length) {
		queryParams.set('expand', params.expand.join(','));
	}
	if (params.status?.length) {
		queryParams.set('status', params.status.join(','));
	}

	// Sorting
	if (params.orderBy) {
		queryParams.set('orderBy', params.orderBy);
	}

	// Pagination
	if (params.startAt !== undefined) {
		queryParams.set('startAt', params.startAt.toString());
	}
	if (params.maxResults !== undefined) {
		queryParams.set('maxResults', params.maxResults.toString());
	}

	const queryString = queryParams.toString()
		? `?${queryParams.toString()}`
		: '';
	const path = `${API_PATH}/project/search${queryString}`;

	logger.debug(`${logPrefix} Sending request to: ${path}`);
	return fetchAtlassian<ProjectsResponse>(credentials, path);
}

/**
 * Get detailed information about a specific Jira project
 *
 * Retrieves comprehensive details about a single project, including metadata,
 * description, and optional components like versions, components, and properties.
 *
 * @async
 * @memberof VendorAtlassianProjectsService
 * @param {string} idOrKey - The ID or key of the project to retrieve
 * @param {GetProjectByIdParams} [params={}] - Optional parameters for customizing the response
 * @param {string[]} [params.expand] - Fields to expand in the response
 * @param {boolean} [params.includeComponents] - Include project components
 * @param {boolean} [params.includeVersions] - Include project versions
 * @param {boolean} [params.includeProperties] - Include project properties
 * @returns {Promise<ProjectDetailed>} Promise containing the detailed project information
 * @throws {Error} If Atlassian credentials are missing or API request fails
 * @example
 * // Get project details with components and versions
 * const project = await get('ABC', {
 *   includeComponents: true,
 *   includeVersions: true
 * });
 */
async function get(
	idOrKey: string,
	params: GetProjectByIdParams = {},
): Promise<ProjectDetailed> {
	const logPrefix = '[src/services/vendor.atlassian.projects.service.ts@get]';
	logger.debug(
		`${logPrefix} Getting Jira project with ID/key: ${idOrKey}, params:`,
		params,
	);

	const credentials = getAtlassianCredentials();
	if (!credentials) {
		throw createAuthMissingError(
			'Atlassian credentials are required for this operation',
		);
	}

	// Build query parameters
	const queryParams = new URLSearchParams();

	// Build expand parameter
	const expandItems: string[] = params.expand || [];
	if (params.includeComponents) {
		expandItems.push('components');
	}
	if (params.includeVersions) {
		expandItems.push('versions');
	}
	if (params.includeProperties) {
		expandItems.push('properties');
	}

	if (expandItems.length > 0) {
		queryParams.set('expand', expandItems.join(','));
	}

	const queryString = queryParams.toString()
		? `?${queryParams.toString()}`
		: '';
	const path = `${API_PATH}/project/${idOrKey}${queryString}`;

	logger.debug(`${logPrefix} Sending request to: ${path}`);
	return fetchAtlassian<ProjectDetailed>(credentials, path);
}

export default { list, get };
