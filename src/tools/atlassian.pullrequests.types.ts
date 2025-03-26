import { z } from 'zod';

/**
 * Base pagination arguments for all tools
 */
const PaginationArgs = {
	limit: z
		.number()
		.int()
		.positive()
		.max(100)
		.optional()
		.describe(
			'Maximum number of items to return (1-100). Controls the response size. Defaults to 25 if omitted.',
		),

	cursor: z
		.string()
		.optional()
		.describe(
			'Pagination cursor for retrieving the next set of results. Obtained from previous response when more results are available.',
		),
};

/**
 * Schema for list-pull-requests tool arguments
 */
export const ListPullRequestsToolArgs = z.object({
	/**
	 * Parent identifier (workspace slug containing the repository)
	 */
	parentId: z
		.string()
		.min(1, 'Workspace slug is required')
		.describe(
			'Workspace slug containing the repository. Must be a valid workspace slug from your Bitbucket account. Example: "myteam"',
		),

	/**
	 * Entity identifier (repository slug containing the pull requests)
	 */
	entityId: z
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
	 * Filter query for pull requests
	 */
	filter: z
		.string()
		.optional()
		.describe(
			'Filter pull requests by title, description, or author. Uses Bitbucket query syntax.',
		),

	/**
	 * Maximum number of pull requests to return (default: 50)
	 */
	...PaginationArgs,
});

export type ListPullRequestsToolArgsType = z.infer<
	typeof ListPullRequestsToolArgs
>;

/**
 * Schema for get-pull-request tool arguments
 */
export const GetPullRequestToolArgs = z.object({
	/**
	 * Parent identifier (workspace slug containing the repository)
	 */
	parentId: z
		.string()
		.min(1, 'Workspace slug is required')
		.describe(
			'Workspace slug containing the repository. Must be a valid workspace slug from your Bitbucket account. Example: "myteam"',
		),

	/**
	 * Entity identifier (repository slug containing the pull request)
	 */
	entityId: z
		.string()
		.min(1, 'Repository slug is required')
		.describe(
			'Repository slug containing the pull request. This must be a valid repository in the specified workspace. Example: "project-api"',
		),

	/**
	 * Pull request identifier
	 */
	prId: z
		.union([z.string(), z.number()])
		.transform((value) =>
			typeof value === 'string' ? value : String(value),
		)
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
