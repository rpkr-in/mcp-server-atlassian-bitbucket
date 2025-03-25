import atlassianRepositoriesService from '../services/vendor.atlassian.repositories.service.js';
import { logger } from '../utils/logger.util.js';
import { handleControllerError } from '../utils/errorHandler.util.js';
import {
	extractPaginationInfo,
	PaginationType,
} from '../utils/pagination.util.js';
import {
	ListRepositoriesOptions,
	GetRepositoryOptions,
	ControllerResponse,
	RepositoryIdentifier,
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
	const source = `[src/controllers/atlassian.repositories.controller.ts@list]`;
	logger.debug(`${source} Listing Bitbucket repositories...`, options);

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

		logger.debug(`${source} Using filters:`, serviceParams);

		const repositoriesData =
			await atlassianRepositoriesService.list(serviceParams);

		logger.debug(
			`${source} Retrieved ${
				repositoriesData.values?.length || 0
			} repositories`,
		);

		// Extract pagination information using the utility
		const pagination = extractPaginationInfo(
			repositoriesData,
			PaginationType.PAGE,
			source,
		);

		// Format the repositories data for display using the formatter
		const formattedRepositories = formatRepositoriesList(
			repositoriesData,
			pagination.nextCursor,
		);

		return {
			content: formattedRepositories,
			pagination,
		};
	} catch (error) {
		// Use the standardized error handler
		handleControllerError(error, {
			entityType: 'Repositories',
			operation: 'listing',
			source: 'src/controllers/atlassian.repositories.controller.ts@list',
			additionalInfo: { options },
		});
	}
}

/**
 * Get details of a specific Bitbucket repository
 * @param identifier - Object containing repository identifiers
 * @param identifier.workspace - The workspace slug that contains the repository
 * @param identifier.repoSlug - The repository slug
 * @param options - Options for retrieving the repository details
 * @returns Promise with formatted repository details content
 * @throws Error if repository retrieval fails
 */
async function get(
	identifier: RepositoryIdentifier,
	options: GetRepositoryOptions = {},
): Promise<ControllerResponse> {
	const { workspace, repoSlug } = identifier;

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
		// Use the standardized error handler
		handleControllerError(error, {
			entityType: 'Repository',
			entityId: identifier,
			operation: 'retrieving',
			source: 'src/controllers/atlassian.repositories.controller.ts@get',
			additionalInfo: { options },
		});
	}
}

export default { list, get };
