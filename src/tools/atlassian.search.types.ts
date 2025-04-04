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
		 * Workspace slug containing the content to search.
		 * Must be a valid workspace slug from your Bitbucket account.
		 * Example: "myteam"
		 */
		workspaceSlug: z
			.string()
			.min(1)
			.describe(
				'Workspace slug containing the content to search. Must be a valid workspace slug from your Bitbucket account. Example: "myteam"',
			),

		/**
		 * Repository slug to search within.
		 * This is required when searching for pull requests.
		 * Optional for code search; if provided, limits code search to the specified repo.
		 * Example: "backend-api"
		 */
		repoSlug: z
			.string()
			.optional()
			.describe(
				'Repository slug to search within. Required for pull requests search. Optional for code search (limits search to the specified repo). Example: "backend-api"',
			),

		/**
		 * Search query to filter results by name, description, or code content.
		 * Required for code search.
		 * Use this to find specific content matching certain terms.
		 */
		query: z
			.string()
			.optional()
			.describe(
				'Search query to filter results by name, description, or code content. Required for code search. Use this to find specific content matching certain terms.',
			),

		/**
		 * Scope of the search. Options include:
		 * - "repositories" (search only repositories)
		 * - "pullrequests" (search only pull requests)
		 * - "commits" (search only commits)
		 * - "code" (search file content)
		 * - "all" (search repositories and pull requests)
		 * Defaults to "all" if not specified.
		 */
		scope: z
			.enum(['repositories', 'pullrequests', 'commits', 'code', 'all'])
			.optional()
			.describe(
				'Scope of the search. Options include: "repositories" (search only repositories), "pullrequests" (search only pull requests), "commits" (search only commits), "code" (search file content), or "all" (search both repositories and pull requests). Defaults to "all" if not specified.',
			),
	})
	.merge(PaginationArgs);

export type SearchToolArgsType = z.infer<typeof SearchToolArgs>;
