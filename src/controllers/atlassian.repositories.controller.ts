import atlassianRepositoriesService from '../services/vendor.atlassian.repositories.service.js';
import { logger } from '../utils/logger.util.js';
import { McpError, createApiError } from '../utils/error.util.js';
import {
	ListRepositoriesOptions,
	GetRepositoryOptions,
	ControllerResponse,
} from './atlassian.repositories.type.js';
import {
	formatRepositoriesList,
	formatRepositoryDetails,
} from './atlassian.repositories.formatter.js';
import {
	ListRepositoriesParams,
	GetRepositoryParams,
} from '../services/vendor.atlassian.repositories.types.js';

/**
 * Controller for managing Bitbucket repositories.
 * Provides functionality for listing repositories and retrieving repository details.
 */

/**
 * List Bitbucket repositories with optional filtering
 * @param options - Options for listing repositories
 * @param options.workspace - The workspace slug to list repositories from
 * @param options.q - Query to filter repositories
 * @param options.sort - Sort parameter
 * @param options.role - Role filter
 * @param options.limit - Maximum number of repositories to return
 * @param options.cursor - Pagination cursor for retrieving the next set of results
 * @returns Promise with formatted repository list content and pagination information
 */
async function list(
	options: ListRepositoriesOptions,
): Promise<ControllerResponse> {
	logger.debug(
		`[src/controllers/atlassian.repositories.controller.ts@list] Listing Bitbucket repositories...`,
		options,
	);

	try {
		// Convert to service params
		const serviceParams: ListRepositoriesParams = {
			workspace: options.workspace,
			q: options.q,
			sort: options.sort,
			// Role is not supported, ignore it
			// Map cursor to page and limit to pagelen for Bitbucket API
			page: options.cursor ? parseInt(options.cursor, 10) : undefined,
			pagelen: options.limit || 50,
		};

		logger.debug(
			`[src/controllers/atlassian.repositories.controller.ts@list] Using filters:`,
			serviceParams,
		);

		const repositoriesData =
			await atlassianRepositoriesService.list(serviceParams);

		logger.debug(
			`[src/controllers/atlassian.repositories.controller.ts@list] Retrieved ${
				repositoriesData.values?.length || 0
			} repositories`,
		);

		// Extract pagination information
		let nextCursor: string | undefined;
		if (repositoriesData.next) {
			// Extract page from next URL if available
			const nextUrl = new URL(repositoriesData.next);
			const nextPage = nextUrl.searchParams.get('page');
			if (nextPage) {
				nextCursor = nextPage;
			}
		}

		// Format the repositories data for display using the formatter
		const formattedRepositories = formatRepositoriesList(
			repositoriesData,
			nextCursor,
		);

		return {
			content: formattedRepositories,
			pagination: {
				nextCursor,
				hasMore: !!nextCursor,
			},
		};
	} catch (error) {
		logger.error(
			`[src/controllers/atlassian.repositories.controller.ts@list] Error listing repositories`,
			error,
		);

		// Get the error message
		const errorMessage =
			error instanceof Error ? error.message : String(error);

		// Pass through McpErrors
		if (error instanceof McpError) {
			throw error;
		}

		// Handle specific error patterns

		// 1. Workspace not found
		if (
			errorMessage.includes('workspace') &&
			errorMessage.includes('not found')
		) {
			logger.warn(
				`[src/controllers/atlassian.repositories.controller.ts@list] Workspace not found: ${options.workspace}`,
			);

			throw createApiError(
				`Workspace not found: ${options.workspace}. Verify the workspace slug and your access permissions.`,
				404,
				error,
			);
		}

		// 2. Access denied
		if (
			errorMessage.includes('access') ||
			errorMessage.includes('permission') ||
			errorMessage.includes('authorize')
		) {
			logger.warn(
				`[src/controllers/atlassian.repositories.controller.ts@list] Access denied for workspace: ${options.workspace}`,
			);

			throw createApiError(
				`Access denied for workspace: ${options.workspace}. Verify your credentials and permissions.`,
				403,
				error,
			);
		}

		// Default: preserve original message with status code if available
		throw createApiError(
			errorMessage,
			error instanceof Error && 'statusCode' in error
				? (error as { statusCode: number }).statusCode
				: undefined,
			error,
		);
	}
}

/**
 * Get details of a specific Bitbucket repository
 * @param workspace - The workspace slug that contains the repository
 * @param repoSlug - The repository slug
 * @param options - Options for retrieving the repository details
 * @returns Promise with formatted repository details content
 * @throws Error if repository retrieval fails
 */
async function get(
	workspace: string,
	repoSlug: string,
	options: GetRepositoryOptions = {},
): Promise<ControllerResponse> {
	logger.debug(
		`[src/controllers/atlassian.repositories.controller.ts@get] Getting repository details for ${workspace}/${repoSlug}...`,
		options,
	);

	try {
		// Get basic repository information
		const params: GetRepositoryParams = {
			workspace: workspace,
			repo_slug: repoSlug,
		};

		const repositoryData = await atlassianRepositoriesService.get(params);

		logger.debug(
			`[src/controllers/atlassian.repositories.controller.ts@get] Retrieved repository: ${repositoryData.full_name}`,
		);

		// Format the repository data for display using the formatter
		// Since we don't have extra data available, pass an empty object
		const formattedRepository = formatRepositoryDetails(repositoryData);

		return {
			content: formattedRepository,
		};
	} catch (error) {
		logger.error(
			`[src/controllers/atlassian.repositories.controller.ts@get] Error getting repository`,
			error,
		);

		// Get the error message
		const errorMessage =
			error instanceof Error ? error.message : String(error);

		// Pass through McpErrors
		if (error instanceof McpError) {
			throw error;
		}

		// Handle specific error patterns

		// 1. Repository not found
		if (
			errorMessage.includes('not found') ||
			(error instanceof Error &&
				'statusCode' in error &&
				(error as { statusCode: number }).statusCode === 404)
		) {
			logger.warn(
				`[src/controllers/atlassian.repositories.controller.ts@get] Repository not found: ${workspace}/${repoSlug}`,
			);

			throw createApiError(
				`Repository not found: ${workspace}/${repoSlug}. Verify the repository slug and your access permissions.`,
				404,
				error,
			);
		}

		// 2. Access denied
		if (
			errorMessage.includes('access') ||
			errorMessage.includes('permission') ||
			errorMessage.includes('authorize') ||
			(error instanceof Error &&
				'statusCode' in error &&
				(error as { statusCode: number }).statusCode === 403)
		) {
			logger.warn(
				`[src/controllers/atlassian.repositories.controller.ts@get] Access denied for repository: ${workspace}/${repoSlug}`,
			);

			throw createApiError(
				`Access denied for repository: ${workspace}/${repoSlug}. Verify your credentials and permissions.`,
				403,
				error,
			);
		}

		// Default: preserve original message with status code if available
		throw createApiError(
			errorMessage,
			error instanceof Error && 'statusCode' in error
				? (error as { statusCode: number }).statusCode
				: undefined,
			error,
		);
	}
}

export default { list, get };
