import { z } from 'zod';
import {
	createAuthMissingError,
	createApiError,
	McpError,
} from '../utils/error.util.js';
import { Logger } from '../utils/logger.util.js';
import {
	fetchAtlassian,
	getAtlassianCredentials,
} from '../utils/transport.util.js';
import {
	ListRepositoriesParamsSchema,
	GetRepositoryParamsSchema,
	ListCommitsParamsSchema,
	RepositoriesResponseSchema,
	RepositoryDetailedSchema,
	PaginatedCommitsSchema,
	type ListRepositoriesParams,
	type GetRepositoryParams,
	type ListCommitsParams,
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
): Promise<z.infer<typeof RepositoriesResponseSchema>> {
	const methodLogger = Logger.forContext(
		'services/vendor.atlassian.repositories.service.ts',
		'list',
	);
	methodLogger.debug('Listing Bitbucket repositories with params:', params);

	// Validate params with Zod
	try {
		ListRepositoriesParamsSchema.parse(params);
	} catch (error) {
		if (error instanceof z.ZodError) {
			methodLogger.error(
				'Invalid parameters provided to list repositories:',
				error.format(),
			);
			throw createApiError(
				`Invalid parameters: ${error.errors.map((e) => e.message).join(', ')}`,
				400,
				error,
			);
		}
		throw error;
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
	try {
		const rawData = await fetchAtlassian(credentials, path);
		// Validate response with Zod schema
		try {
			const validatedData = RepositoriesResponseSchema.parse(rawData);
			return validatedData;
		} catch (error) {
			if (error instanceof z.ZodError) {
				methodLogger.error(
					'Invalid response from Bitbucket API:',
					error.format(),
				);
				throw createApiError(
					'Received invalid response format from Bitbucket API',
					500,
					error,
				);
			}
			throw error;
		}
	} catch (error) {
		if (error instanceof McpError) {
			throw error;
		}
		throw createApiError(
			`Failed to list repositories: ${error instanceof Error ? error.message : String(error)}`,
			500,
			error,
		);
	}
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
async function get(
	params: GetRepositoryParams,
): Promise<z.infer<typeof RepositoryDetailedSchema>> {
	const methodLogger = Logger.forContext(
		'services/vendor.atlassian.repositories.service.ts',
		'get',
	);
	methodLogger.debug(
		`Getting Bitbucket repository: ${params.workspace}/${params.repo_slug}`,
	);

	// Validate params with Zod
	try {
		GetRepositoryParamsSchema.parse(params);
	} catch (error) {
		if (error instanceof z.ZodError) {
			methodLogger.error(
				'Invalid parameters provided to get repository:',
				error.format(),
			);
			throw createApiError(
				`Invalid parameters: ${error.errors.map((e) => e.message).join(', ')}`,
				400,
				error,
			);
		}
		throw error;
	}

	const credentials = getAtlassianCredentials();
	if (!credentials) {
		throw createAuthMissingError(
			'Atlassian credentials are required for this operation',
		);
	}

	const path = `${API_PATH}/repositories/${params.workspace}/${params.repo_slug}`;

	methodLogger.debug(`Sending request to: ${path}`);
	try {
		const rawData = await fetchAtlassian(credentials, path);
		// Validate response with Zod schema
		try {
			const validatedData = RepositoryDetailedSchema.parse(rawData);
			return validatedData;
		} catch (error) {
			if (error instanceof z.ZodError) {
				methodLogger.error(
					'Invalid response from Bitbucket API:',
					error.format(),
				);
				throw createApiError(
					'Received invalid response format from Bitbucket API',
					500,
					error,
				);
			}
			throw error;
		}
	} catch (error) {
		if (error instanceof McpError) {
			throw error;
		}
		throw createApiError(
			`Failed to get repository details: ${error instanceof Error ? error.message : String(error)}`,
			500,
			error,
		);
	}
}

/**
 * Lists commits for a specific repository and optional revision/path.
 *
 * @param params Parameters including workspace, repo slug, and optional filters.
 * @returns Promise resolving to paginated commit data.
 * @throws {Error} If workspace or repo_slug are missing, or if credentials are not found.
 */
async function listCommits(
	params: ListCommitsParams,
): Promise<z.infer<typeof PaginatedCommitsSchema>> {
	const methodLogger = Logger.forContext(
		'services/vendor.atlassian.repositories.service.ts',
		'listCommits',
	);
	methodLogger.debug(
		`Listing commits for ${params.workspace}/${params.repo_slug}`,
		params,
	);

	// Validate params with Zod
	try {
		ListCommitsParamsSchema.parse(params);
	} catch (error) {
		if (error instanceof z.ZodError) {
			methodLogger.error(
				'Invalid parameters provided to list commits:',
				error.format(),
			);
			throw createApiError(
				`Invalid parameters: ${error.errors.map((e) => e.message).join(', ')}`,
				400,
				error,
			);
		}
		throw error;
	}

	const credentials = getAtlassianCredentials();
	if (!credentials) {
		throw createAuthMissingError(
			'Atlassian credentials are required for this operation',
		);
	}

	const queryParams = new URLSearchParams();
	if (params.include) {
		queryParams.set('include', params.include);
	}
	if (params.exclude) {
		queryParams.set('exclude', params.exclude);
	}
	if (params.path) {
		queryParams.set('path', params.path);
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
	const path = `${API_PATH}/repositories/${params.workspace}/${params.repo_slug}/commits${queryString}`;

	methodLogger.debug(`Sending commit history request to: ${path}`);
	try {
		const rawData = await fetchAtlassian(credentials, path);
		// Validate response with Zod schema
		try {
			const validatedData = PaginatedCommitsSchema.parse(rawData);
			return validatedData;
		} catch (error) {
			if (error instanceof z.ZodError) {
				methodLogger.error(
					'Invalid response from Bitbucket API:',
					error.format(),
				);
				throw createApiError(
					'Received invalid response format from Bitbucket API',
					500,
					error,
				);
			}
			throw error;
		}
	} catch (error) {
		if (error instanceof McpError) {
			throw error;
		}
		throw createApiError(
			`Failed to list commits: ${error instanceof Error ? error.message : String(error)}`,
			500,
			error,
		);
	}
}

export default { list, get, listCommits };
