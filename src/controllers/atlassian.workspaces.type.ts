import { ControllerResponse } from './atlassian.type.js';

/**
 * Options for listing Bitbucket workspaces
 */
export interface ListWorkspacesOptions {
	/**
	 * Optional query to filter workspaces by name
	 */
	q?: string;

	/**
	 * Optional sort parameter
	 */
	sort?: string;

	/**
	 * Page number for pagination
	 */
	page?: number;

	/**
	 * Number of items per page
	 */
	pagelen?: number;
}

/**
 * Options for getting workspace details
 * @remarks This is a placeholder for future extensions
 */
export type GetWorkspaceOptions = Record<string, never>;

// Re-export ControllerResponse for backward compatibility
export { ControllerResponse };
