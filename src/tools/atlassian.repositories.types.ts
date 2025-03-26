import { z } from 'zod';

/**
 * Schema for list-repositories tool arguments
 */
export const ListRepositoriesToolArgs = z.object({
	/**
	 * Workspace slug containing the repositories
	 */
	workspace: z
		.string()
		.min(1, 'Workspace slug is required')
		.describe(
			'Workspace slug containing the repositories. Must be a valid workspace slug from your Bitbucket account. Example: "myteam"',
		),

	/**
	 * Optional query to filter repositories
	 */
	q: z
		.string()
		.optional()
		.describe(
			'Query string to filter repositories using Bitbucket query syntax. Example: "name ~ \\"api\\"" for repositories with "api" in the name. If omitted, returns all repositories.',
		),

	/**
	 * Optional sort parameter
	 */
	sort: z
		.string()
		.optional()
		.describe(
			'Field to sort results by. Common values: "name", "created_on", "updated_on". Prefix with "-" for descending order. Example: "-updated_on" for most recently updated first.',
		),

	/**
	 * Optional role filter
	 */
	role: z
		.string()
		.optional()
		.describe(
			'Filter repositories by the authenticated user\'s role. Common values: "owner", "admin", "contributor", "member". If omitted, returns repositories of all roles.',
		),

	/**
	 * Maximum number of repositories to return (default: 50)
	 */
	limit: z
		.number()
		.int()
		.positive()
		.max(100)
		.optional()
		.describe(
			'Maximum number of repositories to return (1-100). Use this to control the response size. If omitted, defaults to 25.',
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
	workspace: z
		.string()
		.min(1, 'Workspace slug is required')
		.describe(
			'Workspace slug containing the repository. Must be a valid workspace slug from your Bitbucket account. Example: "myteam"',
		),

	/**
	 * Repository slug to retrieve
	 */
	repoSlug: z
		.string()
		.min(1, 'Repository slug is required')
		.describe(
			'Repository slug to retrieve. This must be a valid repository in the specified workspace. Example: "project-api"',
		),

	/**
	 * Whether to include branches in the response
	 */
	includeBranches: z
		.boolean()
		.optional()
		.describe(
			'When true, includes information about repository branches in the response. If omitted, defaults to false.',
		),

	/**
	 * Whether to include commits in the response
	 */
	includeCommits: z
		.boolean()
		.optional()
		.describe(
			'When true, includes recent commits information in the response. If omitted, defaults to false.',
		),

	/**
	 * Whether to include pull requests in the response
	 */
	includePullRequests: z
		.boolean()
		.optional()
		.describe(
			'When true, includes open pull requests information in the response. If omitted, defaults to false.',
		),
});

export type GetRepositoryToolArgsType = z.infer<typeof GetRepositoryToolArgs>;
