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
 * Schema for list-workspaces tool arguments
 */
export const ListWorkspacesToolArgs = z.object({
	/**
	 * Filter query for workspaces by name
	 */
	query: z
		.string()
		.optional()
		.describe(
			'Query string to filter workspaces by name (text search). Performs a partial text match on workspace names. Example: "team" would match "my-team" and "team-project". If omitted, returns all accessible workspaces.',
		),

	/**
	 * Sort parameter for ordering results
	 */
	sort: z
		.string()
		.optional()
		.describe(
			'Field to sort results by. Common values: "name", "created_on", "updated_on". Prefix with "-" for descending order. Example: "-name" for reverse alphabetical order. If omitted, defaults to server-defined ordering.',
		),

	/**
	 * Maximum number of workspaces to return and pagination
	 */
	...PaginationArgs,
});

export type ListWorkspacesToolArgsType = z.infer<typeof ListWorkspacesToolArgs>;

/**
 * Schema for get-workspace tool arguments
 */
export const GetWorkspaceToolArgs = z.object({
	/**
	 * Workspace slug to retrieve
	 */
	workspaceSlug: z
		.string()
		.min(1, 'Workspace slug is required')
		.describe(
			'Workspace slug to retrieve detailed information for. Must be a valid workspace slug from your Bitbucket account. Example: "myteam"',
		),
});

export type GetWorkspaceToolArgsType = z.infer<typeof GetWorkspaceToolArgs>;
