import { ControllerResponse, PaginationOptions } from './atlassian.type.js';

/**
 * Options for listing Bitbucket workspaces
 */
export interface ListWorkspacesOptions extends PaginationOptions {
	/**
	 * Optional query to filter workspaces by name
	 */
	q?: string;

	/**
	 * Optional sort parameter
	 */
	sort?: string;
}

/**
 * Options for getting workspace details
 * @remarks This is a placeholder for future extensions
 */
export type GetWorkspaceOptions = Record<string, never>;

// Re-export ControllerResponse for backward compatibility
export { ControllerResponse };
