import { z } from 'zod';

/**
 * Schema for list-pull-requests tool arguments
 */
export const ListPullRequestsToolArgs = z.object({
	/**
	 * Workspace slug containing the repository
	 */
	workspace: z
		.string()
		.min(1, 'Workspace slug is required')
		.describe(
			'Workspace slug containing the repository. Must be a valid workspace slug from your Bitbucket account. Example: "myteam"',
		),

	/**
	 * Repository slug containing the pull requests
	 */
	repoSlug: z
		.string()
		.min(1, 'Repository slug is required')
		.describe(
			'Repository slug containing the pull requests. This must be a valid repository in the specified workspace. Example: "project-api"',
		),

	/**
	 * Filter by pull request state
	 */
	state: z
		.enum(['OPEN', 'MERGED', 'DECLINED', 'SUPERSEDED'])
		.optional()
		.describe(
			'Filter pull requests by state. Options: "OPEN" (active PRs), "MERGED" (completed PRs), "DECLINED" (rejected PRs), or "SUPERSEDED" (replaced PRs). If omitted, defaults to showing all states.',
		),

	/**
	 * Maximum number of pull requests to return (default: 50)
	 */
	limit: z
		.number()
		.int()
		.positive()
		.max(100)
		.optional()
		.describe(
			'Maximum number of pull requests to return (1-100). Use this to control the response size. If omitted, defaults to 25.',
		),

	/**
	 * Pagination cursor for retrieving the next set of results
	 */
	cursor: z
		.string()
		.optional()
		.describe(
			'Pagination cursor for retrieving the next set of results. Obtain this value from the previous response when more results are available.',
		),
});

export type ListPullRequestsToolArgsType = z.infer<
	typeof ListPullRequestsToolArgs
>;

/**
 * Schema for get-pull-request tool arguments
 */
export const GetPullRequestToolArgs = z.object({
	/**
	 * Workspace slug containing the repository
	 */
	workspace: z
		.string()
		.min(1, 'Workspace slug is required')
		.describe(
			'Workspace slug containing the repository. Must be a valid workspace slug from your Bitbucket account. Example: "myteam"',
		),

	/**
	 * Repository slug containing the pull request
	 */
	repoSlug: z
		.string()
		.min(1, 'Repository slug is required')
		.describe(
			'Repository slug containing the pull request. This must be a valid repository in the specified workspace. Example: "project-api"',
		),

	/**
	 * Pull request ID to retrieve
	 */
	pullRequestId: z
		.number()
		.int()
		.positive()
		.describe(
			'Numeric ID of the pull request to retrieve. Must be a valid pull request ID in the specified repository. Example: 42',
		),

	/**
	 * Whether to include comments in the response
	 */
	includeComments: z
		.boolean()
		.optional()
		.describe(
			'Whether to include comments in the response. When true, includes all comments on the pull request. If omitted, defaults to false.',
		),
});

export type GetPullRequestToolArgsType = z.infer<typeof GetPullRequestToolArgs>;
