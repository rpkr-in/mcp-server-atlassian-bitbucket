import { z } from 'zod';

/**
 * Arguments for listing Bitbucket repositories
 * Includes optional filters with defaults applied in the controller
 */
const ListRepositoriesToolArgs = z.object({
	workspace: z
		.string()
		.describe(
			'The workspace slug (e.g., "myworkspace"). This is required and identifies which Bitbucket workspace to get repositories from.',
		),
	query: z
		.string()
		.optional()
		.describe(
			'Query string to filter repositories using Bitbucket query syntax (e.g., "name ~ \\"api\\"" for repositories with "api" in the name, or "language = \\"java\\"" for Java repositories). You can combine conditions with AND/OR operators.',
		),
	limit: z
		.number()
		.min(1)
		.max(100)
		.optional()
		.describe(
			'Maximum number of repositories to return (1-100). Use this to control the response size. Defaults to 50 if not specified.',
		),
	cursor: z
		.string()
		.optional()
		.describe(
			'Pagination cursor for retrieving the next set of results. Use this to navigate through large result sets. The cursor value can be obtained from the pagination information in a previous response.',
		),
});

type ListRepositoriesToolArgsType = z.infer<typeof ListRepositoriesToolArgs>;

/**
 * Arguments for getting a specific Bitbucket repository
 * This matches the controller implementation which takes workspace and repo_slug parameters
 */
const GetRepositoryToolArgs = z.object({
	workspace: z
		.string()
		.describe(
			'The workspace slug (e.g., "myworkspace"). This is required and identifies which Bitbucket workspace the repository belongs to.',
		),
	repo_slug: z
		.string()
		.describe(
			'The repository slug (e.g., "my-project"). This is required and identifies which repository to retrieve.',
		),
});

type GetRepositoryToolArgsType = z.infer<typeof GetRepositoryToolArgs>;

export {
	ListRepositoriesToolArgs,
	type ListRepositoriesToolArgsType,
	GetRepositoryToolArgs,
	type GetRepositoryToolArgsType,
};
