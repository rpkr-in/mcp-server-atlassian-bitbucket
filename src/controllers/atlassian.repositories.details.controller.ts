import atlassianRepositoriesService from '../services/vendor.atlassian.repositories.service.js';
import atlassianPullRequestsService from '../services/vendor.atlassian.pullrequests.service.js';
import { Logger } from '../utils/logger.util.js';
import { handleControllerError } from '../utils/error-handler.util.js';
import { ControllerResponse } from '../types/common.types.js';
import { GetRepositoryToolArgsType } from '../tools/atlassian.repositories.types.js';
import { formatRepositoryDetails } from './atlassian.repositories.formatter.js';
import { getDefaultWorkspace } from '../utils/workspace.util.js';

// Logger instance for this module
const logger = Logger.forContext(
	'controllers/atlassian.repositories.details.controller.ts',
);

/**
 * Get details of a specific repository
 *
 * @param params - Parameters containing workspaceSlug and repoSlug
 * @returns Promise with formatted repository details content
 */
export async function handleRepositoryDetails(
	params: GetRepositoryToolArgsType,
): Promise<ControllerResponse> {
	const methodLogger = logger.forMethod('handleRepositoryDetails');

	try {
		methodLogger.debug('Getting repository details', params);

		// Handle optional workspaceSlug
		if (!params.workspaceSlug) {
			methodLogger.debug(
				'No workspace provided, fetching default workspace',
			);
			const defaultWorkspace = await getDefaultWorkspace();
			if (!defaultWorkspace) {
				throw new Error(
					'No default workspace found. Please provide a workspace slug.',
				);
			}
			params.workspaceSlug = defaultWorkspace;
			methodLogger.debug(`Using default workspace: ${defaultWorkspace}`);
		}

		// Call the service to get repository details
		const repoData = await atlassianRepositoriesService.get({
			workspace: params.workspaceSlug,
			repo_slug: params.repoSlug,
		});

		// Fetch recent pull requests for this repository (most recently updated, limit to 5)
		let pullRequestsData = null;
		try {
			methodLogger.debug(
				'Fetching recent pull requests for the repository',
			);
			pullRequestsData = await atlassianPullRequestsService.list({
				workspace: params.workspaceSlug,
				repo_slug: params.repoSlug,
				state: 'OPEN', // Focus on open PRs
				sort: '-updated_on', // Sort by most recently updated
				pagelen: 5, // Limit to 5 to keep the response concise
			});
			methodLogger.debug(
				`Retrieved ${pullRequestsData.values?.length || 0} recent pull requests`,
			);
		} catch (error) {
			// Log the error but continue - this is an enhancement, not critical
			methodLogger.warn(
				'Failed to fetch recent pull requests, continuing without them',
				error,
			);
			// Do not fail the entire operation if pull requests cannot be fetched
		}

		// Format the repository data with optional pull requests
		const content = formatRepositoryDetails(repoData, pullRequestsData);

		return { content };
	} catch (error) {
		throw handleControllerError(error, {
			entityType: 'Repository',
			operation: 'get',
			source: 'controllers/atlassian.repositories.details.controller.ts@handleRepositoryDetails',
			additionalInfo: params,
		});
	}
}
