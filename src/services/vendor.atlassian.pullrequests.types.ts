/**
 * Types for Atlassian Bitbucket Pull Requests API
 */

import { Repository } from './vendor.atlassian.repositories.types.js';

/**
 * Pull request state
 */
export type PullRequestState = 'OPEN' | 'MERGED' | 'DECLINED' | 'SUPERSEDED';

/**
 * Pull request author or user reference
 */
export interface PullRequestUser {
	type: 'user' | 'team';
	uuid?: string;
	display_name?: string;
	nickname?: string;
	account_id?: string;
	links?: {
		self?: { href: string };
		html?: { href: string };
		avatar?: { href: string };
	};
}

/**
 * Content representation for rendering
 */
export interface ContentRepresentation {
	raw: string;
	markup: string;
	html: string;
}

/**
 * Rendered content fields
 */
export interface RenderedContent {
	title?: ContentRepresentation;
	description?: ContentRepresentation;
	reason?: ContentRepresentation;
}

/**
 * Pull request summary
 */
export interface PullRequestSummary {
	raw: string;
	markup: string;
	html: string;
}

/**
 * Pull request links object
 */
export interface PullRequestLinks {
	self?: { href: string; name?: string };
	html?: { href: string; name?: string };
	commits?: { href: string; name?: string };
	approve?: { href: string; name?: string };
	diff?: { href: string; name?: string };
	diffstat?: { href: string; name?: string };
	comments?: { href: string; name?: string };
	activity?: { href: string; name?: string };
	merge?: { href: string; name?: string };
	decline?: { href: string; name?: string };
}

/**
 * Pull request branch reference
 */
export interface PullRequestBranchRef {
	repository: Partial<Repository>;
	branch: {
		name: string;
		merge_strategies?: string[];
		default_merge_strategy?: string;
	};
	commit?: {
		hash: string;
	};
}

/**
 * Pull request object returned from the API
 */
export interface PullRequest {
	type: 'pullrequest';
	id: number;
	title: string;
	rendered?: RenderedContent;
	summary?: PullRequestSummary;
	state: PullRequestState;
	author: PullRequestUser;
	source: PullRequestBranchRef;
	destination: PullRequestBranchRef;
	merge_commit?: {
		hash: string;
	};
	comment_count?: number;
	task_count?: number;
	close_source_branch?: boolean;
	closed_by?: PullRequestUser;
	reason?: string;
	created_on: string;
	updated_on: string;
	reviewers?: PullRequestUser[];
	participants?: PullRequestUser[];
	links: PullRequestLinks;
}

/**
 * Extended pull request object with optional fields
 * @remarks Currently identical to PullRequest, but allows for future extension
 */
export type PullRequestDetailed = PullRequest;

/**
 * Parameters for listing pull requests
 */
export interface ListPullRequestsParams {
	workspace: string;
	repo_slug: string;
	state?: PullRequestState | PullRequestState[];
	q?: string;
	sort?: string;
	page?: number;
	pagelen?: number;
}

/**
 * Parameters for getting a pull request by ID
 */
export interface GetPullRequestParams {
	workspace: string;
	repo_slug: string;
	pull_request_id: number;
}

/**
 * API response for listing pull requests
 */
export interface PullRequestsResponse {
	pagelen: number;
	page: number;
	size: number;
	next?: string;
	previous?: string;
	values: PullRequest[];
}
