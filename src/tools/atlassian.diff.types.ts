import { z } from 'zod';

/**
 * Schema for the branch diff tool arguments
 */
export const BranchDiffArgsSchema = z.object({
	/**
	 * Workspace slug containing the repository
	 */
	workspaceSlug: z
		.string()
		.optional()
		.describe(
			'Workspace slug containing the repository. If not provided, the system will use your default workspace (either configured via BITBUCKET_DEFAULT_WORKSPACE or the first workspace in your account). Example: "myteam"',
		),

	/**
	 * Repository slug containing the branches
	 */
	repoSlug: z
		.string()
		.min(1, 'Repository slug is required')
		.describe(
			'Repository slug containing the branches. Must be a valid repository slug in the specified workspace. Example: "project-api"',
		),

	/**
	 * Source branch (feature branch)
	 */
	sourceBranch: z
		.string()
		.min(1, 'Source branch is required')
		.describe(
			'Source branch for comparison (often the feature branch). Must be a valid branch in the repository. Example: "feature/login-redesign"',
		),

	/**
	 * Destination branch (target branch like main/master)
	 */
	destinationBranch: z
		.string()
		.optional()
		.describe(
			'Destination branch for comparison (the target branch). If not specified, defaults to "main". Example: "develop"',
		),

	/**
	 * Include full diff in the output
	 */
	includeFullDiff: z
		.boolean()
		.optional()
		.describe(
			'Whether to include the full code diff in the output. Defaults to true for rich output.',
		),

	/**
	 * Maximum number of files to return per page
	 */
	limit: z
		.number()
		.int()
		.positive()
		.optional()
		.describe('Maximum number of changed files to return in results'),

	/**
	 * Pagination cursor for retrieving additional results
	 */
	cursor: z
		.number()
		.int()
		.positive()
		.optional()
		.describe('Pagination cursor for retrieving additional results'),
});

export type BranchDiffArgsType = z.infer<typeof BranchDiffArgsSchema>;

/**
 * Schema for the commit diff tool arguments
 */
export const CommitDiffArgsSchema = z.object({
	workspaceSlug: z
		.string()
		.optional()
		.describe(
			'Workspace slug containing the repository. If not provided, the system will use your default workspace.',
		),
	repoSlug: z
		.string()
		.min(1)
		.describe('Repository slug to compare commits in'),
	sinceCommit: z
		.string()
		.min(1)
		.describe('Base commit hash or reference (starting point)'),
	untilCommit: z
		.string()
		.min(1)
		.describe('Target commit hash or reference (ending point)'),
	includeFullDiff: z
		.boolean()
		.optional()
		.describe(
			'Whether to include the full code diff in the response (default: false)',
		),
	limit: z
		.number()
		.int()
		.positive()
		.optional()
		.describe('Maximum number of changed files to return in results'),
	cursor: z
		.number()
		.int()
		.positive()
		.optional()
		.describe('Pagination cursor for retrieving additional results'),
});

export type CommitDiffArgsType = z.infer<typeof CommitDiffArgsSchema>;
