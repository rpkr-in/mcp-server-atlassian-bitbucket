import atlassianPullRequestsService from '../services/vendor.atlassian.pullrequests.service.js';
import { Logger } from '../utils/logger.util.js';
import { handleControllerError } from '../utils/error-handler.util.js';
import {
	extractPaginationInfo,
	PaginationType,
} from '../utils/pagination.util.js';
import { ControllerResponse } from '../types/common.types.js';
import {
	formatPullRequestsList,
	formatPullRequestDetails,
	formatPullRequestComments,
} from './atlassian.pullrequests.formatter.js';
import {
	ListPullRequestsParams,
	GetPullRequestParams,
	GetPullRequestCommentsParams as ListCommentsParams,
	CreatePullRequestCommentParams,
	CreatePullRequestParams,
} from '../services/vendor.atlassian.pullrequests.types.js';
import {
	ListPullRequestsToolArgsType,
	GetPullRequestToolArgsType,
	ListPullRequestCommentsToolArgsType,
	CreatePullRequestCommentToolArgsType,
	CreatePullRequestToolArgsType,
} from '../tools/atlassian.pullrequests.types.js';
import { DEFAULT_PAGE_SIZE, applyDefaults } from '../utils/defaults.util.js';

/**
 * Controller for managing Bitbucket pull requests.
 * Provides functionality for listing, retrieving, and creating pull requests and comments.
 */

// Create a contextualized logger for this file
const controllerLogger = Logger.forContext(
	'controllers/atlassian.pullrequests.controller.ts',
);

// Log controller initialization
controllerLogger.debug('Bitbucket pull requests controller initialized');

/**
 * List Bitbucket pull requests with optional filtering options
 * @param options - Options for listing pull requests including workspace slug and repo slug
 * @returns Promise with formatted pull requests list content and pagination information
 */
async function list(
	options: ListPullRequestsToolArgsType,
): Promise<ControllerResponse> {
	const { workspaceSlug, repoSlug } = options;
	const methodLogger = Logger.forContext(
		'controllers/atlassian.pullrequests.controller.ts',
		'list',
	);

	methodLogger.debug(
		`Listing pull requests for ${workspaceSlug}/${repoSlug}...`,
		options,
	);

	try {
		// Create defaults object with proper typing
		const defaults: Partial<ListPullRequestsToolArgsType> = {
			limit: DEFAULT_PAGE_SIZE,
		};

		// Apply defaults
		const mergedOptions = applyDefaults<ListPullRequestsToolArgsType>(
			options,
			defaults,
		);

		// Format the query for Bitbucket API if provided - specifically target title/description
		const formattedQuery = mergedOptions.query
			? `(title ~ "${mergedOptions.query}" OR description ~ "${mergedOptions.query}")` // Construct specific query for PRs
			: undefined;

		// Map controller options to service parameters
		const serviceParams: ListPullRequestsParams = {
			workspace: workspaceSlug,
			repo_slug: repoSlug,
			pagelen: mergedOptions.limit,
			page: mergedOptions.cursor
				? parseInt(mergedOptions.cursor, 10)
				: undefined,
			state: mergedOptions.state,
			sort: '-updated_on', // Sort by most recently updated first
			...(formattedQuery && { q: formattedQuery }),
		};

		methodLogger.debug('Using service parameters:', serviceParams);

		const pullRequestsData =
			await atlassianPullRequestsService.list(serviceParams);

		methodLogger.debug(
			`Retrieved ${pullRequestsData.values?.length || 0} pull requests`,
		);

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
		throw handleControllerError(error, {
			entityType: 'Pull Requests',
			operation: 'listing',
			source: 'controllers/atlassian.pullrequests.controller.ts@list',
			additionalInfo: { options },
		});
	}
}

/**
 * Gets detailed information about a specific pull request
 * @param options - Options containing workspace slug, repo slug, and PR ID
 * @returns Promise with formatted pull request details content
 */
