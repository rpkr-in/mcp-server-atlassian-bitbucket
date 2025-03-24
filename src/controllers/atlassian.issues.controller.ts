import atlassianIssuesService from '../services/vendor.atlassian.issues.service.js';
import { logger } from '../utils/logger.util.js';
import { McpError, createApiError } from '../utils/error.util.js';
import {
	ListIssuesOptions,
	GetIssueOptions,
	ControllerResponse,
} from './atlassian.issues.type.js';
import {
	formatIssuesList,
	formatIssueDetails,
} from './atlassian.issues.formatter.js';

/**
 * Controller for managing Jira issues.
 * Provides functionality for listing issues and retrieving issue details.
 */

/**
 * List Jira issues with optional filtering
 * @param options - Optional filter options for the issues list
 * @param options.jql - JQL query string to filter issues
 * @param options.fields - Fields to include in the response
 * @param options.limit - Maximum number of issues to return
 * @param options.cursor - Pagination cursor for retrieving the next set of results
 * @returns Promise with formatted issue list content and pagination information
 */
async function list(
	options: ListIssuesOptions = {},
): Promise<ControllerResponse> {
	logger.debug(
		`[src/controllers/atlassian.issues.controller.ts@list] Listing Jira issues...`,
		options,
	);

	try {
		// Set default filters and hardcoded values
		const filters = {
			// Optional filters with defaults
			jql: options.jql,
			// Always include all fields
			fields: [
				'summary',
				'description',
				'status',
				'issuetype',
				'priority',
				'project',
				'assignee',
				'reporter',
				'creator',
				'created',
				'updated',
				'timetracking',
				'comment',
				'attachment',
				'worklog',
				'issuelinks',
			],
			// Pagination
			maxResults: options.limit || 50,
			startAt: options.cursor ? parseInt(options.cursor, 10) : 0,
		};

		logger.debug(
			`[src/controllers/atlassian.issues.controller.ts@list] Using filters:`,
			filters,
		);

		const issuesData = await atlassianIssuesService.search(filters);
		// Log only the count of issues returned instead of the entire response
		logger.debug(
			`[src/controllers/atlassian.issues.controller.ts@list] Retrieved ${issuesData.issues?.length || 0} issues`,
		);

		// Extract pagination information
		let nextCursor: string | undefined;
		if (
			issuesData.startAt !== undefined &&
			issuesData.maxResults !== undefined &&
			issuesData.total !== undefined &&
			issuesData.startAt + issuesData.maxResults < issuesData.total
		) {
			nextCursor = String(issuesData.startAt + issuesData.maxResults);
			logger.debug(
				`[src/controllers/atlassian.issues.controller.ts@list] Next cursor: ${nextCursor}`,
			);
		} else if (issuesData.nextPageToken) {
			nextCursor = issuesData.nextPageToken;
			logger.debug(
				`[src/controllers/atlassian.issues.controller.ts@list] Next page token: ${nextCursor}`,
			);
		}

		// Format the issues data for display using the formatter
		const formattedIssues = formatIssuesList(issuesData, nextCursor);

		return {
			content: formattedIssues,
			pagination: {
				nextCursor,
				hasMore: !!nextCursor,
			},
		};
	} catch (error) {
		logger.error(
			`[src/controllers/atlassian.issues.controller.ts@list] Error listing issues`,
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

		// 1. Invalid JQL syntax
		if (errorMessage.includes('Error in the JQL Query')) {
			logger.warn(
				`[src/controllers/atlassian.issues.controller.ts@list] JQL syntax error detected`,
			);

			// Provide specific guidance for fixing the query but preserve the original error
			const guidance =
				'Check your JQL syntax. For complex queries, enclose terms with spaces in quotes.';

			throw createApiError(`${errorMessage}. ${guidance}`, 400, error);
		}

		// 2. Invalid cursor format
		if (
			errorMessage.includes('startAt') &&
			(errorMessage.includes('invalid') ||
				errorMessage.includes('not valid'))
		) {
			logger.warn(
				`[src/controllers/atlassian.issues.controller.ts@list] Invalid cursor detected`,
			);

			throw createApiError(
				`${errorMessage}. Use the exact cursor string returned from previous results.`,
				400,
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
 * Get details of a specific Jira issue
 * @param idOrKey - The ID or key of the issue to retrieve
 * @param _options - Options for retrieving the issue (not currently used)
 * @returns Promise with formatted issue details content
 * @throws Error if issue retrieval fails
 */
async function get(
	idOrKey: string,
	_options: GetIssueOptions = {},
): Promise<ControllerResponse> {
	logger.debug(
		`[src/controllers/atlassian.issues.controller.ts@get] Getting Jira issue with ID/key: ${idOrKey}...`,
	);

	try {
		// Always include all fields
		const fields = [
			'summary',
			'description',
			'status',
			'issuetype',
			'priority',
			'project',
			'assignee',
			'reporter',
			'creator',
			'created',
			'updated',
			'timetracking',
			'comment',
			'attachment',
			'worklog',
			'issuelinks',
		];

		// Parameters for the service call
		const params = {
			fields,
			updateHistory: true, // Mark as viewed
		};

		logger.debug(
			`[src/controllers/atlassian.issues.controller.ts@get] Using params:`,
			params,
		);

		const issueData = await atlassianIssuesService.get(idOrKey, params);
		// Log only key information instead of the entire response
		logger.debug(
			`[src/controllers/atlassian.issues.controller.ts@get] Retrieved issue: ${issueData.key}`,
		);

		// Format the issue data for display using the formatter
		const formattedIssue = formatIssueDetails(issueData);

		return {
			content: formattedIssue,
		};
	} catch (error) {
		logger.error(
			`[src/controllers/atlassian.issues.controller.ts@get] Error getting issue`,
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

		// 1. Issue not found
		if (
			errorMessage.includes('not found') ||
			(error instanceof Error &&
				'statusCode' in error &&
				(error as { statusCode: number }).statusCode === 404)
		) {
			logger.warn(
				`[src/controllers/atlassian.issues.controller.ts@get] Issue not found: ${idOrKey}`,
			);

			throw createApiError(
				`Issue not found: ${idOrKey}. Verify the issue ID or key is correct and that you have access to this issue.`,
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
