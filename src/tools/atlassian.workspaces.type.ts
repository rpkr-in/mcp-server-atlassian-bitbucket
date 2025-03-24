import { z } from 'zod';

/**
 * Arguments for listing Bitbucket workspaces
 * Includes optional filters with defaults applied in the controller
 */
const ListWorkspacesToolArgs = z.object({
	limit: z
		.number()
		.min(1)
		.max(100)
		.optional()
		.describe(
			'Maximum number of workspaces to return (1-100). Use this to control the response size. Defaults to 50 if not specified.',
		),
	cursor: z
		.string()
		.optional()
		.describe(
			'Pagination cursor for retrieving the next set of results. Use this to navigate through large result sets. The cursor value can be obtained from the pagination information in a previous response.',
		),
});

type ListWorkspacesToolArgsType = z.infer<typeof ListWorkspacesToolArgs>;

/**
 * Arguments for getting a specific Bitbucket workspace
 * This matches the controller implementation which takes only a slug parameter
 */
const GetWorkspaceToolArgs = z.object({
	slug: z
		.string()
		.describe(
			'The slug of the Bitbucket workspace to retrieve (e.g., "myworkspace"). This is the unique identifier used in the workspace URL.',
		),
});

type GetWorkspaceToolArgsType = z.infer<typeof GetWorkspaceToolArgs>;

export {
	ListWorkspacesToolArgs,
	type ListWorkspacesToolArgsType,
	GetWorkspaceToolArgs,
	type GetWorkspaceToolArgsType,
};
