import { PaginationOptions, EntityIdentifier } from '../types/common.types.js';

/**
 * Pull request identifier for retrieving specific pull requests
 */
export interface PullRequestIdentifier extends EntityIdentifier {
	/**
	 * The workspace slug
	 */
	parentId: string;

	/**
	 * The repository slug
	 */
	entityId: string;

	/**
	 * The pull request ID
	 */
	prId: string;
}

/**
 * Options for listing Bitbucket pull requests
 */
export interface ListPullRequestsOptions extends PaginationOptions {
	/**
	 * The workspace slug to list pull requests for
	 */
	parentId: string;

	/**
	 * The repository slug to list pull requests for
	 */
	entityId: string;

	/**
	 * Filter by pull request state
	 */
	state?: 'OPEN' | 'MERGED' | 'DECLINED' | 'SUPERSEDED';

	/**
	 * Filter string to search for in pull request title, description, or author
	 */
	query?: string;
}

/**
 * Options for getting pull request details
 */
export interface GetPullRequestOptions {
	/**
	 * Whether to include comments in the response
	 */
	includeComments?: boolean;
}
