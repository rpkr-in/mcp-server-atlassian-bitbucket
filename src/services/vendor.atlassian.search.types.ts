import { ContentType } from '../utils/atlassian.util.js';

/**
 * Content search parameters
 */
export interface ContentSearchParams {
	/** Workspace slug to search in */
	workspaceSlug: string;
	/** Query string to search for */
	query: string;
	/** Maximum number of results to return (default: 25) */
	limit?: number;
	/** Page number for pagination (default: 1) */
	page?: number;
	/** Repository slug to search in (optional) */
	repoSlug?: string;
	/** Type of content to search for (optional) */
	contentType?: ContentType;
}

/**
 * Generic content search result item
 */
export interface ContentSearchResultItem {
	// Most Bitbucket content items will have these fields
	type?: string;
	title?: string;
	name?: string;
	summary?: string;
	description?: string;
	content?: string;
	created_on?: string;
	updated_on?: string;
	links?: {
		self?: { href: string };
		html?: { href: string };
		[key: string]: unknown;
	};
	// Allow additional properties as Bitbucket returns different fields per content type
	[key: string]: unknown;
}

/**
 * Content search response
 */
export interface ContentSearchResponse {
	size: number;
	page: number;
	pagelen: number;
	values: ContentSearchResultItem[];
	next?: string;
	previous?: string;
}
