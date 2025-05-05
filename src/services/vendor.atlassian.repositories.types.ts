import { z } from 'zod';

/**
 * Types for Atlassian Bitbucket Repositories API
 */

// Link href schema
const LinkSchema = z.object({
	href: z.string(),
	name: z.string().optional(),
});

/**
 * Repository SCM type
 */
export const RepositorySCMSchema = z.enum(['git', 'hg']);
// export type RepositorySCM = z.infer<typeof RepositorySCMSchema>;

/**
 * Repository fork policy
 */
export const RepositoryForkPolicySchema = z.enum([
	'allow_forks',
	'no_public_forks',
	'no_forks',
]);
// export type RepositoryForkPolicy = z.infer<typeof RepositoryForkPolicySchema>;

/**
 * Repository links object
 */
export const RepositoryLinksSchema = z.object({
	self: LinkSchema.optional(),
	html: LinkSchema.optional(),
	avatar: LinkSchema.optional(),
	pullrequests: LinkSchema.optional(),
	commits: LinkSchema.optional(),
	forks: LinkSchema.optional(),
	watchers: LinkSchema.optional(),
	downloads: LinkSchema.optional(),
	clone: z.array(LinkSchema).optional(),
	hooks: LinkSchema.optional(),
	issues: LinkSchema.optional(),
});
// export type RepositoryLinks = z.infer<typeof RepositoryLinksSchema>;

/**
 * Repository owner links schema
 */
const OwnerLinksSchema = z.object({
	self: LinkSchema.optional(),
	html: LinkSchema.optional(),
	avatar: LinkSchema.optional(),
});

/**
 * Repository owner object
 */
export const RepositoryOwnerSchema = z.object({
	type: z.enum(['user', 'team']),
	username: z.string().optional(),
	display_name: z.string().optional(),
	uuid: z.string().optional(),
	links: OwnerLinksSchema.optional(),
});
// export type RepositoryOwner = z.infer<typeof RepositoryOwnerSchema>;

/**
 * Repository branch object
 */
export const RepositoryBranchSchema = z.object({
	type: z.literal('branch'),
	name: z.string(),
});
// export type RepositoryBranch = z.infer<typeof RepositoryBranchSchema>;

/**
 * Repository project links schema
 */
const ProjectLinksSchema = z.object({
	self: LinkSchema.optional(),
	html: LinkSchema.optional(),
});

/**
 * Repository project object
 */
export const RepositoryProjectSchema = z.object({
	type: z.literal('project'),
	key: z.string(),
	uuid: z.string(),
	name: z.string(),
	links: ProjectLinksSchema.optional(),
});
// export type RepositoryProject = z.infer<typeof RepositoryProjectSchema>;

/**
 * Repository object returned from the API
 */
export const RepositorySchema = z.object({
	type: z.literal('repository'),
	uuid: z.string(),
	full_name: z.string(),
	name: z.string(),
	description: z.string().optional(),
	is_private: z.boolean(),
	fork_policy: RepositoryForkPolicySchema.optional(),
	created_on: z.string().optional(),
	updated_on: z.string().optional(),
	size: z.number().optional(),
	language: z.string().optional(),
	has_issues: z.boolean().optional(),
	has_wiki: z.boolean().optional(),
	scm: RepositorySCMSchema,
	owner: RepositoryOwnerSchema,
	mainbranch: RepositoryBranchSchema.optional(),
	project: RepositoryProjectSchema.optional(),
	links: RepositoryLinksSchema,
});
export type Repository = z.infer<typeof RepositorySchema>;

/**
 * Extended repository object with optional fields
 * @remarks Currently identical to Repository, but allows for future extension
 */
export const RepositoryDetailedSchema = RepositorySchema;
export type RepositoryDetailed = z.infer<typeof RepositoryDetailedSchema>;

/**
 * Parameters for listing repositories
 */
export const ListRepositoriesParamsSchema = z.object({
	workspace: z.string(),
	q: z.string().optional(),
	sort: z.string().optional(),
	page: z.number().optional(),
	pagelen: z.number().optional(),
	role: z.string().optional(),
});
export type ListRepositoriesParams = z.infer<
	typeof ListRepositoriesParamsSchema
>;

/**
 * Parameters for getting a repository by identifier
 */
export const GetRepositoryParamsSchema = z.object({
	workspace: z.string(),
	repo_slug: z.string(),
});
export type GetRepositoryParams = z.infer<typeof GetRepositoryParamsSchema>;

/**
 * API response for listing repositories
 */
export const RepositoriesResponseSchema = z.object({
	pagelen: z.number(),
	page: z.number(),
	size: z.number(),
	next: z.string().optional(),
	previous: z.string().optional(),
	values: z.array(RepositorySchema),
});
export type RepositoriesResponse = z.infer<typeof RepositoriesResponseSchema>;

// --- Commit History Types ---

/**
 * Parameters for listing commits.
 */
export const ListCommitsParamsSchema = z.object({
	workspace: z.string(),
	repo_slug: z.string(),
	include: z.string().optional(), // Branch, tag, or hash to include history from
	exclude: z.string().optional(), // Branch, tag, or hash to exclude history up to
	path: z.string().optional(), // File path to filter commits by
	page: z.number().optional(),
	pagelen: z.number().optional(),
});
export type ListCommitsParams = z.infer<typeof ListCommitsParamsSchema>;

/**
 * Commit author user links schema
 */
const CommitAuthorUserLinksSchema = z.object({
	self: LinkSchema.optional(),
	avatar: LinkSchema.optional(),
});

/**
 * Commit author user schema
 */
const CommitAuthorUserSchema = z.object({
	display_name: z.string().optional(),
	nickname: z.string().optional(),
	account_id: z.string().optional(),
	uuid: z.string().optional(),
	type: z.string(), // Usually 'user'
	links: CommitAuthorUserLinksSchema.optional(),
});

/**
 * Commit author schema
 */
export const CommitAuthorSchema = z.object({
	raw: z.string(),
	type: z.string(), // Usually 'author'
	user: CommitAuthorUserSchema.optional(),
});
// export type CommitAuthor = z.infer<typeof CommitAuthorSchema>;

/**
 * Commit links schema
 */
const CommitLinksSchema = z.object({
	self: LinkSchema.optional(),
	html: LinkSchema.optional(),
	diff: LinkSchema.optional(),
	approve: LinkSchema.optional(),
	comments: LinkSchema.optional(),
});

/**
 * Commit summary schema
 */
const CommitSummarySchema = z.object({
	raw: z.string().optional(),
	markup: z.string().optional(),
	html: z.string().optional(),
});

/**
 * Commit parent schema
 */
const CommitParentSchema = z.object({
	hash: z.string(),
	type: z.string(),
	links: z.unknown(),
});

/**
 * Represents a single commit in the history.
 */
export const CommitSchema = z.object({
	hash: z.string(),
	type: z.string(), // Usually 'commit'
	author: CommitAuthorSchema,
	date: z.string(), // ISO 8601 format date string
	message: z.string(),
	links: CommitLinksSchema,
	summary: CommitSummarySchema.optional(),
	parents: z.array(CommitParentSchema),
});
export type Commit = z.infer<typeof CommitSchema>;

/**
 * API response for listing commits (paginated).
 */
export const PaginatedCommitsSchema = z.object({
	pagelen: z.number(),
	page: z.number().optional(),
	size: z.number().optional(),
	next: z.string().optional(),
	previous: z.string().optional(),
	values: z.array(CommitSchema),
});
export type PaginatedCommits = z.infer<typeof PaginatedCommitsSchema>;
