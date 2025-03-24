import { z } from 'zod';

/**
 * Schema for list-repositories tool arguments
 */
export const ListRepositoriesToolArgs = z.object({
	/**
	 * Workspace slug containing the repositories
	 */
	workspace: z.string().min(1, 'Workspace slug is required'),

	/**
	 * Optional query to filter repositories
	 */
	q: z.string().optional(),

	/**
	 * Optional sort parameter
	 */
	sort: z.string().optional(),

	/**
	 * Optional role filter
	 */
	role: z.string().optional(),

	/**
	 * Maximum number of repositories to return (default: 50)
	 */
	limit: z.number().int().positive().optional(),

	/**
	 * Pagination cursor for retrieving the next set of results
	 */
	cursor: z.string().optional(),
});

export type ListRepositoriesToolArgsType = z.infer<
	typeof ListRepositoriesToolArgs
>;

/**
 * Schema for get-repository tool arguments
 */
export const GetRepositoryToolArgs = z.object({
	/**
	 * Workspace slug containing the repository
	 */
	workspace: z.string().min(1, 'Workspace slug is required'),

	/**
	 * Repository slug to retrieve
	 */
	repoSlug: z.string().min(1, 'Repository slug is required'),

	/**
	 * Whether to include branches in the response
	 */
	includeBranches: z.boolean().optional(),

	/**
	 * Whether to include commits in the response
	 */
	includeCommits: z.boolean().optional(),

	/**
	 * Whether to include pull requests in the response
	 */
	includePullRequests: z.boolean().optional(),
});

export type GetRepositoryToolArgsType = z.infer<typeof GetRepositoryToolArgs>;
