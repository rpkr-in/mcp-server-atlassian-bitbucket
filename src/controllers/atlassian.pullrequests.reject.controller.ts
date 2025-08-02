import { ControllerResponse } from '../types/common.types.js';
import { RejectPullRequestParams } from '../services/vendor.atlassian.pullrequests.types.js';
import { RejectPullRequestToolArgsType } from '../tools/atlassian.pullrequests.types.js';
import {
	atlassianPullRequestsService,
	Logger,
	handleControllerError,
	applyDefaults,
	getDefaultWorkspace,
} from './atlassian.pullrequests.base.controller.js';

/**
 * Request changes on a pull request in Bitbucket
 * @param options - Options including workspace slug, repo slug, and pull request ID
 * @returns Promise with formatted rejection confirmation as Markdown content
 */
async function reject(
	options: RejectPullRequestToolArgsType,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.pullrequests.reject.controller.ts',
		'reject',
	);

	try {
		// Apply defaults if needed (none for this operation)
		const mergedOptions = applyDefaults<RejectPullRequestToolArgsType>(
			options,
			{},
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

		methodLogger.debug(
			`Requesting changes on pull request ${mergedOptions.pullRequestId} in ${mergedOptions.workspaceSlug}/${mergedOptions.repoSlug}`,
		);

		// Prepare service parameters
		const serviceParams: RejectPullRequestParams = {
			workspace: mergedOptions.workspaceSlug,
			repo_slug: mergedOptions.repoSlug,
			pull_request_id: mergedOptions.pullRequestId,
		};

		// Call service to request changes on the pull request
		const participant =
			await atlassianPullRequestsService.reject(serviceParams);

		methodLogger.debug(
			`Successfully requested changes on pull request ${mergedOptions.pullRequestId}`,
		);

		// Format the response
		const content = `# Changes Requested 🔄

**Pull Request ID:** ${mergedOptions.pullRequestId}
**Repository:** \`${mergedOptions.workspaceSlug}/${mergedOptions.repoSlug}\`
**Requested by:** ${participant.user.display_name || participant.user.nickname || 'Unknown User'}
**Status:** ${participant.state}
**Participated on:** ${new Date(participant.participated_on).toLocaleString()}

Changes have been requested on this pull request. The author should address the feedback before the pull request can be merged.`;

		return {
			content: content,
		};
	} catch (error) {
		throw handleControllerError(error, {
			entityType: 'Pull Request',
			operation: 'requesting changes on',
			source: 'controllers/atlassian.pullrequests.reject.controller.ts@reject',
			additionalInfo: { options },
		});
	}
}

export default { reject };
