import atlassianIssuesService from '../services/vendor.atlassian.issues.service.js';
import { logger } from '../utils/logger.util.js';
import { McpError, createUnexpectedError } from '../utils/error.util.js';
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

		// Pass through McpErrors
		if (error instanceof McpError) {
			throw error;
		}

		// Wrap other errors
		throw createUnexpectedError(
			`Error listing Jira issues: ${error instanceof Error ? error.message : String(error)}`,
			error,
		);
	}
}

/**
 * Get details of a specific Jira issue
 * @param issueIdOrKey - The ID or key of the issue to retrieve
 * @param _options - Options for retrieving the issue
 * @param _options.fields - Fields to include in the response
 * @param _options.includeComments - Whether to include comments in the response
 * @param _options.includeAttachments - Whether to include attachments in the response
 * @param _options.includeWorklog - Whether to include worklog in the response
 * @returns Promise with formatted issue details content
 * @throws Error if issue retrieval fails
 */
async function get(
	issueIdOrKey: string,
	_options: GetIssueOptions = {},
): Promise<ControllerResponse> {
	logger.debug(
		`[src/controllers/atlassian.issues.controller.ts@get] Getting Jira issue with ID/key: ${issueIdOrKey}...`,
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

		const issueData = await atlassianIssuesService.get(
			issueIdOrKey,
			params,
		);
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

		// Pass through McpErrors
		if (error instanceof McpError) {
			throw error;
		}

		// Wrap other errors
		throw createUnexpectedError(
			`Error getting Jira issue: ${error instanceof Error ? error.message : String(error)}`,
			error,
		);
	}
}

export default { list, get };
