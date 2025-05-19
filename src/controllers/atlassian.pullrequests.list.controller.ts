import { ControllerResponse } from '../types/common.types.js';
import { ListPullRequestsParams } from '../services/vendor.atlassian.pullrequests.types.js';
import { ListPullRequestsToolArgsType } from '../tools/atlassian.pullrequests.types.js';
import {
	atlassianPullRequestsService,
	Logger,
	handleControllerError,
	extractPaginationInfo,
	PaginationType,
	formatPagination,
	formatPullRequestsList,
	DEFAULT_PAGE_SIZE,
	applyDefaults,
	getDefaultWorkspace,
} from './atlassian.pullrequests.base.controller.js';

/**
 * List Bitbucket pull requests with optional filtering options
 * @param options - Options for listing pull requests including workspace slug and repo slug
 * @returns Promise with formatted pull requests list content and pagination information
 */
async function list(
	options: ListPullRequestsToolArgsType,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.pullrequests.list.controller.ts',
		'list',
	);

	try {
		// Create defaults object with proper typing
		const defaults: Partial<ListPullRequestsToolArgsType> = {
			limit: DEFAULT_PAGE_SIZE,
		};

		// Apply defaults
		const mergedOptions = applyDefaults<ListPullRequestsToolArgsType>(
			options,
			defaults,
		);

		// Handle optional workspaceSlug - get default if not provided
		if (!mergedOptions.workspaceSlug) {
			methodLogger.debug(
				'No workspace provided, fetching default workspace',
			);
			const defaultWorkspace = await getDefaultWorkspace();
			if (!defaultWorkspace) {
				throw new Error(
					'Could not determine a default workspace. Please provide a workspaceSlug.',
				);
			}
			mergedOptions.workspaceSlug = defaultWorkspace;
			methodLogger.debug(
				`Using default workspace: ${mergedOptions.workspaceSlug}`,
			);
		}

		const { workspaceSlug, repoSlug } = mergedOptions;

		if (!workspaceSlug || !repoSlug) {
			throw new Error('Workspace slug and repository slug are required');
		}

		methodLogger.debug(
			`Listing pull requests for ${workspaceSlug}/${repoSlug}...`,
			mergedOptions,
		);

		// Format the query for Bitbucket API if provided - specifically target title/description
		const formattedQuery = mergedOptions.query
			? `(title ~ "${mergedOptions.query}" OR description ~ "${mergedOptions.query}")` // Construct specific query for PRs
			: undefined;

		// Map controller options to service parameters
		const serviceParams: ListPullRequestsParams = {
			workspace: workspaceSlug,
			repo_slug: repoSlug,
			pagelen: mergedOptions.limit,
			page: mergedOptions.cursor
				? parseInt(mergedOptions.cursor, 10)
				: undefined,
			state: mergedOptions.state,
			sort: '-updated_on', // Sort by most recently updated first
			...(formattedQuery && { q: formattedQuery }),
		};

		methodLogger.debug('Using service parameters:', serviceParams);

		const pullRequestsData =
			await atlassianPullRequestsService.list(serviceParams);

		methodLogger.debug(
			`Retrieved ${pullRequestsData.values?.length || 0} pull requests`,
		);

		// Extract pagination information using the utility
		const pagination = extractPaginationInfo(
			pullRequestsData,
			PaginationType.PAGE,
		);

		// Format the pull requests data for display using the formatter
		const formattedPullRequests = formatPullRequestsList(pullRequestsData);

		// Create the final content by combining the formatted pull requests with pagination information
		let finalContent = formattedPullRequests;

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
			entityType: 'Pull Requests',
			operation: 'listing',
			source: 'controllers/atlassian.pullrequests.list.controller.ts@list',
			additionalInfo: { options },
		});
	}
}

// Export the controller functions
export default { list };
