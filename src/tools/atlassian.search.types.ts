import { z } from 'zod';

/**
 * Pagination arguments
 * Used for pagination of search results
 */
const PaginationArgs = z.object({
	/**
	 * Maximum number of items to return (1-100).
	 * Use this to control the response size.
	 * Useful for pagination or when you only need a few results.
	 */
	limit: z
		.number()
		.min(1)
		.max(100)
		.optional()
		.describe(
			'Maximum number of items to return (1-100). Use this to control the response size. Useful for pagination or when you only need a few results.',
		),

	/**
	 * Pagination cursor for retrieving the next set of results.
	 * For repositories and pull requests, this is a cursor string.
	 * For code search, this is a page number.
	 * Use this to navigate through large result sets.
	 */
	cursor: z
		.string()
		.optional()
		.describe(
			'Pagination cursor for retrieving the next set of results. For repositories and pull requests, this is a cursor string. For code search, this is a page number. Use this to navigate through large result sets.',
		),
});

/**
 * Bitbucket search tool arguments
 * Specifies what to search for and how to filter results
 */
export const SearchToolArgs = z
	.object({
		/**
		 * Workspace slug to search in. Example: "myteam"
		 */
		workspaceSlug: z
			.string()
			.min(1)
			.describe('Workspace slug to search in. Example: "myteam"'),

		/**
		 * Optional: Repository slug to limit search scope. Required for `pullrequests` and `commits` scopes. Example: "project-api"
		 */
		repoSlug: z
			.string()
			.optional()
			.describe(
				'Optional: Repository slug to limit search scope. Required for `pullrequests` and `commits` scopes. Example: "project-api"',
			),

		/**
		 * Search query text. Required. Will match against content based on the selected search scope.
		 */
		query: z
			.string()
			.min(1)
			.describe(
				'Search query text. Required. Will match against content based on the selected search scope.',
			),

		/**
		 * Search scope: "repositories", "pullrequests", "commits", "code", or "all". Default: "all"
		 */
		scope: z
			.enum(['repositories', 'pullrequests', 'commits', 'code', 'all'])
			.optional()
			.describe(
				'Search scope: "repositories", "pullrequests", "commits", "code", or "all". Default: "all"',
			),
	})
	.merge(PaginationArgs);

export type SearchToolArgsType = z.infer<typeof SearchToolArgs>;
