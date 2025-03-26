import { PaginationOptions, EntityIdentifier } from '../types/common.types.js';

/**
 * Options for listing Bitbucket repositories.
 * These options control filtering and pagination of repository listings.
 */
export interface ListRepositoriesOptions extends PaginationOptions {
	/**
	 * The workspace slug to list repositories for.
	 * This is a required parameter for identifying the workspace.
	 */
	parentId: string;

	/**
	 * Filter repositories by query.
	 * Performs a case-insensitive partial match on repository names and descriptions.
	 */
	query?: string;

	/**
	 * The field to sort repositories by.
	 * Examples: 'name', 'updated_on', 'size'
	 */
	sort?: string;

	/**
	 * Role filter for repository access.
	 * Examples: 'owner', 'admin', 'contributor', 'member'
	 */
	role?: string;
}

/**
 * Repository identifier for retrieving specific repositories.
 * Used as the parameter to get() method.
 */
export interface RepositoryIdentifier extends EntityIdentifier {
	/**
	 * The workspace slug containing the repository.
	 * This identifies the team or account that owns the repository.
	 */
	parentId: string;

	/**
	 * The repository slug.
	 * This is the unique identifier for the repository within the workspace.
	 */
	entityId: string;
}

/**
 * Options for getting detailed repository information.
 * These options control what additional data is included in the response.
 */
export interface GetRepositoryOptions {
	/**
	 * Whether to include branches in the response.
	 * When true, retrieves branch information for the repository.
	 * Default: false
	 */
	includeBranches?: boolean;

	/**
	 * Whether to include commits in the response.
	 * When true, retrieves recent commit information for the repository.
	 * Default: false
	 */
	includeCommits?: boolean;

	/**
	 * Whether to include pull requests in the response.
	 * When true, retrieves open pull request information for the repository.
	 * Default: false
	 */
	includePullRequests?: boolean;
}
