import { ControllerResponse, PaginationOptions } from './atlassian.type.js';

/**
 * Options for listing Jira projects
 */
export interface ListProjectsOptions extends PaginationOptions {
	/**
	 * Filter projects by query (project name or key)
	 */
	query?: string;
}

/**
 * Options for getting project details
 */
export interface GetProjectOptions {
	/**
	 * Whether to include components in the response
	 */
	includeComponents?: boolean;

	/**
	 * Whether to include versions in the response
	 */
	includeVersions?: boolean;
}

// Re-export ControllerResponse for backward compatibility
export { ControllerResponse };
