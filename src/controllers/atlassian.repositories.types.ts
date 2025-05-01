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
	workspaceSlug: string;

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
	workspaceSlug: string;

	/**
	 * The repository slug.
	 * This is the unique identifier for the repository within the workspace.
	 */
	repoSlug: string;
}

/**
 * Options for retrieving commit history.
 * Extends pagination options and adds filtering capabilities.
 */
export interface GetCommitHistoryOptions extends PaginationOptions {
	/**
	 * The specific branch, tag, or commit hash to retrieve history for.
	 * If omitted, defaults to the repository's main branch.
	 */
	revision?: string;

	/**
	 * Filter commits by a specific file path.
	 */
	path?: string;
}
