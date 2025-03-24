import { PaginationOptions, ControllerResponse } from './atlassian.type.js';

/**
 * Options for listing Jira issues
 */
export interface ListIssuesOptions extends PaginationOptions {
	/**
	 * JQL query string to filter issues
	 */
	jql?: string;
}

/**
 * Options for getting issue details
 *
 * Note: This interface is intentionally kept minimal as all necessary fields
 * are now hardcoded in the controller for consistent results across all requests.
 * The empty interface is maintained for backward compatibility and future extensibility.
 */
export interface GetIssueOptions {
	// This interface is intentionally empty but maintained for backward compatibility
	// and to allow for future extensibility without breaking changes.
}

// Re-export ControllerResponse for backward compatibility
export { ControllerResponse };

// For backward compatibility
export type SearchIssuesOptions = ListIssuesOptions;
