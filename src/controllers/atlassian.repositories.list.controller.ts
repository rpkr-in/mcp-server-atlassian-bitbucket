import atlassianRepositoriesService from '../services/vendor.atlassian.repositories.service.js';
import { Logger } from '../utils/logger.util.js';
import { handleControllerError } from '../utils/error-handler.util.js';
import { DEFAULT_PAGE_SIZE, applyDefaults } from '../utils/defaults.util.js';
import {
	extractPaginationInfo,
	PaginationType,
} from '../utils/pagination.util.js';
import { formatPagination } from '../utils/formatter.util.js';
import { ControllerResponse } from '../types/common.types.js';
import { ListRepositoriesToolArgsType } from '../tools/atlassian.repositories.types.js';
import { formatRepositoriesList } from './atlassian.repositories.formatter.js';
import { ListRepositoriesParams } from '../services/vendor.atlassian.repositories.types.js';
import { getDefaultWorkspace } from '../utils/workspace.util.js';
import { formatBitbucketQuery } from '../utils/query.util.js';

// Create a contextualized logger for this file
const logger = Logger.forContext(
	'controllers/atlassian.repositories.list.controller.ts',
);

/**
 * Lists repositories for a specific workspace with pagination and filtering options
 * @param options - Options for listing repositories including workspaceSlug
 * @returns Formatted list of repositories with pagination information
 */
