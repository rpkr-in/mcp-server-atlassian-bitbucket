import { z } from 'zod';

/**
 * Arguments for listing Bitbucket pull requests
 * Includes optional filters with defaults applied in the controller
 */
const ListPullRequestsToolArgs = z.object({
	workspace: z
		.string()
		.describe(
			'The workspace slug (e.g., "myworkspace"). This is required and identifies which Bitbucket workspace to get pull requests from.',
		),
	repo_slug: z
		.string()
		.describe(
			'The repository slug (e.g., "my-project"). This is required and identifies which repository to get pull requests from.',
		),
	state: z
		.enum(['OPEN', 'MERGED', 'DECLINED', 'SUPERSEDED'])
		.optional()
		.describe(
			'Filter by pull request state. Defaults to OPEN if not specified.',
		),
	limit: z
		.number()
		.min(1)
		.max(100)
		.default(25)
		.describe(
			'Maximum number of pull requests to return (1-100). Use this to control the response size. Defaults to 25 if not specified.',
		),
	cursor: z
		.string()
		.optional()
		.describe(
			'Pagination cursor for retrieving the next set of results. Use this to navigate through large result sets. The cursor value can be obtained from the pagination information in a previous response.',
		),
});

type ListPullRequestsToolArgsType = z.infer<typeof ListPullRequestsToolArgs>;

/**
 * Arguments for getting a specific Bitbucket pull request
 * This matches the controller implementation which takes workspace, repo_slug and pull_request_id parameters
 */
const GetPullRequestToolArgs = z.object({
	workspace: z
		.string()
		.describe(
			'The workspace slug (e.g., "myworkspace"). This is required and identifies which Bitbucket workspace the repository belongs to.',
		),
	repo_slug: z
		.string()
		.describe(
			'The repository slug (e.g., "my-project"). This is required and identifies which repository the pull request belongs to.',
		),
	pull_request_id: z
		.number()
		.describe(
			'The pull request ID (e.g., 42). This is required and identifies which pull request to retrieve.',
		),
});

type GetPullRequestToolArgsType = z.infer<typeof GetPullRequestToolArgs>;

export {
	ListPullRequestsToolArgs,
	type ListPullRequestsToolArgsType,
	GetPullRequestToolArgs,
	type GetPullRequestToolArgsType,
};
