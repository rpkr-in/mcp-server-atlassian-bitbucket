import { ControllerResponse } from '../types/common.types.js';
import { ApprovePullRequestParams } from '../services/vendor.atlassian.pullrequests.types.js';
import { ApprovePullRequestToolArgsType } from '../tools/atlassian.pullrequests.types.js';
import {
	atlassianPullRequestsService,
	Logger,
	handleControllerError,
	applyDefaults,
	getDefaultWorkspace,
} from './atlassian.pullrequests.base.controller.js';

/**
 * Approve a pull request in Bitbucket
 * @param options - Options including workspace slug, repo slug, and pull request ID
 * @returns Promise with formatted approval confirmation as Markdown content
 */
async function approve(
	options: ApprovePullRequestToolArgsType,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.pullrequests.approve.controller.ts',
		'approve',
	);

	try {
		// Apply defaults if needed (none for this operation)
		const mergedOptions = applyDefaults<ApprovePullRequestToolArgsType>(
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
			`Approving pull request ${mergedOptions.pullRequestId} in ${mergedOptions.workspaceSlug}/${mergedOptions.repoSlug}`,
		);

		// Prepare service parameters
		const serviceParams: ApprovePullRequestParams = {
			workspace: mergedOptions.workspaceSlug,
			repo_slug: mergedOptions.repoSlug,
			pull_request_id: mergedOptions.pullRequestId,
		};

		// Call service to approve the pull request
		const participant = await atlassianPullRequestsService.approve(
			serviceParams,
		);

		methodLogger.debug(
			`Successfully approved pull request ${mergedOptions.pullRequestId}`,
		);

		// Format the response
		const content = `# Pull Request Approved ✅

**Pull Request ID:** ${mergedOptions.pullRequestId}
**Repository:** \`${mergedOptions.workspaceSlug}/${mergedOptions.repoSlug}\`
**Approved by:** ${participant.user.display_name || participant.user.nickname || 'Unknown User'}
**Status:** ${participant.state}
**Participated on:** ${new Date(participant.participated_on).toLocaleString()}

The pull request has been successfully approved and is now ready for merge (pending any other required approvals or checks).`;

		return {
			content: content,
		};
	} catch (error) {
		throw handleControllerError(error, {
			entityType: 'Pull Request',
			operation: 'approving',
			source: 'controllers/atlassian.pullrequests.approve.controller.ts@approve',
			additionalInfo: { options },
		});
	}
}

export default { approve };