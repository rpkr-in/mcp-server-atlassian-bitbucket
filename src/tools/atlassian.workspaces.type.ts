import { z } from 'zod';

/**
 * Schema for list-workspaces tool arguments
 */
export const ListWorkspacesToolArgs = z.object({
	/**
	 * Query to filter workspaces by name
	 */
	q: z
		.string()
		.optional()
		.describe(
			'Query string to filter workspaces by name. Performs a partial text match on workspace names. Example: "team" would match "my-team" and "team-project". If omitted, returns all accessible workspaces.',
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
	 * Maximum number of workspaces to return (default: 50)
	 */
	limit: z
		.number()
		.int()
		.positive()
		.max(100)
		.optional()
		.describe(
			'Maximum number of workspaces to return (1-100). Use this to control the response size. If omitted, defaults to 25.',
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

export type ListWorkspacesToolArgsType = z.infer<typeof ListWorkspacesToolArgs>;

/**
 * Schema for get-workspace tool arguments
 */
export const GetWorkspaceToolArgs = z.object({
	/**
	 * Workspace slug to retrieve
	 */
	workspace: z
		.string()
		.min(1, 'Workspace slug is required')
		.describe(
			'Workspace slug to retrieve detailed information for. Must be a valid workspace slug from your Bitbucket account. Example: "myteam"',
		),
});

export type GetWorkspaceToolArgsType = z.infer<typeof GetWorkspaceToolArgs>;
