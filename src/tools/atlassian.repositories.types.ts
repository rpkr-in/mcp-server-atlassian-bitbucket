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
 * Schema for list-repositories tool arguments
 */
export const ListRepositoriesToolArgs = z.object({
	/**
	 * Parent identifier (workspace slug containing the repositories)
	 */
	parentId: z
		.string()
		.min(1, 'Workspace slug is required')
		.describe(
			'Workspace slug containing the repositories. Must be a valid workspace slug from your Bitbucket account. Example: "myteam"',
		)
		.optional(),

	/**
	 * For backward compatibility - same as parentId
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
	filter: z
		.string()
		.optional()
		.describe(
			'Query string to filter repositories. Example: "api" for repositories with "api" in the name/description. If omitted, returns all repositories.',
		),

	/**
	 * For backward compatibility - same as filter
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
	 * Maximum number of repositories to return (default: 25)
	 */
	...PaginationArgs,
});

export type ListRepositoriesToolArgsType = z.infer<
	typeof ListRepositoriesToolArgs
>;

/**
 * Schema for get-repository tool arguments
 */
export const GetRepositoryToolArgs = z.object({
	/**
	 * Parent identifier (workspace slug containing the repository)
	 */
	parentId: z
		.string()
		.min(1, 'Workspace slug is required')
		.describe(
			'Workspace slug containing the repository. Must be a valid workspace slug from your Bitbucket account. Example: "myteam"',
		)
		.optional(),

	/**
	 * For backward compatibility - same as parentId
	 */
	workspace: z
		.string()
		.min(1, 'Workspace slug is required')
		.describe(
			'Workspace slug containing the repository. Must be a valid workspace slug from your Bitbucket account. Example: "myteam"',
		),

	/**
	 * Entity identifier (repository slug to retrieve)
	 */
	entityId: z
		.string()
		.min(1, 'Repository slug is required')
		.describe(
			'Repository slug to retrieve. This must be a valid repository in the specified workspace. Example: "project-api"',
		)
		.optional(),

	/**
	 * For backward compatibility - same as entityId
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
