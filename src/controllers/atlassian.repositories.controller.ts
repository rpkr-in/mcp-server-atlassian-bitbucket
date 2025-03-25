import atlassianRepositoriesService from '../services/vendor.atlassian.repositories.service.js';
import { Logger } from '../utils/logger.util.js';
import { handleControllerError } from '../utils/error-handler.util.js';
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
import { DEFAULT_PAGE_SIZE } from '../utils/defaults.util.js';

/**
 * Controller for managing Bitbucket repositories.
 * Provides functionality for listing repositories and retrieving repository details.
 */

// Create a contextualized logger for this file
const controllerLogger = Logger.forContext(
	'controllers/atlassian.repositories.controller.ts',
);

// Log controller initialization
controllerLogger.debug('Bitbucket repositories controller initialized');

/**
 * Lists repositories for a specific workspace with pagination and filtering options
 * @param options - Options for listing repositories including workspace
 * @returns Formatted list of repositories with pagination information
 */
async function list(
	options: ListRepositoriesOptions,
): Promise<ControllerResponse> {
	const { workspace } = options;
	const methodLogger = Logger.forContext(
		'controllers/atlassian.repositories.controller.ts',
		'list',
	);

	methodLogger.debug(
		`Listing repositories for workspace: ${workspace}...`,
		options,
	);

	try {
		// Map controller options to service parameters
		const serviceParams: ListRepositoriesParams = {
			// Required workspace
			workspace: options.workspace,
			// Handle limit with default value
			pagelen: options.limit || DEFAULT_PAGE_SIZE,
			// Map cursor to page for page-based pagination
			page: options.cursor ? parseInt(options.cursor, 10) : undefined,
			// Optional filter parameters
			...(options.q && { q: options.q }),
		};

		methodLogger.debug('Using service parameters:', serviceParams);

		const repositoriesData =
			await atlassianRepositoriesService.list(serviceParams);
		// Log only the count of repositories returned instead of the entire response
		methodLogger.debug(
			`Retrieved ${repositoriesData.values?.length || 0} repositories`,
		);

		// Extract pagination information using the utility
		const pagination = extractPaginationInfo(
			repositoriesData,
			PaginationType.PAGE,
			'controllers/atlassian.repositories.controller.ts@list',
		);

		// Format the repositories data for display using the formatter
		const formattedRepositories = formatRepositoriesList(
			repositoriesData.values,
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
			source: 'controllers/atlassian.repositories.controller.ts@list',
			additionalInfo: { options },
		});
	}
}

/**
 * Gets details of a specific Bitbucket repository
 * @param identifier - Repository identifier containing workspace and repoSlug
 * @param options - Options for retrieving repository details
 * @returns Formatted repository details
 */
async function get(
	identifier: RepositoryIdentifier,
	options: GetRepositoryOptions = {},
): Promise<ControllerResponse> {
	const { workspace, repoSlug } = identifier;
	const methodLogger = Logger.forContext(
		'controllers/atlassian.repositories.controller.ts',
		'get',
	);

	methodLogger.debug(
		`Getting repository details for ${workspace}/${repoSlug}...`,
		options,
	);

	try {
		// Map controller options to service parameters
		const serviceParams: GetRepositoryParams = {
			workspace,
			repo_slug: repoSlug,
		};

		methodLogger.debug('Using service parameters:', serviceParams);

		const repositoryData =
			await atlassianRepositoriesService.get(serviceParams);

		methodLogger.debug(`Retrieved repository: ${repositoryData.full_name}`);

		// Format the repository data for display using the formatter
		const formattedRepository = formatRepositoryDetails(repositoryData);

		return {
			content: formattedRepository,
		};
	} catch (error) {
		handleControllerError(error, {
			source: 'controllers/atlassian.repositories.controller.ts@get',
			entityType: 'Repository',
			operation: 'retrieving',
			entityId: { workspace, repoSlug },
		});
	}
}

export default { list, get };
