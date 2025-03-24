import atlassianPullRequestsService from '../services/vendor.atlassian.pullrequests.service.js';
import { logger } from '../utils/logger.util.js';
import { McpError, createApiError } from '../utils/error.util.js';
import {
	ListPullRequestsOptions,
	GetPullRequestOptions,
	ControllerResponse,
} from './atlassian.pullrequests.type.js';
import {
	formatPullRequestsList,
	formatPullRequestDetails,
} from './atlassian.pullrequests.formatter.js';
import {
	ListPullRequestsParams,
	GetPullRequestParams,
} from '../services/vendor.atlassian.pullrequests.types.js';

/**
 * Controller for managing Bitbucket pull requests.
 * Provides functionality for listing pull requests and retrieving pull request details.
 */

/**
 * List Bitbucket pull requests with optional filtering
 * @param options - Options for listing pull requests
 * @param options.workspace - The workspace slug containing the repository
 * @param options.repoSlug - The repository slug to list pull requests from
 * @param options.state - Pull request state filter
 * @param options.limit - Maximum number of pull requests to return
 * @param options.cursor - Pagination cursor for retrieving the next set of results
 * @returns Promise with formatted pull request list content and pagination information
 */
async function list(
	options: ListPullRequestsOptions,
): Promise<ControllerResponse> {
	const logPrefix =
		'[src/controllers/atlassian.pullrequests.controller.ts@list]';
	logger.debug(`${logPrefix} Listing Bitbucket pull requests...`, options);

	try {
		if (!options.workspace || !options.repoSlug) {
			throw createApiError(
				'Both workspace and repoSlug parameters are required',
			);
		}

		// Translate the controller options to service parameters
		const serviceParams: ListPullRequestsParams = {
			workspace: options.workspace,
			repo_slug: options.repoSlug,
			...(options.state && { state: options.state }),
			pagelen: options.limit || 50,
			...(options.cursor && { page: parseInt(options.cursor, 10) }),
		};

		logger.debug(`${logPrefix} Using filters:`, serviceParams);

		// Call the service to get the pull requests data
		const pullRequestsData =
			await atlassianPullRequestsService.list(serviceParams);

		// Log the count of pull requests retrieved
		const count = pullRequestsData.values?.length || 0;
		logger.debug(`${logPrefix} Retrieved ${count} pull requests`);

		// Extract pagination information
		let nextCursor: string | undefined;
		if (pullRequestsData.next) {
			// Extract page from next URL if available
			const nextUrl = new URL(pullRequestsData.next);
			const nextPage = nextUrl.searchParams.get('page');
			if (nextPage) {
				nextCursor = nextPage;
			}
		}

		// Format the pull requests data for display using the formatter
		const formattedPullRequests = formatPullRequestsList(
			pullRequestsData,
			nextCursor,
		);

		return {
			content: formattedPullRequests,
			pagination: {
				nextCursor,
				hasMore: !!nextCursor,
			},
		};
	} catch (error) {
		logger.error(`${logPrefix} Error listing pull requests`, error);
		throw createApiError('Failed to list pull requests', undefined, error);
	}
}

/**
 * Get details of a specific Bitbucket pull request
 * @param workspace - The workspace slug containing the repository
 * @param repoSlug - The repository slug containing the pull request
 * @param pullRequestId - The pull request ID
 * @param options - Options for retrieving the pull request details
 * @returns Promise with formatted pull request details content
 * @throws Error if pull request retrieval fails
 */
async function get(
	workspace: string,
	repoSlug: string,
	pullRequestId: number,
	options: GetPullRequestOptions = {},
): Promise<ControllerResponse> {
	logger.debug(
		`[src/controllers/atlassian.pullrequests.controller.ts@get] Getting pull request details for ${workspace}/${repoSlug}/${pullRequestId}...`,
		options,
	);

	try {
		// Get basic pull request information
		const params: GetPullRequestParams = {
			workspace,
			repo_slug: repoSlug,
			pull_request_id: pullRequestId,
		};

		const pullRequestData = await atlassianPullRequestsService.get(params);

		logger.debug(
			`[src/controllers/atlassian.pullrequests.controller.ts@get] Retrieved pull request: ${pullRequestData.id}`,
		);

		// Format the pull request data for display using the formatter
		// We don't have comments data available from the service
		const formattedPullRequest = formatPullRequestDetails(pullRequestData);

		return {
			content: formattedPullRequest,
		};
	} catch (error) {
		logger.error(
			`[src/controllers/atlassian.pullrequests.controller.ts@get] Error getting pull request`,
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

		// 1. Pull request not found
		if (
			errorMessage.includes('not found') ||
			(error instanceof Error &&
				'statusCode' in error &&
				(error as { statusCode: number }).statusCode === 404)
		) {
			logger.warn(
				`[src/controllers/atlassian.pullrequests.controller.ts@get] Pull request not found: ${workspace}/${repoSlug}/${pullRequestId}`,
			);

			throw createApiError(
				`Pull request not found: ${workspace}/${repoSlug}/${pullRequestId}. Verify the pull request ID and your access permissions.`,
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
				`[src/controllers/atlassian.pullrequests.controller.ts@get] Access denied for pull request: ${workspace}/${repoSlug}/${pullRequestId}`,
			);

			throw createApiError(
				`Access denied for pull request: ${workspace}/${repoSlug}/${pullRequestId}. Verify your credentials and permissions.`,
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
