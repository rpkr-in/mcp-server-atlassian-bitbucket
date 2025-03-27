import atlassianRepositoriesService from '../services/vendor.atlassian.repositories.service.js';
import atlassianPullRequestsService from '../services/vendor.atlassian.pullrequests.service.js';
import { Logger } from '../utils/logger.util.js';
import { handleControllerError } from '../utils/error-handler.util.js';
import {
	extractPaginationInfo,
	PaginationType,
} from '../utils/pagination.util.js';
import { ControllerResponse } from '../types/common.types.js';
import {
	ListRepositoriesOptions,
	RepositoryIdentifier,
} from './atlassian.repositories.types.js';
import {
	formatRepositoriesList,
	formatRepositoryDetails,
} from './atlassian.repositories.formatter.js';
import {
	ListRepositoriesParams,
	GetRepositoryParams,
} from '../services/vendor.atlassian.repositories.types.js';
import { formatBitbucketQuery } from '../utils/query.util.js';
import { DEFAULT_PAGE_SIZE, applyDefaults } from '../utils/defaults.util.js';

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
 * @param options - Options for listing repositories including workspaceSlug
 * @returns Formatted list of repositories with pagination information
 */
async function list(
	options: ListRepositoriesOptions,
): Promise<ControllerResponse> {
	const { workspaceSlug } = options;
	const methodLogger = Logger.forContext(
		'controllers/atlassian.repositories.controller.ts',
		'list',
	);

	methodLogger.debug(
		`Listing repositories for workspace: ${workspaceSlug}...`,
		options,
	);

	try {
		// Create defaults object with proper typing
		const defaults: Partial<ListRepositoriesOptions> = {
			limit: DEFAULT_PAGE_SIZE,
			sort: '-updated_on',
		};

		// Apply defaults
		const mergedOptions = applyDefaults<ListRepositoriesOptions>(
			options,
			defaults,
		);

		// Format the query for Bitbucket API if provided
		const formattedQuery = mergedOptions.query
			? formatBitbucketQuery(mergedOptions.query)
			: undefined;

		// Map controller options to service parameters
		const serviceParams: ListRepositoriesParams = {
			// Required workspace
			workspace: workspaceSlug,
			// Handle limit with default value
			pagelen: mergedOptions.limit,
			// Map cursor to page for page-based pagination
			page: mergedOptions.cursor
				? parseInt(mergedOptions.cursor, 10)
				: undefined,
			// Set default sort to updated_on descending if not specified
			sort: mergedOptions.sort,
			// Optional filter parameters
			...(formattedQuery && { q: formattedQuery }),
			...(mergedOptions.role && { role: mergedOptions.role }),
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
		);

		// Format the repositories data for display using the formatter
		const formattedRepositories = formatRepositoriesList(repositoriesData);

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
 * @param identifier - Repository identifier containing workspaceSlug and repoSlug
 * @returns Formatted repository details
 */
async function get(
	identifier: RepositoryIdentifier,
): Promise<ControllerResponse> {
	const { workspaceSlug, repoSlug } = identifier;
	const methodLogger = Logger.forContext(
		'controllers/atlassian.repositories.controller.ts',
		'get',
	);

	methodLogger.debug(
		`Getting repository details for ${workspaceSlug}/${repoSlug}...`,
	);

	try {
		// Map controller options to service parameters
		const serviceParams: GetRepositoryParams = {
			workspace: workspaceSlug,
			repo_slug: repoSlug,
		};

		methodLogger.debug('Using service parameters:', serviceParams);

		// Fetch repository data
		const repositoryData =
			await atlassianRepositoriesService.get(serviceParams);

		methodLogger.debug(`Retrieved repository: ${repositoryData.full_name}`);

		// Fetch recent pull requests to provide immediate context and activity history.
		// This enhances usability by including relevant PRs directly in repository details,
		// saving users from having to make a separate API call. While this crosses entity
		// boundaries slightly, it significantly improves the user experience by showing
		// recent activity alongside the repository's metadata.
		let recentPullRequests = null;
		try {
			// Create pull request list parameters similar to how the PR controller would
			const pullRequestsParams = {
				workspace: workspaceSlug,
				repo_slug: repoSlug,
				pagelen: DEFAULT_PAGE_SIZE, // Limit to PRs using constant
				sort: '-updated_on', // Sort by most recently updated
				// No state filter to get all PRs regardless of state
			};
			methodLogger.debug(
				'Fetching recent pull requests:',
				pullRequestsParams,
			);
			recentPullRequests =
				await atlassianPullRequestsService.list(pullRequestsParams);
			methodLogger.debug(
				`Retrieved ${recentPullRequests.values?.length || 0} recent pull requests`,
			);
		} catch (prError) {
			methodLogger.warn('Failed to fetch pull requests:', prError);
			// Continue with repository details even if PR fetch fails
		}

		// Format the repository data for display using the formatter
		const formattedRepository = formatRepositoryDetails(
			repositoryData,
			recentPullRequests,
		);

		return {
			content: formattedRepository,
		};
	} catch (error) {
		handleControllerError(error, {
			source: 'controllers/atlassian.repositories.controller.ts@get',
			entityType: 'Repository',
			operation: 'retrieving',
			entityId: { workspaceSlug, repoSlug },
		});
	}
}

export default { list, get };
