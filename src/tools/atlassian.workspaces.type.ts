import { z } from 'zod';

/**
 * Schema for list-workspaces tool arguments
 */
export const ListWorkspacesToolArgs = z.object({
	/**
	 * Query to filter workspaces by name
	 */
	q: z.string().optional(),

	/**
	 * Sort parameter for ordering results
	 */
	sort: z.string().optional(),

	/**
	 * Maximum number of workspaces to return (default: 50)
	 */
	limit: z.number().int().positive().optional(),

	/**
	 * Pagination cursor for retrieving the next set of results
	 */
	cursor: z.string().optional(),
});

export type ListWorkspacesToolArgsType = z.infer<typeof ListWorkspacesToolArgs>;

/**
 * Schema for get-workspace tool arguments
 */
export const GetWorkspaceToolArgs = z.object({
	/**
	 * Workspace slug to retrieve
	 */
	slug: z.string().min(1, 'Workspace slug is required'),
});

export type GetWorkspaceToolArgsType = z.infer<typeof GetWorkspaceToolArgs>;
