/**
 * Types for Atlassian Bitbucket Repositories API
 */

/**
 * Repository SCM type
 */
export type RepositorySCM = 'git' | 'hg';

/**
 * Repository fork policy
 */
export type RepositoryForkPolicy =
	| 'allow_forks'
	| 'no_public_forks'
	| 'no_forks';

/**
 * Repository links object
 */
export interface RepositoryLinks {
	self?: { href: string; name?: string };
	html?: { href: string; name?: string };
	avatar?: { href: string; name?: string };
	pullrequests?: { href: string; name?: string };
	commits?: { href: string; name?: string };
	forks?: { href: string; name?: string };
	watchers?: { href: string; name?: string };
	downloads?: { href: string; name?: string };
	clone?: Array<{ href: string; name?: string }>;
	hooks?: { href: string; name?: string };
	issues?: { href: string; name?: string };
}

/**
 * Repository owner object
 */
export interface RepositoryOwner {
	type: 'user' | 'team';
	username?: string;
	display_name?: string;
	uuid?: string;
	links?: {
		self?: { href: string };
		html?: { href: string };
		avatar?: { href: string };
	};
}

/**
 * Repository branch object
 */
export interface RepositoryBranch {
	type: 'branch';
	name: string;
}

/**
 * Repository project object
 */
export interface RepositoryProject {
	type: 'project';
	key: string;
	uuid: string;
	name: string;
	links?: {
		self?: { href: string };
		html?: { href: string };
	};
}

/**
 * Repository object returned from the API
 */
export interface Repository {
	type: 'repository';
	uuid: string;
	full_name: string;
	name: string;
	description?: string;
	is_private: boolean;
	fork_policy?: RepositoryForkPolicy;
	created_on?: string;
	updated_on?: string;
	size?: number;
	language?: string;
	has_issues?: boolean;
	has_wiki?: boolean;
	scm: RepositorySCM;
	owner: RepositoryOwner;
	mainbranch?: RepositoryBranch;
	project?: RepositoryProject;
	links: RepositoryLinks;
}

/**
 * Extended repository object with optional fields
 * @remarks Currently identical to Repository, but allows for future extension
 */
export type RepositoryDetailed = Repository;

/**
 * Parameters for listing repositories
 */
export interface ListRepositoriesParams {
	workspace: string;
	q?: string;
	sort?: string;
	page?: number;
	pagelen?: number;
}

/**
 * Parameters for getting a repository by identifier
 */
export interface GetRepositoryParams {
	workspace: string;
	repo_slug: string;
}

/**
 * API response for listing repositories
 */
export interface RepositoriesResponse {
	pagelen: number;
	page: number;
	size: number;
	next?: string;
	previous?: string;
	values: Repository[];
}

// --- Commit History Types ---

/**
 * Parameters for listing commits.
 */
export interface ListCommitsParams {
	workspace: string;
	repo_slug: string;
	include?: string; // Branch, tag, or hash to include history from
	exclude?: string; // Branch, tag, or hash to exclude history up to
	path?: string; // File path to filter commits by
	page?: number;
	pagelen?: number;
}

/**
 * Represents the author of a commit.
 */
export interface CommitAuthor {
	raw: string; // Raw author string (e.g., "Andi A <andi@example.com>")
	type: string; // Usually 'author'
	user?: {
		display_name?: string;
		nickname?: string;
		account_id?: string;
		uuid?: string;
		type: string; // Usually 'user'
		links?: {
			self?: { href: string };
			avatar?: { href: string };
		};
	};
}

/**
 * Represents a single commit in the history.
 */
export interface Commit {
	hash: string;
	type: string; // Usually 'commit'
	author: CommitAuthor;
	date: string; // ISO 8601 format date string
	message: string;
	links: {
		self?: { href: string };
		html?: { href: string };
		diff?: { href: string };
		approve?: { href: string };
		comments?: { href: string };
	};
	summary?: {
		raw?: string;
		markup?: string; // e.g., 'markdown'
		html?: string;
	};
	parents: Array<{ hash: string; type: string; links: unknown }>;
}

/**
 * API response for listing commits (paginated).
 */
export interface PaginatedCommits {
	pagelen: number;
	page: number;
	size: number;
	next?: string;
	previous?: string;
	values: Commit[];
}
