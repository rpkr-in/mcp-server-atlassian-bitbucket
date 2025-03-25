/**
 * Common pagination information for Atlassian API responses
 */
export interface ResponsePagination {
	/**
	 * Cursor for the next page of results, if available
	 */
	nextCursor?: string;

	/**
	 * Whether more results are available
	 */
	hasMore: boolean;
}

/**
 * Common pagination options for Atlassian API requests
 */
export interface PaginationOptions {
	/**
	 * Limit the number of results returned
	 */
	limit?: number;

	/**
	 * Pagination cursor for retrieving the next set of results
	 */
	cursor?: string;
}

/**
 * Base interface for entity identifiers
 * Used to standardize parameter patterns across controllers
 */
export interface EntityIdentifier {
	[key: string]: string;
}

/**
 * Common response structure for controller operations
 */
export interface ControllerResponse {
	/**
	 * Formatted content to be displayed
	 */
	content: string;

	/**
	 * Optional pagination information
	 */
	pagination?: ResponsePagination;
}
