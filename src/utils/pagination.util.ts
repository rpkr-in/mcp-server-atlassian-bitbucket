import { logger } from './logger.util.js';

/**
 * Types of pagination mechanisms used by different Atlassian APIs
 */
export enum PaginationType {
	/**
	 * Offset-based pagination (startAt, maxResults, total)
	 * Used by Jira APIs
	 */
	OFFSET = 'offset',

	/**
	 * Cursor-based pagination (cursor in URL)
	 * Used by Confluence APIs
	 */
	CURSOR = 'cursor',

	/**
	 * Page-based pagination (page parameter in URL)
	 * Used by Bitbucket APIs
	 */
	PAGE = 'page',
}

/**
 * Structure for offset-based pagination data
 */
export interface OffsetPaginationData {
	startAt?: number;
	maxResults?: number;
	total?: number;
	nextPage?: string;
	values?: unknown[];
}

/**
 * Structure for cursor-based pagination data (Confluence)
 */
export interface CursorPaginationData {
	_links: {
		next?: string;
	};
	results?: unknown[];
}

/**
 * Structure for page-based pagination data (Bitbucket)
 */
export interface PagePaginationData {
	next?: string;
	values?: unknown[];
}

/**
 * Union type for all pagination data types
 */
export type PaginationData =
	| OffsetPaginationData
	| CursorPaginationData
	| PagePaginationData;

/**
 * Extract pagination information from API response
 * @param data The API response containing pagination information
 * @param paginationType The type of pagination mechanism used
 * @param source Source identifier for logging
 * @returns Object with nextCursor and hasMore properties
 */
export function extractPaginationInfo(
	data: PaginationData,
	paginationType: PaginationType,
	source: string,
): { nextCursor?: string; hasMore: boolean } {
	let nextCursor: string | undefined;

	try {
		switch (paginationType) {
			case PaginationType.OFFSET: {
				const offsetData = data as OffsetPaginationData;
				// Handle Jira's offset-based pagination
				if (
					offsetData.startAt !== undefined &&
					offsetData.maxResults !== undefined &&
					offsetData.total !== undefined &&
					offsetData.startAt + offsetData.maxResults <
						offsetData.total
				) {
					nextCursor = String(
						offsetData.startAt + offsetData.maxResults,
					);
				} else if (offsetData.nextPage) {
					nextCursor = offsetData.nextPage;
				}
				break;
			}

			case PaginationType.CURSOR: {
				const cursorData = data as CursorPaginationData;
				// Handle Confluence's cursor-based pagination
				if (cursorData._links && cursorData._links.next) {
					const nextUrl = cursorData._links.next;
					const cursorMatch = nextUrl.match(/cursor=([^&]+)/);
					if (cursorMatch && cursorMatch[1]) {
						nextCursor = decodeURIComponent(cursorMatch[1]);
					}
				}
				break;
			}

			case PaginationType.PAGE: {
				const pageData = data as PagePaginationData;
				// Handle Bitbucket's page-based pagination
				if (pageData.next) {
					try {
						const nextUrl = new URL(pageData.next);
						const nextPage = nextUrl.searchParams.get('page');
						if (nextPage) {
							nextCursor = nextPage;
						}
					} catch (error) {
						logger.warn(
							`${source} Failed to parse next URL: ${pageData.next}`,
							{ error },
						);
					}
				}
				break;
			}

			default:
				logger.warn(
					`${source} Unknown pagination type: ${paginationType}`,
				);
		}

		if (nextCursor) {
			logger.debug(`${source} Next cursor: ${nextCursor}`);
		}

		return {
			nextCursor,
			hasMore: !!nextCursor,
		};
	} catch (error) {
		logger.warn(
			`${source} Error extracting pagination information: ${error instanceof Error ? error.message : String(error)}`,
		);
		return { hasMore: false };
	}
}
