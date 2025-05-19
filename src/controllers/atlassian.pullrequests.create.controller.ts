import { ControllerResponse } from '../types/common.types.js';
import { CreatePullRequestParams } from '../services/vendor.atlassian.pullrequests.types.js';
import { CreatePullRequestToolArgsType } from '../tools/atlassian.pullrequests.types.js';
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
 * Create a new pull request in Bitbucket
 * @param options - Options including workspace slug, repo slug, source branch, target branch, title, etc.
 * @returns Promise with formatted pull request details as Markdown content
 */
async function add(
	options: CreatePullRequestToolArgsType,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.pullrequests.create.controller.ts',
		'add',
	);

	try {
		// Apply defaults if needed (none for this operation)
		const mergedOptions = applyDefaults<CreatePullRequestToolArgsType>(
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

		const {
			workspaceSlug,
			repoSlug,
			title,
			sourceBranch,
			destinationBranch,
			description,
			closeSourceBranch,
		} = mergedOptions;

		// Validate required parameters
		if (
			!workspaceSlug ||
			!repoSlug ||
			!title ||
			!sourceBranch ||
			!destinationBranch
		) {
			throw new Error(
				'Workspace slug, repository slug, title, source branch, and destination branch are required',
			);
		}

		methodLogger.debug(
			`Creating PR in ${workspaceSlug}/${repoSlug} from ${sourceBranch} to ${destinationBranch}`,
			{
				title,
				descriptionLength: description?.length,
				closeSourceBranch,
			},
		);

		// Process description - optimize Markdown if provided
		const optimizedDescription = description
			? optimizeBitbucketMarkdown(description)
			: undefined;

		// Map controller options to service parameters
		const serviceParams: CreatePullRequestParams = {
			workspace: workspaceSlug,
			repo_slug: repoSlug,
			title,
			source: {
				branch: {
					name: sourceBranch,
				},
			},
			destination: {
				branch: {
					name: destinationBranch,
				},
			},
			description: optimizedDescription,
			close_source_branch: closeSourceBranch,
		};

		// Create the pull request through the service
		const pullRequestResult =
			await atlassianPullRequestsService.create(serviceParams);

		methodLogger.debug('Pull request created successfully', {
			id: pullRequestResult.id,
			title: pullRequestResult.title,
			sourceBranch,
			destinationBranch,
		});

		// Format the pull request details using the formatter
		const formattedContent = formatPullRequestDetails(pullRequestResult);

		// Return formatted content with success message
		return {
			content: `## Pull Request Created Successfully\n\n${formattedContent}`,
		};
	} catch (error) {
		// Use the standardized error handler
		throw handleControllerError(error, {
			entityType: 'Pull Request',
			operation: 'creating',
			source: 'controllers/atlassian.pullrequests.create.controller.ts@add',
			additionalInfo: { options },
		});
	}
}

// Export the controller functions
export default { add };
