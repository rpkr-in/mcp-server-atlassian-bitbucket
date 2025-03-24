import { createAuthMissingError } from '../utils/error.util.js';
import { logger } from '../utils/logger.util.js';
import {
	fetchAtlassian,
	getAtlassianCredentials,
} from '../utils/transport.util.js';
import {
	WorkspaceDetailed,
	WorkspacePermissionsResponse,
	ListWorkspacesParams,
} from './vendor.atlassian.workspaces.types.js';

/**
 * Base API path for Bitbucket REST API v2
 * @see https://developer.atlassian.com/cloud/bitbucket/rest/api-group-workspaces/
 * @constant {string}
 */
const API_PATH = '/2.0';

/**
 * @namespace VendorAtlassianWorkspacesService
 * @description Service for interacting with Bitbucket Workspaces API.
 * Provides methods for listing workspaces and retrieving workspace details.
 * All methods require valid Atlassian credentials configured in the environment.
 */

/**
 * List Bitbucket workspaces with optional filtering and pagination
 *
 * Retrieves a list of workspaces from Bitbucket with support for various filters
 * and pagination options.
 *
 * @async
 * @memberof VendorAtlassianWorkspacesService
 * @param {ListWorkspacesParams} [params={}] - Optional parameters for customizing the request
 * @param {string} [params.sort] - Sort order for results
 * @param {string} [params.q] - Filter by workspace name
 * @param {number} [params.page] - Page number
 * @param {number} [params.pagelen] - Number of items per page
 * @returns {Promise<WorkspacePermissionsResponse>} Promise containing the workspaces response with results and pagination info
 * @throws {Error} If Atlassian credentials are missing or API request fails
 * @example
 * // List workspaces with pagination
 * const response = await list({
 *   pagelen: 10
 * });
 */
async function list(
	params: ListWorkspacesParams = {},
): Promise<WorkspacePermissionsResponse> {
	const logPrefix =
		'[src/services/vendor.atlassian.workspaces.service.ts@list]';
	logger.debug(
		`${logPrefix} Listing Bitbucket workspaces with params:`,
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

	// Add optional query parameters if provided
	if (params.sort) {
		queryParams.set('sort', params.sort);
	}
	if (params.q) {
		queryParams.set('q', params.q);
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
	const path = `${API_PATH}/user/permissions/workspaces${queryString}`;

	logger.debug(`${logPrefix} Sending request to: ${path}`);
	return fetchAtlassian<WorkspacePermissionsResponse>(credentials, path);
}

/**
 * Get detailed information about a specific Bitbucket workspace
 *
 * Retrieves comprehensive details about a single workspace.
 *
 * @async
 * @memberof VendorAtlassianWorkspacesService
 * @param {string} workspace - The workspace slug
 * @returns {Promise<WorkspaceDetailed>} Promise containing the detailed workspace information
 * @throws {Error} If Atlassian credentials are missing or API request fails
 * @example
 * // Get workspace details
 * const workspace = await get('my-workspace');
 */
async function get(workspace: string): Promise<WorkspaceDetailed> {
	const logPrefix =
		'[src/services/vendor.atlassian.workspaces.service.ts@get]';
	logger.debug(
		`${logPrefix} Getting Bitbucket workspace with slug: ${workspace}`,
	);

	const credentials = getAtlassianCredentials();
	if (!credentials) {
		throw createAuthMissingError(
			'Atlassian credentials are required for this operation',
		);
	}

	// Currently no query parameters for workspace details API
	const path = `${API_PATH}/workspaces/${workspace}`;

	logger.debug(`${logPrefix} Sending request to: ${path}`);
	return fetchAtlassian<WorkspaceDetailed>(credentials, path);
}

export default { list, get };
