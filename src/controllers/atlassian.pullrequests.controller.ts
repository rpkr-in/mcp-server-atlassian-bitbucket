import atlassianPullRequestsService from '../services/vendor.atlassian.pullrequests.service.js';
import { Logger } from '../utils/logger.util.js';
import { createApiError } from '../utils/error.util.js';
import { handleControllerError } from '../utils/error-handler.util.js';
import {
	extractPaginationInfo,
	PaginationType,
} from '../utils/pagination.util.js';
import { ControllerResponse } from '../types/common.types.js';
import {
	ListPullRequestsOptions,
	PullRequestIdentifier,
	ListPullRequestCommentsOptions,
	CreatePullRequestCommentOptions,
	CreatePullRequestOptions,
} from './atlassian.pullrequests.types.js';
import {
	formatPullRequestsList,
	formatPullRequestDetails,
	formatPullRequestComments,
} from './atlassian.pullrequests.formatter.js';
import {
	ListPullRequestsParams,
	GetPullRequestParams,
	GetPullRequestCommentsParams,
	CreatePullRequestCommentParams,
	CreatePullRequestParams,
} from '../services/vendor.atlassian.pullrequests.types.js';
import { formatBitbucketQuery } from '../utils/query.util.js';
import { DEFAULT_PAGE_SIZE, applyDefaults } from '../utils/defaults.util.js';

/**
 * Controller for managing Bitbucket pull requests.
 * Provides functionality for listing pull requests and retrieving pull request details.
 */

// Create a contextualized logger for this file
const controllerLogger = Logger.forContext(
	'controllers/atlassian.pullrequests.controller.ts',
);

// Log controller initialization
controllerLogger.debug('Bitbucket pull requests controller initialized');

/**
 * List Bitbucket pull requests with optional filtering
 * @param options - Options for listing pull requests
 * @param options.workspaceSlug - The workspace slug containing the repository
 * @param options.repoSlug - The repository slug to list pull requests from
 * @param options.state - Pull request state filter
 * @param options.limit - Maximum number of pull requests to return
 * @param options.cursor - Pagination cursor for retrieving the next set of results
 * @returns Promise with formatted pull request list content and pagination information
 */
async function list(
	options: ListPullRequestsOptions,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.pullrequests.controller.ts',
		'list',
	);
	methodLogger.debug('Listing Bitbucket pull requests...', options);

	try {
		if (!options.workspaceSlug || !options.repoSlug) {
			throw createApiError(
				'Both workspaceSlug and repoSlug parameters are required',
			);
		}

		// Create defaults object with proper typing
		const defaults: Partial<ListPullRequestsOptions> = {
			limit: DEFAULT_PAGE_SIZE,
		};

		// Apply defaults
		const mergedOptions = applyDefaults<ListPullRequestsOptions>(
			options,
			defaults,
		);

		// Process the query parameter
		let queryParam: string | undefined;

		// State filter takes precedence over free-text query
		if (mergedOptions.state) {
			queryParam = `state="${mergedOptions.state}"`;
		} else if (mergedOptions.query) {
			// Format the free-text query using the utility function
			queryParam = formatBitbucketQuery(mergedOptions.query, 'title');
		}

		// Map controller filters to service params
		const serviceParams: ListPullRequestsParams = {
			// Required parameters
			workspace: mergedOptions.workspaceSlug,
			repo_slug: mergedOptions.repoSlug,

			// Optional parameters
			...(queryParam && { q: queryParam }),
			pagelen: mergedOptions.limit,
			page: mergedOptions.cursor
				? parseInt(mergedOptions.cursor, 10)
				: undefined,
		};

		methodLogger.debug('Using filters:', serviceParams);

		// Call the service to get the pull requests data
		const pullRequestsData =
			await atlassianPullRequestsService.list(serviceParams);

		// Log the count of pull requests retrieved
		const count = pullRequestsData.values?.length || 0;
		methodLogger.debug(`Retrieved ${count} pull requests`);

		// Extract pagination information using the utility
		const pagination = extractPaginationInfo(
			pullRequestsData,
			PaginationType.PAGE,
		);

		// Format the pull requests data for display using the formatter
		const formattedPullRequests = formatPullRequestsList(pullRequestsData);

		return {
			content: formattedPullRequests,
			pagination,
		};
	} catch (error) {
		// Use the standardized error handler
		handleControllerError(error, {
			entityType: 'Pull Requests',
			operation: 'listing',
			source: 'controllers/atlassian.pullrequests.controller.ts@list',
			additionalInfo: {
				options,
				workspaceSlug: options.workspaceSlug,
				repoSlug: options.repoSlug,
			},
		});
	}
}

