import { z } from 'zod';

/**
 * Schema for list-pullrequests tool arguments
 */
export const ListPullRequestsToolArgs = z.object({
	/**
	 * Workspace slug containing the repository
	 */
	workspace: z.string().min(1, 'Workspace slug is required'),

	/**
	 * Repository slug containing the pull requests
	 */
	repoSlug: z.string().min(1, 'Repository slug is required'),

	/**
	 * Filter by pull request state
	 */
	state: z.enum(['OPEN', 'MERGED', 'DECLINED', 'SUPERSEDED']).optional(),

	/**
	 * Maximum number of pull requests to return (default: 50)
	 */
	limit: z.number().int().positive().optional(),

	/**
	 * Pagination cursor for retrieving the next set of results
	 */
	cursor: z.string().optional(),
});

export type ListPullRequestsToolArgsType = z.infer<
	typeof ListPullRequestsToolArgs
>;

/**
 * Schema for get-pullrequest tool arguments
 */
export const GetPullRequestToolArgs = z.object({
	/**
	 * Workspace slug containing the repository
	 */
	workspace: z.string().min(1, 'Workspace slug is required'),

	/**
	 * Repository slug containing the pull request
	 */
	repoSlug: z.string().min(1, 'Repository slug is required'),

	/**
	 * Pull request ID to retrieve
	 */
	pullRequestId: z.number().int().positive(),

	/**
	 * Whether to include comments in the response
	 */
	includeComments: z.boolean().optional(),
});

export type GetPullRequestToolArgsType = z.infer<typeof GetPullRequestToolArgs>;