async function get(
	options: GetPullRequestToolArgsType,
): Promise<ControllerResponse> {
	const { workspaceSlug, repoSlug, prId, includeFullDiff } = options;
	const methodLogger = Logger.forContext(
		'controllers/atlassian.pullrequests.controller.ts',
		'get',
	);

	methodLogger.debug(
		`Getting pull request ${workspaceSlug}/${repoSlug}/${prId}...`,
		{ includeFullDiff },
	);

	try {
		// Map controller options to service parameters
		const serviceParams: GetPullRequestParams = {
			workspace: workspaceSlug,
			repo_slug: repoSlug,
			pull_request_id: parseInt(prId, 10),
		};

		// First, fetch the basic pull request data
		const pullRequestData =
			await atlassianPullRequestsService.get(serviceParams);

		methodLogger.debug(
			`Retrieved pull request: ${pullRequestData.title} (${pullRequestData.id})`,
		);

		// Check if we need to expand the diff details
		let diffStats = null;
		let diffContent = null;

		try {
			// Get the diff statistics
			diffStats =
				await atlassianPullRequestsService.getDiffstat(serviceParams);
			methodLogger.debug('Retrieved diff statistics');

			// If full diff is requested, get the complete diff content
			if (includeFullDiff) {
				diffContent =
					await atlassianPullRequestsService.getRawDiff(
						serviceParams,
					);
				methodLogger.debug('Retrieved full diff content');
			}
		} catch (diffError) {
			methodLogger.warn(
				'Failed to retrieve diff information:',
				diffError,
			);
			// Continue even if diff retrieval fails
		}

		// Format the pull request data for display
		const formattedPullRequest = formatPullRequestDetails(
			pullRequestData,
			diffStats,
			diffContent,
		);

		return {
			content: formattedPullRequest,
		};
	} catch (error) {
		// Use the standardized error handler
		throw handleControllerError(error, {
			entityType: 'Pull Request',
			operation: 'retrieving',
			source: 'controllers/atlassian.pullrequests.controller.ts@get',
			additionalInfo: { workspaceSlug, repoSlug, prId },
		});
	}
}

/**
 * Lists comments for a specific pull request
 * @param options - Options containing workspace slug, repo slug, and PR ID
 * @returns Promise with formatted pull request comments list content and pagination information
 */
async function listComments(
	options: ListPullRequestCommentsToolArgsType,
): Promise<ControllerResponse> {
	const { workspaceSlug, repoSlug, prId } = options;
	const methodLogger = Logger.forContext(
		'controllers/atlassian.pullrequests.controller.ts',
		'listComments',
	);

	methodLogger.debug(
		`Listing comments for pull request ${workspaceSlug}/${repoSlug}/${prId}...`,
		options,
	);

	try {
		// Create defaults object with proper typing
		const defaults: Partial<ListPullRequestCommentsToolArgsType> = {
			limit: DEFAULT_PAGE_SIZE,
		};

		// Apply defaults
		const mergedOptions =
			applyDefaults<ListPullRequestCommentsToolArgsType>(
				options,
				defaults,
			);

		// Map controller options to service parameters
		const serviceParams: ListCommentsParams = {
			workspace: workspaceSlug,
			repo_slug: repoSlug,
			pull_request_id: parseInt(prId, 10),
			pagelen: mergedOptions.limit,
			page: mergedOptions.cursor
				? parseInt(mergedOptions.cursor, 10)
				: undefined,
		};

		methodLogger.debug('Using service parameters:', serviceParams);

		// Get both primary comments and inline comments
		const commentsData =
			await atlassianPullRequestsService.getComments(serviceParams);

		methodLogger.debug(
			`Retrieved ${commentsData.values?.length || 0} comments`,
		);

		// Extract pagination information using the utility
		const pagination = extractPaginationInfo(
			commentsData,
			PaginationType.PAGE,
		);

		// Format the comments data for display using the formatter
		const formattedComments = formatPullRequestComments(commentsData, prId);

		return {
			content: formattedComments,
			pagination,
		};
	} catch (error) {
		// Use the standardized error handler
		throw handleControllerError(error, {
			entityType: 'Pull Request Comments',
			operation: 'listing',
			source: 'controllers/atlassian.pullrequests.controller.ts@listComments',
			additionalInfo: { options },
		});
	}
}