/**
 * Get details of a specific Bitbucket pull request, including code changes
 * @param identifier - Object containing pull request identifiers
 * @param identifier.workspaceSlug - The workspace slug containing the repository
 * @param identifier.repoSlug - The repository slug containing the pull request
 * @param identifier.prId - The pull request ID
 * @returns Promise with formatted pull request details content, including code changes
 * @throws Error if pull request retrieval fails
 */
async function get(
	identifier: PullRequestIdentifier,
): Promise<ControllerResponse> {
	const { workspaceSlug, repoSlug, prId } = identifier;
	const methodLogger = Logger.forContext(
		'controllers/atlassian.pullrequests.controller.ts',
		'get',
	);

	methodLogger.debug(
		`Getting pull request details for ${workspaceSlug}/${repoSlug}/${prId}...`,
	);

	try {
		// Set up parameters for API calls
		const params: GetPullRequestParams = {
			workspace: workspaceSlug,
			repo_slug: repoSlug,
			pull_request_id: parseInt(prId, 10),
		};

		// Fetch pull request details, diffstat, and raw diff in parallel for better performance
		const [pullRequestData, diffstatData, rawDiff] = await Promise.all([
			atlassianPullRequestsService.get(params),
			atlassianPullRequestsService.getDiffstat(params).catch((error) => {
				// Log but don't fail if diffstat can't be retrieved
				methodLogger.warn(
					`Failed to retrieve diffstat: ${error.message}`,
				);
				return null;
			}),
			atlassianPullRequestsService.getRawDiff(params).catch((error) => {
				// Log but don't fail if diff can't be retrieved
				methodLogger.warn(
					`Failed to retrieve raw diff: ${error.message}`,
				);
				return null;
			}),
		]);

		methodLogger.debug(`Retrieved pull request: ${pullRequestData.id}`);

		// Format the pull request data with diff information
		const formattedPullRequest = formatPullRequestDetails(
			pullRequestData,
			diffstatData,
			rawDiff,
		);

		return {
			content: formattedPullRequest,
		};
	} catch (error) {
		// Use the standardized error handler
		handleControllerError(error, {
			entityType: 'Pull Request',
			entityId: identifier,
			operation: 'retrieving',
			source: 'controllers/atlassian.pullrequests.controller.ts@get',
		});
	}
}

/**
 * List comments on a specific Bitbucket pull request
 * @param options - Options for listing pull request comments
 * @param options.workspaceSlug - The workspace slug containing the repository
 * @param options.repoSlug - The repository slug containing the pull request
 * @param options.prId - The pull request ID
 * @param options.limit - Maximum number of comments to return
 * @param options.cursor - Pagination cursor for retrieving the next set of results
 * @returns Promise with formatted pull request comments content and pagination information
 */
async function listComments(
	options: ListPullRequestCommentsOptions,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.pullrequests.controller.ts',
		'listComments',
	);
	methodLogger.debug('Listing Bitbucket pull request comments...', options);

	try {
		if (!options.workspaceSlug || !options.repoSlug || !options.prId) {
			throw createApiError(
				'workspaceSlug, repoSlug, and prId parameters are all required',
			);
		}

		// Validate pull request ID
		const prId = parseInt(options.prId, 10);
		if (isNaN(prId) || prId <= 0) {
			throw createApiError('Pull request ID must be a positive integer');
		}

		// Create defaults object with proper typing
		const defaults: Partial<ListPullRequestCommentsOptions> = {
			limit: DEFAULT_PAGE_SIZE,
			sort: '-updated_on',
		};

		// Apply defaults
		const mergedOptions = applyDefaults<ListPullRequestCommentsOptions>(
			options,
			defaults,
		);

		// Map controller options to service params
		const serviceParams: GetPullRequestCommentsParams = {
			workspace: mergedOptions.workspaceSlug,
			repo_slug: mergedOptions.repoSlug,
			pull_request_id: prId,
			pagelen: mergedOptions.limit,
			page: mergedOptions.cursor
				? parseInt(mergedOptions.cursor, 10)
				: undefined,
			sort: mergedOptions.sort,
		};

		methodLogger.debug('Using service parameters:', serviceParams);

		// Call the service to get the pull request comments
		const commentsData =
			await atlassianPullRequestsService.getComments(serviceParams);

		// Log the count of comments retrieved
		const count = commentsData.values?.length || 0;
		methodLogger.debug(`Retrieved ${count} pull request comments`);

		// Extract pagination information using the utility
		const pagination = extractPaginationInfo(
			commentsData,
			PaginationType.PAGE,
		);

		// Format the comments data for display using the formatter
		const formattedComments = formatPullRequestComments(commentsData);

		return {
			content: formattedComments,
			pagination,
		};
	} catch (error) {
		// Use the standardized error handler
		handleControllerError(error, {
			entityType: 'Pull Request Comments',
			operation: 'listing',
			source: 'controllers/atlassian.pullrequests.controller.ts@listComments',
			additionalInfo: {
				options,
				workspaceSlug: options.workspaceSlug,
				repoSlug: options.repoSlug,
				prId: options.prId,
			},
		});
	}
}

