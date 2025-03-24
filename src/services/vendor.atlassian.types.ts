/**
 * Common types for Atlassian Bitbucket API
 */

/**
 * Label object
 */
export interface Label {
	id: string;
	name: string;
	prefix?: string;
}

/**
 * Operation object
 */
export interface Operation {
	operation: string;
	targetType: string;
}

/**
 * Optional field metadata
 */
export interface OptionalFieldMeta {
	hasMore: boolean;
}

/**
 * Optional field links
 */
export interface OptionalFieldLinks {
	next?: string;
}

/**
 * Common response links
 */
export interface ResponseLinks {
	next?: string;
	base?: string;
	self?: string;
	context?: string;
}

/**
 * Generic paginated response structure
 */
export interface PaginatedResponse<T> {
	results: T[];
	_links: ResponseLinks;
}

/**
 * Version object
 */
export interface Version {
	createdAt: string;
	message?: string;
	number: number;
	minorEdit?: boolean;
	authorId: string;
}

/**
 * Content property object
 */
export interface ContentProperty {
	id: string;
	key: string;
	value: string;
}

/**
 * Common description format types
 */
export type DescriptionFormat = 'plain' | 'view';

/**
 * Generic content representation
 */
export interface ContentRepresentation {
	value: string;
	representation: string;
}

/**
 * Common search excerpt strategy
 */
export type ExcerptStrategy =
	| 'highlight'
	| 'indexed'
	| 'none'
	| 'highlight_unescaped'
	| 'indexed_unescaped';

export interface ApiErrorDetail {
	/**
	 * The error message
	 */
	message: string;
}

export interface ApiError {
	/**
	 * Array of error details
	 */
	errorMessages: string[];
	/**
	 * Object with error details as key-value pairs
	 */
	errors: Record<string, string>;
	/**
	 * HTTP status code
	 */
	status?: number;
	/**
	 * Original error object (for debugging)
	 */
	originalError?: unknown;
}

export interface ApiPagination {
	/**
	 * Maximum number of items to return per page
	 */
	maxResults?: number;
	/**
	 * Index of the first item to return (0-based)
	 */
	startAt?: number;
}

export interface ApiResponse<T> {
	/**
	 * The response data
	 */
	data: T;
	/**
	 * The HTTP status code
	 */
	status: number;
	/**
	 * The HTTP status text
	 */
	statusText: string;
	/**
	 * The response headers
	 */
	headers: Record<string, string>;
}

export interface PaginatedResult<T> {
	/**
	 * The array of results
	 */
	values: T[];
	/**
	 * The index of the first item returned (0-based)
	 */
	startAt: number;
	/**
	 * The maximum number of items that could be returned
	 */
	maxResults: number;
	/**
	 * The total number of items
	 */
	total: number;
	/**
	 * Whether the maximum number of items has been reached
	 */
	isLast: boolean;
}

export interface FormattedResult {
	/**
	 * The formatted content as Markdown
	 */
	content: string;
}
