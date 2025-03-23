import { z } from 'zod';

/**
 * Arguments for listing Jira projects
 * Includes optional filters with defaults applied in the controller
 */
const ListProjectsToolArgs = z.object({
	query: z
		.string()
		.optional()
		.describe(
			'Filter projects by name or key. Use this to search for specific projects by their name or project key.',
		),
	limit: z
		.number()
		.min(1)
		.max(100)
		.optional()
		.describe(
			'Maximum number of projects to return (1-100). Use this to control the response size. Useful for pagination or when you only need a few results.',
		),
	cursor: z
		.string()
		.optional()
		.describe(
			'Pagination cursor for retrieving the next set of results. Use this to navigate through large result sets. The cursor value can be obtained from the pagination information in a previous response.',
		),
});

type ListProjectsToolArgsType = z.infer<typeof ListProjectsToolArgs>;

/**
 * Arguments for getting a specific Jira project
 * This matches the controller implementation which takes only an ID or key parameter
 */
const GetProjectToolArgs = z.object({
	idOrKey: z
		.string()
		.describe(
			'The ID or key of the Jira project to retrieve (e.g., "10001" or "PROJ"). This is required and must be a valid project ID or key from your Jira instance.',
		),
});

type GetProjectToolArgsType = z.infer<typeof GetProjectToolArgs>;

export {
	ListProjectsToolArgs,
	type ListProjectsToolArgsType,
	GetProjectToolArgs,
	type GetProjectToolArgsType,
};
