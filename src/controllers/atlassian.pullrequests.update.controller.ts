import { ControllerResponse } from '../types/common.types.js';
import { UpdatePullRequestParams } from '../services/vendor.atlassian.pullrequests.types.js';
import { UpdatePullRequestToolArgsType } from '../tools/atlassian.pullrequests.types.js';
import {
	atlassianPullRequestsService,
	Logger,
	handleControllerError,
	formatPullRequestDetails,
	applyDefaults,
	optimizeBitbucketMarkdown,
	getDefaultWorkspace,
} from './atlassian.pullrequests.base.controller.js';

/**
 * Update an existing pull request in Bitbucket
 * @param options - Options including workspace slug, repo slug, pull request ID, title, and description
 * @returns Promise with formatted updated pull request details as Markdown content
 */
async function update(
	options: UpdatePullRequestToolArgsType,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.pullrequests.update.controller.ts',
		'update',
	);

	try {
		// Apply defaults if needed (none for this operation)
		const mergedOptions = applyDefaults<UpdatePullRequestToolArgsType>(
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

		// Validate that at least one field to update is provided
		if (!mergedOptions.title && !mergedOptions.description) {
			throw new Error(
				'At least one field to update (title or description) must be provided',
			);
		}

		methodLogger.debug(
			`Updating pull request ${mergedOptions.pullRequestId} in ${mergedOptions.workspaceSlug}/${mergedOptions.repoSlug}`,
		);

		// Prepare service parameters
		const serviceParams: UpdatePullRequestParams = {
			workspace: mergedOptions.workspaceSlug,
			repo_slug: mergedOptions.repoSlug,
			pull_request_id: mergedOptions.pullRequestId,
		};

		// Add optional fields if provided
		if (mergedOptions.title !== undefined) {
			serviceParams.title = mergedOptions.title;
		}
		if (mergedOptions.description !== undefined) {
			serviceParams.description = optimizeBitbucketMarkdown(
				mergedOptions.description,
			);
		}

		// Call service to update the pull request
		const pullRequest =
			await atlassianPullRequestsService.update(serviceParams);

		methodLogger.debug(
			`Successfully updated pull request ${pullRequest.id}`,
		);

		// Format the response
		const content = await formatPullRequestDetails(pullRequest);

		return {
			content: `## Pull Request Updated Successfully\n\n${content}`,
		};
	} catch (error) {
		throw handleControllerError(error, {
			entityType: 'Pull Request',
			operation: 'updating',
			source: 'controllers/atlassian.pullrequests.update.controller.ts@update',
			additionalInfo: { options },
		});
	}
}

export default { update };
