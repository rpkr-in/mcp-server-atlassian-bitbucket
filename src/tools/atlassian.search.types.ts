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
	 * Use this to navigate through large result sets.
	 * The cursor value can be obtained from the pagination information in a previous response.
	 */
	cursor: z
		.string()
		.optional()
		.describe(
			'Pagination cursor for retrieving the next set of results. Use this to navigate through large result sets. The cursor value can be obtained from the pagination information in a previous response.',
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
		 * Example: "backend-api"
		 */
		repoSlug: z
			.string()
			.optional()
			.describe(
				'Repository slug to search within. This is required when searching for pull requests. Example: "backend-api"',
			),

		/**
		 * Search query to filter results by name, description, etc.
		 * Use this to find specific content matching certain terms.
		 */
		query: z
			.string()
			.optional()
			.describe(
				'Search query to filter results by name, description, etc. Use this to find specific content matching certain terms.',
			),

		/**
		 * Scope of the search. Options include:
		 * - "repositories" (search only repositories)
		 * - "pullrequests" (search only pull requests)
		 * - "all" (search both repositories and pull requests)
		 * Defaults to "all" if not specified.
		 */
		scope: z
			.enum(['repositories', 'pullrequests', 'all'])
			.optional()
			.describe(
				'Scope of the search. Options include: "repositories" (search only repositories), "pullrequests" (search only pull requests), or "all" (search both repositories and pull requests). Defaults to "all" if not specified.',
			),
	})
	.merge(PaginationArgs);

export type SearchToolArgsType = z.infer<typeof SearchToolArgs>;
