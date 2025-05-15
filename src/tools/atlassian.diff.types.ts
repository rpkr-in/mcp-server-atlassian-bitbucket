import { z } from 'zod';

/**
 * Schema for the branch diff tool arguments
 */
export const BranchDiffArgsSchema = z.object({
	workspaceSlug: z
		.string()
		.min(1)
		.describe('Workspace slug containing the repository'),
	repoSlug: z
		.string()
		.min(1)
		.describe('Repository slug to compare branches in'),
	sourceBranch: z
		.string()
		.min(1)
		.describe('Source branch name for comparison (e.g., "feature-branch")'),
	destinationBranch: z
		.string()
		.optional()
		.describe(
			'Destination branch name for comparison (defaults to "main")',
		),
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

export type BranchDiffArgsType = z.infer<typeof BranchDiffArgsSchema>;

/**
 * Schema for the commit diff tool arguments
 */
export const CommitDiffArgsSchema = z.object({
	workspaceSlug: z
		.string()
		.min(1)
		.describe('Workspace slug containing the repository'),
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