export async function handleRepositoriesList(
	options: ListRepositoriesToolArgsType,
): Promise<ControllerResponse> {
	const methodLogger = logger.forMethod('handleRepositoriesList');
	methodLogger.debug('Listing Bitbucket repositories...', options);

	try {
		// Get workspace slug from options or default
		let workspaceSlug = options.workspaceSlug;
		if (!workspaceSlug) {
			methodLogger.debug(
				'No workspace slug provided, using default workspace',
			);
			const defaultWorkspace = await getDefaultWorkspace();

			if (!defaultWorkspace) {
				throw new Error(
					'No workspace slug provided and no default workspace could be determined. Please provide a workspace slug or configure a default workspace.',
				);
			}

			workspaceSlug = defaultWorkspace;
			methodLogger.debug(`Using default workspace: ${workspaceSlug}`);
		}

		// Create defaults object with proper typing
		const defaults: Partial<ListRepositoriesToolArgsType> = {
			limit: DEFAULT_PAGE_SIZE,
			sort: '-updated_on',
		};

		// Apply defaults
		const mergedOptions = applyDefaults<ListRepositoriesToolArgsType>(
			{ ...options, workspaceSlug },
			defaults,
		);

		// Format the query for Bitbucket API if provided
		// Combine query and projectKey if both are present
		const queryParts: string[] = [];
		if (mergedOptions.query) {
			// Assuming formatBitbucketQuery handles basic name/description search
			queryParts.push(formatBitbucketQuery(mergedOptions.query));
		}
		if (mergedOptions.projectKey) {
			queryParts.push(`project.key = "${mergedOptions.projectKey}"`);
		}
		const combinedQuery = queryParts.join(' AND '); // Combine with AND
		
		if (combinedQuery) {
			controllerLogger.info(`Searching repositories with query: ${combinedQuery}`);
		}

		// Map controller options to service parameters
		const serviceParams: ListRepositoriesParams = {
			// Required workspace
			workspace: workspaceSlug,
			// Handle limit with default value
			pagelen: mergedOptions.limit,
			// Map cursor to page for page-based pagination
			page: mergedOptions.cursor
				? parseInt(mergedOptions.cursor, 10)
				: undefined,
			// Set default sort to updated_on descending if not specified
			sort: mergedOptions.sort,
			// Optional filter parameters
			...(combinedQuery && { q: combinedQuery }), // <-- Use combined query
			...(mergedOptions.role && { role: mergedOptions.role }),
		};

		methodLogger.debug('Using service parameters:', serviceParams);

		const repositoriesData =
			await atlassianRepositoriesService.list(serviceParams);
		// Log only the count of repositories returned instead of the entire response
		methodLogger.debug(
			`Retrieved ${repositoriesData.values?.length || 0} repositories`,
		);

		// Post-filter by project key if provided and Bitbucket API returned extra results
		if (mergedOptions.projectKey && repositoriesData.values) {
			const originalCount = repositoriesData.values.length;

			// Only keep repositories with exact project key match
			// NOTE: This filtering is done client-side since Bitbucket API doesn't directly support
			// filtering by project key in its query parameters. This means all repositories are first
			// fetched and then filtered locally, which may result in fewer results than expected
			// if the limit parameter is also used.
			repositoriesData.values = repositoriesData.values.filter(
				(repo) => repo.project?.key === mergedOptions.projectKey,
			);

			const filteredCount = repositoriesData.values.length;

			// Log filtering results to help with debugging
			if (filteredCount !== originalCount) {
				methodLogger.debug(
					`Post-filtered repositories by projectKey=${mergedOptions.projectKey}: ${filteredCount} of ${originalCount} matched.`,
				);

				// Adjust the size to reflect the actual filtered count (matters for pagination)
				if (repositoriesData.size) {
					// Adjust total size proportionally based on how many were filtered out
					const filterRatio = filteredCount / originalCount;
					const estimatedTotalSize = Math.ceil(
						repositoriesData.size * filterRatio,
					);
					repositoriesData.size = Math.max(
						filteredCount,
						estimatedTotalSize,
					);

					methodLogger.debug(
						`Adjusted size from ${repositoriesData.size} to ${estimatedTotalSize} based on filtering ratio`,
					);
				}

				// If this is the first page and we have fewer results than requested, try to fetch more
				if (
					filteredCount <
						(serviceParams.pagelen || DEFAULT_PAGE_SIZE) &&
					repositoriesData.next
				) {
					methodLogger.debug(
						`After filtering, only ${filteredCount} items remain. Fetching more pages to supplement...`,
					);

					// Keep fetching next pages until we have enough items or no more pages
					let nextPageUrl: string | undefined = repositoriesData.next;
					let totalItemsNeeded =
						(serviceParams.pagelen || DEFAULT_PAGE_SIZE) -
						filteredCount;

					while (nextPageUrl && totalItemsNeeded > 0) {
						try {
							// Extract the next page number
							let nextPage: number | undefined;
							try {
								const nextUrl = new URL(nextPageUrl);
								const pageParam =
									nextUrl.searchParams.get('page');
								if (pageParam) {
									nextPage = parseInt(pageParam, 10);
								}
							} catch (e) {
								methodLogger.warn(
									`Could not extract next page from URL: ${nextPageUrl}`,
									e,
								);
								break;
							}

							if (!nextPage) break;

							// Fetch the next page
							const nextPageParams = {
								...serviceParams,
								page: nextPage,
							};

							const nextPageData =
								await atlassianRepositoriesService.list(
									nextPageParams,
								);

							// Filter the next page results
							if (nextPageData.values) {
								const nextPageFiltered =
									nextPageData.values.filter(
										(repo) =>
											repo.project?.key ===
											mergedOptions.projectKey,
									);

								// Add items to reach the requested limit
								const itemsToAdd = nextPageFiltered.slice(
									0,
									totalItemsNeeded,
								);

								if (itemsToAdd.length > 0) {
									repositoriesData.values = [
										...repositoriesData.values,
										...itemsToAdd,
									];

									totalItemsNeeded -= itemsToAdd.length;

									methodLogger.debug(
										`Added ${itemsToAdd.length} items from page ${nextPage} to reach requested limit. ${totalItemsNeeded} more needed.`,
									);
								}

								// Update next page URL for the loop
								nextPageUrl = nextPageData.next || undefined;

								// If we've fetched all filtered items from this page but there are more pages
								// and we still need more items, continue to the next page
								if (
									nextPageFiltered.length <=
										itemsToAdd.length &&
									totalItemsNeeded > 0
								) {
									continue;
								}

								// If we got all the items we need, update pagination accordingly
								if (totalItemsNeeded <= 0) {
									// We have enough items now, but there are more available
									if (nextPageData.next) {
										repositoriesData.next =
											nextPageData.next;
									}
									break;
								}
							} else {
								// No values in the response, stop fetching
								nextPageUrl = undefined;
							}
						} catch (fetchError) {
							// Log the error but continue with what we have
							methodLogger.warn(
								`Error fetching page to supplement filtered results:`,
								fetchError,
							);
							break;
						}
					}
				}
			}
		}

		// Extract pagination information using the utility
		const pagination = extractPaginationInfo(
			repositoriesData,
			PaginationType.PAGE,
		);

		// Format the repositories data for display using the formatter
		const formattedRepositories = formatRepositoriesList(repositoriesData);

		// Create the final content by combining the formatted repositories with pagination information
		let finalContent = formattedRepositories;

		// Add pagination information if available
		if (
			pagination &&
			(pagination.hasMore || pagination.count !== undefined)
		) {
			const paginationString = formatPagination(pagination);
			finalContent += '\n\n' + paginationString;
		}

		return {
			content: finalContent,
		};
	} catch (error) {
		// Use the standardized error handler
		throw handleControllerError(error, {
			entityType: 'Repositories',
			operation: 'listing',
			source: 'controllers/atlassian.repositories.list.controller.ts@handleRepositoriesList',
			additionalInfo: { options },
		});
	}
}
