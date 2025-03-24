import { ControllerResponse } from './atlassian.type.js';

/**
 * Options for listing Bitbucket repositories
 */
export interface ListRepositoriesOptions {
	/**
	 * The workspace to list repositories from
	 */
	workspace: string;

	/**
	 * Optional query to filter repositories by name
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
 * Parameters for identifying a specific repository
 */
export interface RepositoryIdentifier {
	/**
	 * The workspace slug
	 */
	workspace: string;

	/**
	 * The repository slug
	 */
	repo_slug: string;
}

/**
 * Options for getting repository details
 * @remarks This is a placeholder for future extensions
 */
export type GetRepositoryOptions = Record<string, never>;

// Re-export ControllerResponse for backward compatibility
export { ControllerResponse };