/**
 * Creates a new comment on a pull request
 * @param options - Options containing workspace slug, repo slug, PR ID, and comment content
 * @returns Promise with confirmation message content
 */
async function createComment(
	options: CreatePullRequestCommentToolArgsType,
): Promise<ControllerResponse> {
	const { workspaceSlug, repoSlug, prId, content, inline } = options;
	const methodLogger = Logger.forContext(
		'controllers/atlassian.pullrequests.controller.ts',
		'createComment',
	);

	methodLogger.debug(
		`Creating comment on pull request ${workspaceSlug}/${repoSlug}/${prId}...`,
		{ inline: !!inline },
	);

	try {
		// Map controller options to service parameters
		let inlineParam: { path: string; to?: number } | undefined = undefined;

		if (inline) {
			inlineParam = {
				path: inline.path,
				to: inline.line,
			};
		}

		const serviceParams: CreatePullRequestCommentParams = {
			workspace: workspaceSlug,
			repo_slug: repoSlug,
			pull_request_id: parseInt(prId, 10),
			content: {
				raw: content,
			},
			inline: inlineParam,
		};

		methodLogger.debug('Using service parameters:', {
			...serviceParams,
			content: '(content)',
		});

		const commentData =
			await atlassianPullRequestsService.createComment(serviceParams);

		methodLogger.debug('Comment created successfully', {
			id: commentData.id,
			created_on: commentData.created_on,
		});

		// Create a simple confirmation message
		const confirmationMessage = `Comment #${commentData.id} created successfully on pull request #${prId}.`;

		return {
			content: confirmationMessage,
		};
	} catch (error) {
		// Use the standardized error handler
		throw handleControllerError(error, {
			entityType: 'Pull Request Comment',
			operation: 'creating',
			source: 'controllers/atlassian.pullrequests.controller.ts@createComment',
			additionalInfo: {
				workspaceSlug,
				repoSlug,
				prId,
				hasInline: !!inline,
			},
		});
	}
}

/**
 * Creates a new pull request in a repository
 * @param options - Options containing repository and pull request details
 * @returns Promise with confirmation message content and PR details
 */
async function create(
	options: CreatePullRequestToolArgsType,
): Promise<ControllerResponse> {
	const {
		workspaceSlug,
		repoSlug,
		title,
		sourceBranch,
		destinationBranch,
		description,
		closeSourceBranch,
	} = options;
	const methodLogger = Logger.forContext(
		'controllers/atlassian.pullrequests.controller.ts',
		'create',
	);

	methodLogger.debug(
		`Creating pull request in ${workspaceSlug}/${repoSlug}...`,
		{
			title,
			sourceBranch,
			destinationBranch,
			hasDescription: !!description,
			closeSourceBranch,
		},
	);

	try {
		// Map controller options to service parameters
		const serviceParams: CreatePullRequestParams = {
			workspace: workspaceSlug,
			repo_slug: repoSlug,
			title: title,
			source: {
				branch: {
					name: sourceBranch,
				},
			},
			destination: {
				branch: {
					name: destinationBranch || 'main', // Default to 'main' if not specified
				},
			},
			description: description || '',
			close_source_branch: closeSourceBranch || false,
		};

		methodLogger.debug('Using service parameters:', {
			...serviceParams,
			description: description ? '(provided)' : '(empty)',
		});

		const pullRequestData =
			await atlassianPullRequestsService.create(serviceParams);

		methodLogger.debug('Pull request created successfully', {
			id: pullRequestData.id,
			title: pullRequestData.title,
		});

		// Format pull request details using the existing formatter
		const formattedPullRequest = formatPullRequestDetails(pullRequestData);

		return {
			content: `Pull request #${pullRequestData.id} created successfully.\n\n${formattedPullRequest}`,
		};
	} catch (error) {
		// Use the standardized error handler
		throw handleControllerError(error, {
			entityType: 'Pull Request',
			operation: 'creating',
			source: 'controllers/atlassian.pullrequests.controller.ts@create',
			additionalInfo: {
				workspaceSlug,
				repoSlug,
				sourceBranch,
				destinationBranch,
			},
		});
	}
}

export default { list, get, listComments, createComment, create };
