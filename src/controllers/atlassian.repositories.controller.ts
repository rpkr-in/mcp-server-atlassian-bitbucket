import atlassianRepositoriesService from '../services/vendor.atlassian.repositories.service.js';
import { logger } from '../utils/logger.util.js';
import { McpError, createApiError } from '../utils/error.util.js';
import {
	ListRepositoriesOptions,
	GetRepositoryOptions,
	RepositoryIdentifier,
	ControllerResponse,
} from './atlassian.repositories.type.js';
import {
	formatRepositoriesList,
	formatRepositoryDetails,
} from './atlassian.repositories.formatter.js';
import { ListRepositoriesParams } from '../services/vendor.atlassian.repositories.types.js';

/**
 * Controller for managing Bitbucket repositories.
 * Provides functionality for listing repositories and retrieving repository details.
 */

/**
 * List Bitbucket repositories with optional filtering
 * @param options - Optional filter options for the repositories list
 * @param options.workspace - The workspace slug
 * @param options.q - Text query to filter repositories
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
		if (!options.workspace) {
			throw createApiError(
				'Workspace is required to list repositories',
				400,
			);
		}

		// Convert to service params
		const serviceParams: ListRepositoriesParams = {
			workspace: options.workspace,
			q: options.q,
			sort: options.sort,
			page: options.page,
			pagelen: options.pagelen,
		};

		logger.debug(
			`[src/controllers/atlassian.repositories.controller.ts@list] Using filters:`,
			serviceParams,
		);

		const repositoriesData =
			await atlassianRepositoriesService.list(serviceParams);
		// Log only the count of repositories returned instead of the entire response
		logger.debug(
			`[src/controllers/atlassian.repositories.controller.ts@list] Retrieved ${repositoriesData.values?.length || 0} repositories`,
		);

		// Calculate the next page number if needed
		let nextPage: number | undefined;
		if (
			repositoriesData.page !== undefined &&
			repositoriesData.pagelen !== undefined &&
			repositoriesData.size !== undefined &&
			repositoriesData.page * repositoriesData.pagelen <
				repositoriesData.size
		) {
			nextPage = repositoriesData.page + 1;
			logger.debug(
				`[src/controllers/atlassian.repositories.controller.ts@list] Next page: ${nextPage}`,
			);
		}

		// Format the repositories data for display using the formatter
		const formattedRepositories = formatRepositoriesList(
			repositoriesData,
			options.workspace,
			nextPage,
		);

		return {
			content: formattedRepositories,
			pagination: {
				nextCursor:
					nextPage !== undefined ? String(nextPage) : undefined,
				hasMore: nextPage !== undefined,
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

		// 1. No repositories or access denied
		if (
			errorMessage.includes('access') ||
			errorMessage.includes('permission') ||
			errorMessage.includes('authorize')
		) {
			logger.warn(
				`[src/controllers/atlassian.repositories.controller.ts@list] Access denied or no repositories`,
			);

			throw createApiError(
				`Unable to access Bitbucket repositories. Verify your credentials and permissions.`,
				403,
				error,
			);
		}

		// 2. Workspace not found
		if (
			errorMessage.includes('not found') ||
			errorMessage.includes('No workspace with identifier') ||
			(error instanceof Error &&
				'statusCode' in error &&
				(error as { statusCode: number }).statusCode === 404)
		) {
			logger.warn(
				`[src/controllers/atlassian.repositories.controller.ts@list] Workspace not found: ${options.workspace}`,
			);

			throw createApiError(
				`Workspace not found: ${options.workspace}. Verify the workspace slug is correct and that you have access to this workspace.`,
				404,
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
 * @param identifier - The repository identifier (workspace and repo_slug)
 * @param identifier.workspace - The workspace slug
 * @param identifier.repo_slug - The repository slug
 * @param _options - Options for retrieving the repository (not currently used)
 * @returns Promise with formatted repository details content
 * @throws Error if repository retrieval fails
 */
async function get(
	identifier: RepositoryIdentifier,
	_options: GetRepositoryOptions = {},
): Promise<ControllerResponse> {
	logger.debug(
		`[src/controllers/atlassian.repositories.controller.ts@get] Getting Bitbucket repository: ${identifier.workspace}/${identifier.repo_slug}...`,
	);

	try {
		if (!identifier.workspace || !identifier.repo_slug) {
			throw createApiError(
				'Both workspace and repository slug are required',
				400,
			);
		}

		const repositoryData = await atlassianRepositoriesService.get({
			workspace: identifier.workspace,
			repo_slug: identifier.repo_slug,
		});

		// Log only key information instead of the entire response
		logger.debug(
			`[src/controllers/atlassian.repositories.controller.ts@get] Retrieved repository: ${repositoryData.name} (${repositoryData.full_name})`,
		);

		// Format the repository data for display using the formatter
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
				`[src/controllers/atlassian.repositories.controller.ts@get] Repository not found: ${identifier.workspace}/${identifier.repo_slug}`,
			);

			throw createApiError(
				`Repository not found: ${identifier.workspace}/${identifier.repo_slug}. Verify the workspace and repository slugs are correct and that you have access to this repository.`,
				404,
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
