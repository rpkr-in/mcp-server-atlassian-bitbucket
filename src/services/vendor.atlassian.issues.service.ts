import { createAuthMissingError } from '../utils/error.util.js';
import { logger } from '../utils/logger.util.js';
import {
	fetchAtlassian,
	getAtlassianCredentials,
} from '../utils/transport.util.js';
import {
	Issue,
	IssuesResponse,
	SearchIssuesParams,
	GetIssueByIdParams,
} from './vendor.atlassian.issues.types.js';

/**
 * Base API path for Jira REST API v3
 * @see https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/
 * @constant {string}
 */
const API_PATH = '/rest/api/3';

/**
 * @namespace VendorAtlassianIssuesService
 * @description Service for interacting with Jira Issues API.
 * Provides methods for searching issues and retrieving issue details.
 * All methods require valid Atlassian credentials configured in the environment.
 */

/**
 * Search Jira issues with JQL and optional filtering and pagination
 *
 * Retrieves a list of issues from Jira based on JQL query with support for various filters
 * and pagination options. Issues can be filtered by fields, properties, etc.
 *
 * @async
 * @memberof VendorAtlassianIssuesService
 * @param {SearchIssuesParams} [params={}] - Optional parameters for customizing the request
 * @param {string} [params.jql] - JQL query string to filter issues
 * @param {number} [params.startAt] - Pagination start index
 * @param {number} [params.maxResults] - Maximum number of results to return
 * @param {string[]} [params.fields] - Fields to include in the response
 * @param {string[]} [params.expand] - Fields to expand in the response
 * @param {boolean} [params.validateQuery] - Whether to validate the JQL query
 * @param {string[]} [params.properties] - Properties to include in the response
 * @param {boolean} [params.fieldsByKeys] - Whether to return fields by keys
 * @param {string} [params.nextPageToken] - Token for retrieving the next page of results
 * @param {boolean} [params.reconcileIssues] - Whether to reconcile issues
 * @returns {Promise<IssuesResponse>} Promise containing the issues response with results and pagination info
 * @throws {Error} If Atlassian credentials are missing or API request fails
 * @example
 * // Search for issues in a specific project
 * const response = await search({
 *   jql: 'project = HSP',
 *   maxResults: 10
 * });
 */
async function search(
	params: SearchIssuesParams = {},
): Promise<IssuesResponse> {
	const logPrefix =
		'[src/services/vendor.atlassian.issues.service.ts@search]';
	logger.debug(`${logPrefix} Searching Jira issues with params:`, params);

	const credentials = getAtlassianCredentials();
	if (!credentials) {
		throw createAuthMissingError(
			'Atlassian credentials are required for this operation',
		);
	}

	// Build query parameters
	const queryParams = new URLSearchParams();

	// JQL query
	if (params.jql) {
		queryParams.set('jql', params.jql);
	}

	// Pagination
	if (params.startAt !== undefined) {
		queryParams.set('startAt', params.startAt.toString());
	}
	if (params.maxResults !== undefined) {
		queryParams.set('maxResults', params.maxResults.toString());
	}

	// Fields and expansion
	if (params.fields?.length) {
		queryParams.set('fields', params.fields.join(','));
	}
	if (params.expand?.length) {
		queryParams.set('expand', params.expand.join(','));
	}

	// Additional options
	if (params.validateQuery !== undefined) {
		queryParams.set('validateQuery', params.validateQuery.toString());
	}
	if (params.properties?.length) {
		queryParams.set('properties', params.properties.join(','));
	}
	if (params.fieldsByKeys !== undefined) {
		queryParams.set('fieldsByKeys', params.fieldsByKeys.toString());
	}
	if (params.nextPageToken) {
		queryParams.set('nextPageToken', params.nextPageToken);
	}
	if (params.reconcileIssues !== undefined) {
		queryParams.set('reconcileIssues', params.reconcileIssues.toString());
	}

	const queryString = queryParams.toString()
		? `?${queryParams.toString()}`
		: '';
	const path = `${API_PATH}/search${queryString}`;

	logger.debug(`${logPrefix} Sending request to: ${path}`);
	return fetchAtlassian<IssuesResponse>(credentials, path);
}

/**
 * Get detailed information about a specific Jira issue
 *
 * Retrieves comprehensive details about a single issue, including fields,
 * comments, attachments, and other metadata.
 *
 * @async
 * @memberof VendorAtlassianIssuesService
 * @param {string} issueIdOrKey - The ID or key of the issue to retrieve
 * @param {GetIssueByIdParams} [params={}] - Optional parameters for customizing the response
 * @param {string[]} [params.fields] - Fields to include in the response
 * @param {string[]} [params.expand] - Fields to expand in the response
 * @param {string[]} [params.properties] - Properties to include in the response
 * @param {boolean} [params.fieldsByKeys] - Whether to return fields by keys
 * @param {boolean} [params.updateHistory] - Whether to update the issue view history
 * @returns {Promise<Issue>} Promise containing the detailed issue information
 * @throws {Error} If Atlassian credentials are missing or API request fails
 * @example
 * // Get issue details with specific fields
 * const issue = await get('HSP-123', {
 *   fields: ['summary', 'description', 'status'],
 *   updateHistory: true
 * });
 */
async function get(
	issueIdOrKey: string,
	params: GetIssueByIdParams = {},
): Promise<Issue> {
	const logPrefix = '[src/services/vendor.atlassian.issues.service.ts@get]';
	logger.debug(
		`${logPrefix} Getting Jira issue with ID/key: ${issueIdOrKey}, params:`,
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

	// Fields and expansion
	if (params.fields?.length) {
		queryParams.set('fields', params.fields.join(','));
	}
	if (params.expand?.length) {
		queryParams.set('expand', params.expand.join(','));
	}

	// Additional options
	if (params.properties?.length) {
		queryParams.set('properties', params.properties.join(','));
	}
	if (params.fieldsByKeys !== undefined) {
		queryParams.set('fieldsByKeys', params.fieldsByKeys.toString());
	}
	if (params.updateHistory !== undefined) {
		queryParams.set('updateHistory', params.updateHistory.toString());
	}

	const queryString = queryParams.toString()
		? `?${queryParams.toString()}`
		: '';
	const path = `${API_PATH}/issue/${issueIdOrKey}${queryString}`;

	logger.debug(`${logPrefix} Sending request to: ${path}`);
	return fetchAtlassian<Issue>(credentials, path);
}

export default { search, get };
