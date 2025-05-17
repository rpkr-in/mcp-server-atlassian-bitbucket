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
	PullRequestComment,
} from '../services/vendor.atlassian.pullrequests.types.js';
import {
	ListPullRequestsToolArgsType,
	GetPullRequestToolArgsType,
	ListPullRequestCommentsToolArgsType,
	CreatePullRequestCommentToolArgsType,
	CreatePullRequestToolArgsType,
} from '../tools/atlassian.pullrequests.types.js';
import { DEFAULT_PAGE_SIZE, applyDefaults } from '../utils/defaults.util.js';
import { extractDiffSnippet } from '../utils/diff.util.js';
import { optimizeBitbucketMarkdown } from '../utils/formatter.util.js';
import { getDefaultWorkspace } from '../utils/workspace.util.js';

/**
 * Controller for managing Bitbucket pull requests.
 * Provides functionality for listing, retrieving, and creating pull requests and comments.
 *
 * NOTE ON MARKDOWN HANDLING:
 * Unlike Jira (which uses ADF) or Confluence (which uses a mix of formats),
 * Bitbucket Cloud API natively accepts Markdown for text content in both directions:
 * - When sending data TO the API (comments, PR descriptions)
 * - When receiving data FROM the API (PR descriptions, comments)
 *
 * The API expects content in the format: { content: { raw: "markdown-text" } }
 *
 * We use optimizeBitbucketMarkdown() to address specific rendering quirks in
 * Bitbucket's markdown renderer but it does NOT perform format conversion.
 * See formatter.util.ts for details on the specific issues it addresses.
 */

// Create a contextualized logger for this file
const controllerLogger = Logger.forContext(
	'controllers/atlassian.pullrequests.controller.ts',
);

// Log controller initialization
controllerLogger.debug('Bitbucket pull requests controller initialized');

// Define an extended type for internal use within the controller/formatter
// to include the code snippet.
interface PullRequestCommentWithSnippet extends PullRequestComment {
	codeSnippet?: string;
}

/**
 * List Bitbucket pull requests with optional filtering options
 * @param options - Options for listing pull requests including workspace slug and repo slug
 * @returns Promise with formatted pull requests list content and pagination information
 */
async function list(
	options: ListPullRequestsToolArgsType,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.pullrequests.controller.ts',
		'list',
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

		// Handle optional workspaceSlug - get default if not provided
		if (!mergedOptions.workspaceSlug) {
			methodLogger.debug(
				'No workspace provided, fetching default workspace',
			);
			const defaultWorkspace = await getDefaultWorkspace();
			if (!defaultWorkspace) {
				throw new Error(
					'Could not determine a default workspace. Please provide a workspaceSlug.',
				);
			}
			mergedOptions.workspaceSlug = defaultWorkspace;
			methodLogger.debug(
				`Using default workspace: ${mergedOptions.workspaceSlug}`,
			);
		}

		const { workspaceSlug, repoSlug } = mergedOptions;

		if (!workspaceSlug || !repoSlug) {
			throw new Error('Workspace slug and repository slug are required');
		}

		methodLogger.debug(
			`Listing pull requests for ${workspaceSlug}/${repoSlug}...`,
			mergedOptions,
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
 * Lists comments for a specific pull request, including code snippets for inline comments.
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
		const defaults: Partial<ListPullRequestCommentsToolArgsType> = {
			limit: DEFAULT_PAGE_SIZE,
		};
		const mergedOptions =
			applyDefaults<ListPullRequestCommentsToolArgsType>(
				options,
				defaults,
			);

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

		const commentsData =
			await atlassianPullRequestsService.getComments(serviceParams);

		methodLogger.debug(
			`Retrieved ${commentsData.values?.length || 0} comments. Fetching snippets...`,
		);

		// Enhance comments with snippets where applicable
		const commentsWithSnippets: PullRequestCommentWithSnippet[] = [];
		for (const comment of commentsData.values) {
			let snippet = undefined;
			if (
				comment.inline &&
				comment.links?.code?.href &&
				comment.inline.to !== undefined
			) {
				try {
					methodLogger.debug(
						`Fetching diff for inline comment ${comment.id} from ${comment.links.code.href}`,
					);
					const diffContent =
						await atlassianPullRequestsService.getDiffForUrl(
							comment.links.code.href,
						);
					snippet = extractDiffSnippet(
						diffContent,
						comment.inline.to,
					);
					methodLogger.debug(
						`Extracted snippet for comment ${comment.id} (length: ${snippet?.length})`,
					);
				} catch (snippetError) {
					methodLogger.warn(
						`Failed to fetch or parse snippet for comment ${comment.id}:`,
						snippetError,
					);
					// Continue without snippet if fetching/parsing fails
				}
			}
			commentsWithSnippets.push({ ...comment, codeSnippet: snippet });
		}

		const pagination = extractPaginationInfo(
			commentsData, // Use original data for pagination info
			PaginationType.PAGE,
		);

		// Pass the enhanced comments (with snippets) to the formatter
		const formattedComments = formatPullRequestComments(
			commentsWithSnippets, // Use the enhanced array
			prId,
		);

		return {
			content: formattedComments,
			pagination,
		};
	} catch (error) {
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
async function addComment(
	options: CreatePullRequestCommentToolArgsType,
): Promise<ControllerResponse> {
	const { workspaceSlug, repoSlug, prId, content, inline } = options;
	const methodLogger = Logger.forContext(
		'controllers/atlassian.pullrequests.controller.ts',
		'addComment',
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

		// Optimize the markdown content for Bitbucket rendering
		// This does NOT convert the format but fixes known rendering quirks
		const optimizedContent = optimizeBitbucketMarkdown(content);
		methodLogger.debug(
			'Content has been optimized for Bitbucket rendering',
		);

		const serviceParams: CreatePullRequestCommentParams = {
			workspace: workspaceSlug,
			repo_slug: repoSlug,
			pull_request_id: parseInt(prId, 10),
			content: {
				raw: optimizedContent,
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
			source: 'controllers/atlassian.pullrequests.controller.ts@addComment',
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
async function add(
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
		'add',
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
		// Optimize the description markdown for Bitbucket rendering
		// Bitbucket natively accepts markdown format - this fixes rendering issues only
		const optimizedDescription = description
			? optimizeBitbucketMarkdown(description)
			: '';

		if (description) {
			methodLogger.debug(
				'Description has been optimized for Bitbucket rendering',
			);
		}

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
			description: optimizedDescription,
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
			source: 'controllers/atlassian.pullrequests.controller.ts@add',
			additionalInfo: {
				workspaceSlug,
				repoSlug,
				sourceBranch,
				destinationBranch,
			},
		});
	}
}

export default { list, get, listComments, addComment, add };
