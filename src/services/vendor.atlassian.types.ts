/**
 * Common types for Atlassian Jira API
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
