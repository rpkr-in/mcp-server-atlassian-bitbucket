import { PullRequestState } from '../services/vendor.atlassian.pullrequests.types.js';

/**
 * Options for listing pull requests
 */
export interface ListPullRequestsOptions {
	workspace: string;
	repo_slug: string;
	state?: PullRequestState | PullRequestState[];
	q?: string;
	sort?: string;
	page?: number;
	pagelen?: number;
}

/**
 * Options for getting a single pull request
 */
export interface GetPullRequestOptions {
	workspace: string;
	repo_slug: string;
	pull_request_id: number;
}

/**
 * Standard controller response format
 */
export interface ControllerResponse {
	content: string;
	pagination?: {
		nextCursor?: string;
		hasMore?: boolean;
	};
}
