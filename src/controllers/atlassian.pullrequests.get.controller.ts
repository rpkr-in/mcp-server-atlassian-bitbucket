import { ControllerResponse } from '../types/common.types.js';
import { GetPullRequestParams } from '../services/vendor.atlassian.pullrequests.types.js';
import { GetPullRequestToolArgsType } from '../tools/atlassian.pullrequests.types.js';
import {
	atlassianPullRequestsService,
	Logger,
	handleControllerError,
	formatPullRequestDetails,
	applyDefaults,
	getDefaultWorkspace,
} from './atlassian.pullrequests.base.controller.js';

/**
 * Get detailed information about a specific Bitbucket pull request
 * @param options - Options including workspace slug, repo slug, and pull request ID
 * @returns Promise with formatted pull request details as Markdown content
 */
async function get(
	options: GetPullRequestToolArgsType,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.pullrequests.get.controller.ts',
		'get',
	);

	try {
		// Apply default values if needed
		const mergedOptions = applyDefaults<GetPullRequestToolArgsType>(
			options,
			{}, // No defaults required for this operation
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

		const { workspaceSlug, repoSlug, prId } = mergedOptions;

		// Validate required parameters
		if (!workspaceSlug || !repoSlug || !prId) {
			throw new Error(
				'Workspace slug, repository slug, and pull request ID are required',
			);
		}

		methodLogger.debug(
			`Getting pull request details for ${workspaceSlug}/${repoSlug}/${prId}`,
		);

		// Map controller options to service parameters
		const serviceParams: GetPullRequestParams = {
			workspace: workspaceSlug,
			repo_slug: repoSlug,
			pull_request_id: parseInt(prId, 10),
		};

		// Get PR details from the service
		const pullRequestData =
			await atlassianPullRequestsService.get(serviceParams);

		methodLogger.debug('Retrieved pull request details', {
			id: pullRequestData.id,
			title: pullRequestData.title,
			state: pullRequestData.state,
		});

		// Format the pull request details using the formatter
		const formattedContent = formatPullRequestDetails(pullRequestData);

		return {
			content: formattedContent,
		};
	} catch (error) {
		// Use the standardized error handler
		throw handleControllerError(error, {
			entityType: 'Pull Request',
			operation: 'retrieving details',
			source: 'controllers/atlassian.pullrequests.get.controller.ts@get',
			additionalInfo: { options },
		});
	}
}

// Export the controller functions
export default { get };