/**
 * Create a comment on a specific Bitbucket pull request
 * @param options - Options for creating a comment on a pull request
 * @param options.workspaceSlug - The workspace slug containing the repository
 * @param options.repoSlug - The repository slug containing the pull request
 * @param options.prId - The pull request ID
 * @param options.content - The content of the comment
 * @param options.inline - Optional inline comment location
 * @returns Promise with the result of adding the comment
 */
async function createComment(
	options: CreatePullRequestCommentOptions,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.pullrequests.controller.ts',
		'createComment',
	);
	methodLogger.debug(
		'Creating comment on Bitbucket pull request...',
		options,
	);

	try {
		if (!options.workspaceSlug || !options.repoSlug || !options.prId) {
			throw createApiError(
				'workspaceSlug, repoSlug, and prId parameters are all required',
			);
		}

		if (!options.content) {
			throw createApiError('Comment content is required');
		}

		// Validate pull request ID
		const prId = parseInt(options.prId, 10);
		if (isNaN(prId) || prId <= 0) {
			throw createApiError('Pull request ID must be a positive integer');
		}

		// Map controller options to service params using the renamed type
		const serviceParams: CreatePullRequestCommentParams = {
			workspace: options.workspaceSlug,
			repo_slug: options.repoSlug,
			pull_request_id: prId,
			content: {
				raw: options.content,
			},
		};

		// Add inline comment parameters if provided
		if (options.inline && options.inline.path) {
			serviceParams['inline'] = {
				path: options.inline.path,
				to: options.inline.line,
			};
		}

		methodLogger.debug('Using service parameters:', serviceParams);

		// Call the renamed service function
		const commentData =
			await atlassianPullRequestsService.createComment(serviceParams);

		methodLogger.debug(`Successfully created comment: ${commentData.id}`);

		return {
			content: `Comment created successfully for pull request #${options.prId}.`,
		};
	} catch (error) {
		// Use the standardized error handler
		handleControllerError(error, {
			entityType: 'Pull Request Comment',
			operation: 'creating',
			source: 'controllers/atlassian.pullrequests.controller.ts@createComment',
			additionalInfo: {
				options,
				workspaceSlug: options.workspaceSlug,
				repoSlug: options.repoSlug,
				prId: options.prId,
			},
		});
	}
}

/**
 * Create a new pull request
 * @param options - Options for creating a new pull request
 * @param options.workspaceSlug - Workspace slug containing the repository
 * @param options.repoSlug - Repository slug to create the pull request in
 * @param options.title - Title of the pull request
 * @param options.sourceBranch - Source branch name
 * @param options.destinationBranch - Destination branch name (defaults to the repository's main branch)
 * @param options.description - Optional description for the pull request
 * @param options.closeSourceBranch - Whether to close the source branch after merge
 * @returns Promise with formatted pull request details content
 */
async function create(
	options: CreatePullRequestOptions,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.pullrequests.controller.ts',
		'create',
	);
	methodLogger.debug('Creating new pull request...', options);

	try {
		if (!options.workspaceSlug || !options.repoSlug) {
			throw createApiError(
				'workspaceSlug and repoSlug parameters are required',
			);
		}

		if (!options.title) {
			throw createApiError('Pull request title is required');
		}

		if (!options.sourceBranch) {
			throw createApiError('Source branch is required');
		}

		// The API requires a destination branch, use default if not provided
		const destinationBranch = options.destinationBranch || 'main';

		// Map controller options to service params
		const serviceParams: CreatePullRequestParams = {
			workspace: options.workspaceSlug,
			repo_slug: options.repoSlug,
			title: options.title,
			source: {
				branch: {
					name: options.sourceBranch,
				},
			},
			destination: {
				branch: {
					name: destinationBranch,
				},
			},
		};

		// Add optional parameters if provided
		if (options.description) {
			serviceParams.description = options.description;
		}

		if (options.closeSourceBranch !== undefined) {
			serviceParams.close_source_branch = options.closeSourceBranch;
		}

		// Call the service to create the pull request
		const pullRequest =
			await atlassianPullRequestsService.create(serviceParams);

		// Format the created pull request details for response
		return {
			content: formatPullRequestDetails(pullRequest),
		};
	} catch (error) {
		throw handleControllerError(error, {
			entityType: 'Pull Request',
			operation: 'create',
			source: 'controllers/atlassian.pullrequests.controller.ts',
		});
	}
}

export default {
	list,
	get,
	listComments,
	createComment,
	create,
};
