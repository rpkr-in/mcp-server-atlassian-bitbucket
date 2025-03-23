import { PaginationOptions, ControllerResponse } from './atlassian.type.js';

/**
 * Options for listing Jira issues
 */
export interface ListIssuesOptions extends PaginationOptions {
	/**
	 * JQL query string to filter issues
	 */
	jql?: string;

	/**
	 * Fields to include in the response
	 * Note: This is kept for backward compatibility but is now hardcoded in the controller
	 */
	fields?: string[];
}

/**
 * Options for getting issue details
 */
export interface GetIssueOptions {
	/**
	 * Fields to include in the response
	 * Note: This is kept for backward compatibility but is now hardcoded in the controller
	 */
	fields?: string[];

	/**
	 * Whether to include comments in the response
	 * Note: This is kept for backward compatibility but is now hardcoded to true in the controller
	 */
	includeComments?: boolean;

	/**
	 * Whether to include attachments in the response
	 * Note: This is kept for backward compatibility but is now hardcoded to true in the controller
	 */
	includeAttachments?: boolean;

	/**
	 * Whether to include worklog in the response
	 * Note: This is kept for backward compatibility but is now hardcoded to true in the controller
	 */
	includeWorklog?: boolean;
}

// Re-export ControllerResponse for backward compatibility
export { ControllerResponse };

// For backward compatibility
export type SearchIssuesOptions = ListIssuesOptions;
