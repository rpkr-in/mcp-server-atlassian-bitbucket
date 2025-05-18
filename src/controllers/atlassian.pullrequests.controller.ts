import atlassianPullRequestsService from '../services/vendor.atlassian.pullrequests.service.js';
import { Logger } from '../utils/logger.util.js';
import { handleControllerError } from '../utils/error-handler.util.js';
import {
	extractPaginationInfo,
	PaginationType,
} from '../utils/pagination.util.js';
import { formatPagination } from '../utils/formatter.util.js';
import { ControllerResponse } from '../types/common.types.js';
import {
	formatPullRequestsList,
	formatPullRequestDetails,
	formatPullRequestComments,
} from './atlassian.pullrequests.formatter.js';
import {
	GetPullRequestParams,
	ListPullRequestsParams,
	CreatePullRequestParams,
	PullRequestComment,
	PullRequestCommentsResponse,
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

// Define a service-specific type for listing comments
type ListCommentsParams = {
	workspace: string;
	repo_slug: string;
	pull_request_id: number;
	pagelen?: number;
	page?: number;
};

// Define a service-specific type for creating comments
type CreateCommentParams = {
	workspace: string;
	repo_slug: string;
	pull_request_id: number;
	content: {
		raw: string;
	};
	inline?: {
		path: string;
		to?: number;
	};
};

// Helper function to enhance comments with code snippets
async function _enhanceCommentsWithSnippets(
	commentsData: PullRequestCommentsResponse,
	controllerMethodName: string, // To contextualize logs
): Promise<PullRequestCommentWithSnippet[]> {
	const methodLogger = Logger.forContext(
		`controllers/atlassian.pullrequests.controller.ts`,
		controllerMethodName, // Use provided method name for logger context
	);
	const commentsWithSnippets: PullRequestCommentWithSnippet[] = [];

	if (!commentsData.values || commentsData.values.length === 0) {
		return [];
	}

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
				snippet = extractDiffSnippet(diffContent, comment.inline.to);
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
	return commentsWithSnippets;
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

		// Create the final content by combining the formatted pull requests with pagination information
		let finalContent = formattedPullRequests;

		// Add pagination information if available
		if (
			pagination &&
			(pagination.hasMore || pagination.count !== undefined)
		) {
			const paginationString = formatPagination(pagination);
			finalContent += '\n\n' + paginationString;
		}

		return {
			content: finalContent,
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
	const methodLogger = Logger.forContext(
		'controllers/atlassian.pullrequests.controller.ts',
		'get',
	);

	try {
		methodLogger.debug('Getting pull request details', options);

		// Handle optional workspaceSlug
		if (!options.workspaceSlug) {
			methodLogger.debug(
				'No workspace provided, fetching default workspace',
			);
			const defaultWorkspace = await getDefaultWorkspace();
			if (!defaultWorkspace) {
				throw new Error(
					'No default workspace found. Please provide a workspace slug.',
				);
			}
			options.workspaceSlug = defaultWorkspace;
			methodLogger.debug(`Using default workspace: ${defaultWorkspace}`);
		}

		const {
			workspaceSlug,
			repoSlug,
			prId,
			includeFullDiff,
			includeComments,
		} = options;

		if (!workspaceSlug || !repoSlug) {
			throw new Error('Workspace slug and repository slug are required');
		}

		methodLogger.debug(
			`Getting pull request details for ${workspaceSlug}/${repoSlug}/${prId}...`,
			options,
		);

		// Map controller options to service parameters
		const serviceParams: GetPullRequestParams = {
			workspace: workspaceSlug,
			repo_slug: repoSlug,
			pull_request_id: parseInt(prId, 10),
		};

		methodLogger.debug('Fetching pull request:', serviceParams);
		const pullRequestResponse =
			await atlassianPullRequestsService.get(serviceParams);
		methodLogger.debug('Retrieved pull request data successfully');

		// Pull Request Diff Statistics
		methodLogger.debug('Fetching PR diff statistics');
		const diffStats = await atlassianPullRequestsService.getDiffstat({
			workspace: workspaceSlug,
			repo_slug: repoSlug,
			pull_request_id: parseInt(prId, 10),
		});
		methodLogger.debug(
			`Retrieved ${diffStats.values?.length || 0} diff stats`,
		);

		// Get the full diff if requested
		let diffContent = null;
		if (includeFullDiff) {
			try {
				methodLogger.debug('Fetching full diff content');
				diffContent = await atlassianPullRequestsService.getRawDiff({
					workspace: workspaceSlug,
					repo_slug: repoSlug,
					pull_request_id: parseInt(prId, 10),
				});
				methodLogger.debug(
					`Retrieved diff content: ${
						diffContent
							? diffContent.substring(0, 100) + '...'
							: 'none'
					}`,
				);
			} catch (diffErr) {
				methodLogger.warn('Failed to retrieve diff:', diffErr);
				// Continue without diff
			}
		}

		// Get comments if requested
		let commentsToFormat: PullRequestCommentWithSnippet[] | null = null;
		if (includeComments) {
			try {
				methodLogger.debug('Fetching pull request comments');
				const rawCommentsData =
					await atlassianPullRequestsService.getComments({
						workspace: workspaceSlug,
						repo_slug: repoSlug,
						pull_request_id: parseInt(prId, 10),
						pagelen: 25, // Reasonable limit to avoid overly large responses
					});
				methodLogger.debug(
					`Retrieved ${rawCommentsData.values?.length || 0} comments`,
				);

				// Enhance comments with snippets where applicable
				if (
					rawCommentsData.values &&
					rawCommentsData.values.length > 0
				) {
					commentsToFormat = await _enhanceCommentsWithSnippets(
						rawCommentsData,
						'get',
					);
				}
			} catch (commentsErr) {
				methodLogger.warn('Failed to retrieve comments:', commentsErr);
				// Continue without comments, commentsToFormat will remain null
			}
		}

		// Format the pull request data
		const formattedPr = formatPullRequestDetails(
			pullRequestResponse,
			diffStats,
			diffContent,
			commentsToFormat, // Pass the processed comments (might be null)
		);

		// Return controller response
		return {
			content: formattedPr,
		};
	} catch (error) {
		methodLogger.error('Failed to retrieve pull request:', error);
		throw handleControllerError(error, {
			entityType: 'Pull Request',
			operation: 'get',
			source: 'controllers/atlassian.pullrequests.controller.ts@get',
			additionalInfo: { ...options },
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
	const methodLogger = Logger.forContext(
		'controllers/atlassian.pullrequests.controller.ts',
		'listComments',
	);

	try {
		// Apply defaults
		const defaults: Partial<ListPullRequestCommentsToolArgsType> = {
			limit: DEFAULT_PAGE_SIZE,
		};
		const mergedOptions =
			applyDefaults<ListPullRequestCommentsToolArgsType>(
				options,
				defaults,
			);

		// Handle optional workspaceSlug
		if (!mergedOptions.workspaceSlug) {
			methodLogger.debug(
				'No workspace provided, fetching default workspace',
			);
			const defaultWorkspace = await getDefaultWorkspace();
			if (!defaultWorkspace) {
				throw new Error(
					'No default workspace found. Please provide a workspace slug.',
				);
			}
			mergedOptions.workspaceSlug = defaultWorkspace;
			methodLogger.debug(`Using default workspace: ${defaultWorkspace}`);
		}

		const { workspaceSlug, repoSlug, prId } = mergedOptions;

		if (!workspaceSlug || !repoSlug) {
			throw new Error('Workspace slug and repository slug are required');
		}

		methodLogger.debug(
			`Listing comments for pull request ${workspaceSlug}/${repoSlug}/${prId}...`,
			mergedOptions,
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
			`Retrieved ${commentsData.values?.length || 0} comments. Enhancing with snippets...`,
		);

		// Enhance comments with snippets where applicable
		const enhancedComments = await _enhanceCommentsWithSnippets(
			commentsData,
			'listComments',
		);

		const pagination = extractPaginationInfo(
			commentsData, // Use original data for pagination info
			PaginationType.PAGE,
		);

		// Pass the enhanced comments (with snippets) to the formatter
		const formattedComments = formatPullRequestComments(
			enhancedComments, // Use the enhanced array
			prId,
		);

		// Create the final content by combining the formatted comments with pagination information
		let finalContent = formattedComments;

		// Add pagination information if available
		if (
			pagination &&
			(pagination.hasMore || pagination.count !== undefined)
		) {
			const paginationString = formatPagination(pagination);
			finalContent += '\n\n' + paginationString;
		}

		return {
			content: finalContent,
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
	const methodLogger = Logger.forContext(
		'controllers/atlassian.pullrequests.controller.ts',
		'addComment',
	);

	try {
		methodLogger.debug('Adding PR comment', {
			...options,
			content: `(content length: ${options.content.length})`,
		});

		// Handle optional workspaceSlug
		if (!options.workspaceSlug) {
			methodLogger.debug(
				'No workspace provided, fetching default workspace',
			);
			const defaultWorkspace = await getDefaultWorkspace();
			if (!defaultWorkspace) {
				throw new Error(
					'No default workspace found. Please provide a workspace slug.',
				);
			}
			options.workspaceSlug = defaultWorkspace;
			methodLogger.debug(`Using default workspace: ${defaultWorkspace}`);
		}

		const { workspaceSlug, repoSlug, prId, content, inline } = options;

		methodLogger.debug(
			`Adding comment to PR ${workspaceSlug}/${repoSlug}/${prId}`,
			{
				contentLength: content.length,
				hasInline: !!inline,
			},
		);

		// Map controller options to service parameters
		let inlineParam: { path: string; to?: number } | undefined = undefined;
		if (inline) {
			inlineParam = {
				path: inline.path,
				to: inline.line,
			};
		}

		// Create the comment parameters
		const commentParams: CreateCommentParams = {
			workspace: workspaceSlug,
			repo_slug: repoSlug,
			pull_request_id: parseInt(prId, 10),
			content: {
				raw: content,
			},
			inline: inlineParam,
		};

		methodLogger.debug('Creating comment with params:', {
			...commentParams,
			content: `(raw content length: ${commentParams.content.raw.length})`,
		});

		// Submit the comment through the service
		const commentResponse =
			await atlassianPullRequestsService.createComment(commentParams);

		methodLogger.debug('Comment created successfully', {
			id: commentResponse.id,
			created_on: commentResponse.created_on,
		});

		// Format success message
		const successMessage = `Comment #${commentResponse.id} created successfully on pull request #${prId}.`;

		return {
			content: successMessage,
		};
	} catch (error) {
		throw handleControllerError(error, {
			entityType: 'Pull Request Comment',
			operation: 'create',
			source: 'controllers/atlassian.pullrequests.controller.ts@addComment',
			additionalInfo: { ...options },
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
	const methodLogger = Logger.forContext(
		'controllers/atlassian.pullrequests.controller.ts',
		'add',
	);

	try {
		methodLogger.debug('Creating pull request', {
			...options,
			description: options.description
				? '(description provided)'
				: '(no description)',
		});

		// Handle optional workspaceSlug
		if (!options.workspaceSlug) {
			methodLogger.debug(
				'No workspace provided, fetching default workspace',
			);
			const defaultWorkspace = await getDefaultWorkspace();
			if (!defaultWorkspace) {
				throw new Error(
					'No default workspace found. Please provide a workspace slug.',
				);
			}
			options.workspaceSlug = defaultWorkspace;
			methodLogger.debug(`Using default workspace: ${defaultWorkspace}`);
		}

		const {
			workspaceSlug,
			repoSlug,
			title,
			sourceBranch,
			destinationBranch,
			description,
			closeSourceBranch,
		} = options;

		methodLogger.debug(
			`Creating pull request in ${workspaceSlug}/${repoSlug}`,
			{
				title,
				source: sourceBranch,
				destination: destinationBranch || 'main',
				description: description ? '(provided)' : '(none)',
				closeSourceBranch,
			},
		);

		// Optimize the description markdown for Bitbucket rendering
		// Bitbucket natively accepts markdown format - this fixes rendering issues only
		const formattedDescription = description
			? optimizeBitbucketMarkdown(description)
			: '';

		// Prepare the parameters for creating the pull request
		const createParams: CreatePullRequestParams = {
			workspace: workspaceSlug,
			repo_slug: repoSlug,
			title,
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
			description: formattedDescription,
			close_source_branch: closeSourceBranch,
		};

		methodLogger.debug('Creating pull request with params', {
			...createParams,
			description: createParams.description
				? `(${createParams.description.length} chars)`
				: '(none)',
		});

		// Create the pull request through the service
		const prResponse =
			await atlassianPullRequestsService.create(createParams);

		methodLogger.debug('Pull request created successfully', {
			id: prResponse.id,
			links: prResponse.links,
		});

		// Format the created pull request details
		const formattedPr = formatPullRequestDetails(prResponse);

		return {
			content: formattedPr,
		};
	} catch (error) {
		throw handleControllerError(error, {
			entityType: 'Pull Request',
			operation: 'create',
			source: 'controllers/atlassian.pullrequests.controller.ts@add',
			additionalInfo: { ...options },
		});
	}
}

export default { list, get, listComments, addComment, add };
