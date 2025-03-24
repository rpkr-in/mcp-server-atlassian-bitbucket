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
import { ListPullRequestsParams } from '../services/vendor.atlassian.pullrequests.types.js';

/**
 * Controller for managing Bitbucket pull requests.
 * Provides functionality for listing pull requests and retrieving pull request details.
 */

/**
 * List Bitbucket pull requests with optional filtering
 * @param {ListPullRequestsOptions} options - Options for listing pull requests
 * @returns {Promise<ControllerResponse>} - Formatted list of pull requests
 */
async function list(
	options: ListPullRequestsOptions,
): Promise<ControllerResponse> {
	logger.debug(
		`[src/controllers/atlassian.pullrequests.controller.ts@list] Listing Bitbucket pull requests...`,
		options,
	);

	try {
		// Validate required fields
		if (!options.workspace || !options.repo_slug) {
			throw new Error('Workspace and repository slug are required');
		}

		// Convert to service params
		const serviceParams: ListPullRequestsParams = {
			workspace: options.workspace,
			repo_slug: options.repo_slug,
			state: options.state,
			q: options.q,
			sort: options.sort,
			page: options.page,
			pagelen: options.pagelen,
		};

		logger.debug(
			`[src/controllers/atlassian.pullrequests.controller.ts@list] Using filters:`,
			serviceParams,
		);

		const pullRequestsData =
			await atlassianPullRequestsService.list(serviceParams);

		// Log only the count of pull requests returned instead of the entire response
		logger.debug(
			`[src/controllers/atlassian.pullrequests.controller.ts@list] Retrieved ${pullRequestsData.values?.length || 0} pull requests`,
		);

		// Calculate the next page number if needed
		let nextPage: number | undefined;
		if (
			pullRequestsData.page !== undefined &&
			pullRequestsData.pagelen !== undefined &&
			pullRequestsData.size !== undefined &&
			pullRequestsData.page * pullRequestsData.pagelen <
				pullRequestsData.size
		) {
			nextPage = pullRequestsData.page + 1;
			logger.debug(
				`[src/controllers/atlassian.pullrequests.controller.ts@list] Next page: ${nextPage}`,
			);
		}

		// Format the pull requests data for display using the formatter
		const formattedPullRequests = formatPullRequestsList(
			pullRequestsData,
			nextPage,
		);

		return {
			content: formattedPullRequests,
			pagination: {
				nextCursor:
					nextPage !== undefined ? String(nextPage) : undefined,
				hasMore: nextPage !== undefined,
			},
		};
	} catch (error) {
		logger.error(
			`[src/controllers/atlassian.pullrequests.controller.ts@list] Error listing pull requests`,
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

		// 1. Repository or workspace not found
		if (
			errorMessage.includes('not found') ||
			(error instanceof Error &&
				'statusCode' in error &&
				(error as { statusCode: number }).statusCode === 404)
		) {
			logger.warn(
				`[src/controllers/atlassian.pullrequests.controller.ts@list] Repository or workspace not found`,
			);

			throw createApiError(
				`Repository not found: ${options.workspace}/${options.repo_slug}. Verify the workspace and repository slugs are correct and that you have access.`,
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
				`[src/controllers/atlassian.pullrequests.controller.ts@list] Access denied`,
			);

			throw createApiError(
				`Unable to access pull requests for repository ${options.workspace}/${options.repo_slug}. Verify your credentials and permissions.`,
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
 * Get details of a specific Bitbucket pull request
 * @param {string} workspace - The workspace slug
 * @param {string} repo_slug - The repository slug
 * @param {number} pull_request_id - The pull request ID
 * @param {GetPullRequestOptions} _options - Additional options (not currently used)
 * @returns {Promise<ControllerResponse>} Promise with formatted pull request details content
 * @throws Error if pull request retrieval fails
 */
async function get(
	workspace: string,
	repo_slug: string,
	pull_request_id: number,
	_options: GetPullRequestOptions = { workspace, repo_slug, pull_request_id },
): Promise<ControllerResponse> {
	logger.debug(
		`[src/controllers/atlassian.pullrequests.controller.ts@get] Getting Bitbucket pull request ${workspace}/${repo_slug}/${pull_request_id}...`,
	);

	try {
		const pullRequestData = await atlassianPullRequestsService.get({
			workspace,
			repo_slug,
			pull_request_id,
		});

		// Log only key information instead of the entire response
		logger.debug(
			`[src/controllers/atlassian.pullrequests.controller.ts@get] Retrieved pull request: #${pullRequestData.id} - ${pullRequestData.title}`,
		);

		// Format the pull request data for display using the formatter
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
				`[src/controllers/atlassian.pullrequests.controller.ts@get] Pull request not found: ${workspace}/${repo_slug}/${pull_request_id}`,
			);

			throw createApiError(
				`Pull request not found: ${pull_request_id} in repository ${workspace}/${repo_slug}. Verify the pull request ID, workspace, and repository slugs are correct.`,
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
				`[src/controllers/atlassian.pullrequests.controller.ts@get] Access denied for pull request`,
			);

			throw createApiError(
				`Unable to access pull request ${pull_request_id} in repository ${workspace}/${repo_slug}. Verify your credentials and permissions.`,
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
