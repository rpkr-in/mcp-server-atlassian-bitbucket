import {
	ControllerResponse,
	PaginationOptions,
	EntityIdentifier,
} from './atlassian.type.js';

/**
 * Options for listing Bitbucket repositories
 */
export interface ListRepositoriesOptions extends PaginationOptions {
	/**
	 * The workspace slug to list repositories for
	 */
	workspace: string;

	/**
	 * Filter repositories by query
	 */
	q?: string;

	/**
	 * The field to sort by
	 */
	sort?: string;

	/**
	 * Role filter
	 */
	role?: string;
}

/**
 * Parameters for identifying a specific repository
 */
export interface RepositoryIdentifier extends EntityIdentifier {
	/**
	 * The workspace slug
	 */
	workspace: string;

	/**
	 * The repository slug
	 */
	repoSlug: string;
}

/**
 * Options for getting repository details
 */
export interface GetRepositoryOptions {
	/**
	 * Whether to include branches in the response
	 */
	includeBranches?: boolean;

	/**
	 * Whether to include commits in the response
	 */
	includeCommits?: boolean;

	/**
	 * Whether to include pull requests in the response
	 */
	includePullRequests?: boolean;
}

// Re-export ControllerResponse for backward compatibility
export { ControllerResponse };
