import atlassianRepositoriesService from '../services/vendor.atlassian.repositories.service.js';
import atlassianPullRequestsService from '../services/vendor.atlassian.pullrequests.service.js';
import { Logger } from '../utils/logger.util.js';
import { handleControllerError } from '../utils/error-handler.util.js';
import {
	extractPaginationInfo,
	PaginationType,
} from '../utils/pagination.util.js';
import { ControllerResponse } from '../types/common.types.js';
import {
	ListRepositoriesToolArgsType,
	GetRepositoryToolArgsType,
	GetCommitHistoryToolArgsType,
	CreateBranchToolArgsType,
	CloneRepositoryToolArgsType,
} from '../tools/atlassian.repositories.types.js';
import {
	formatRepositoriesList,
	formatRepositoryDetails,
	formatCommitHistory,
} from './atlassian.repositories.formatter.js';
import {
	ListRepositoriesParams,
	GetRepositoryParams,
	ListCommitsParams,
	BranchRef,
	CreateBranchParams,
} from '../services/vendor.atlassian.repositories.types.js';
import { formatBitbucketQuery } from '../utils/query.util.js';
import { DEFAULT_PAGE_SIZE, applyDefaults } from '../utils/defaults.util.js';
import { executeShellCommand } from '../utils/shell.util.js';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Controller for managing Bitbucket repositories.
 * Provides functionality for listing repositories and retrieving repository details.
 */

// Create a contextualized logger for this file
const controllerLogger = Logger.forContext(
	'controllers/atlassian.repositories.controller.ts',
);

// Log controller initialization
controllerLogger.debug('Bitbucket repositories controller initialized');

/**
 * Lists repositories for a specific workspace with pagination and filtering options
 * @param options - Options for listing repositories including workspaceSlug
 * @returns Formatted list of repositories with pagination information
 */
async function list(
	options: ListRepositoriesToolArgsType,
): Promise<ControllerResponse> {
	const { workspaceSlug } = options;
	const methodLogger = Logger.forContext(
		'controllers/atlassian.repositories.controller.ts',
		'list',
	);

	methodLogger.debug(
		`Listing repositories for workspace: ${workspaceSlug}...`,
		options,
	);

	try {
		// Create defaults object with proper typing
		const defaults: Partial<ListRepositoriesToolArgsType> = {
			limit: DEFAULT_PAGE_SIZE,
			sort: '-updated_on',
		};

		// Apply defaults
		const mergedOptions = applyDefaults<ListRepositoriesToolArgsType>(
			options,
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

		// Extract pagination information using the utility
		const pagination = extractPaginationInfo(
			repositoriesData,
			PaginationType.PAGE,
		);

		// Format the repositories data for display using the formatter
		const formattedRepositories = formatRepositoriesList(repositoriesData);

		return {
			content: formattedRepositories,
			pagination,
		};
	} catch (error) {
		// Use the standardized error handler
		throw handleControllerError(error, {
			entityType: 'Repositories',
			operation: 'listing',
			source: 'controllers/atlassian.repositories.controller.ts@list',
			additionalInfo: { options },
		});
	}
}

/**
 * Gets details of a specific Bitbucket repository
 * @param identifier - Repository identifier containing workspaceSlug and repoSlug
 * @returns Formatted repository details
 */
async function get(
	identifier: GetRepositoryToolArgsType,
): Promise<ControllerResponse> {
	const { workspaceSlug, repoSlug } = identifier;
	const methodLogger = Logger.forContext(
		'controllers/atlassian.repositories.controller.ts',
		'get',
	);

	methodLogger.debug(
		`Getting repository details for ${workspaceSlug}/${repoSlug}...`,
	);

	try {
		// Map controller options to service parameters
		const serviceParams: GetRepositoryParams = {
			workspace: workspaceSlug,
			repo_slug: repoSlug,
		};

		methodLogger.debug('Using service parameters:', serviceParams);

		// Fetch repository data
		const repositoryData =
			await atlassianRepositoriesService.get(serviceParams);

		methodLogger.debug(`Retrieved repository: ${repositoryData.full_name}`);

		// Fetch recent pull requests to provide immediate context and activity history.
		// This enhances usability by including relevant PRs directly in repository details,
		// saving users from having to make a separate API call. While this crosses entity
		// boundaries slightly, it significantly improves the user experience by showing
		// recent activity alongside the repository's metadata.
		let recentPullRequests = null;
		try {
			// Create pull request list parameters similar to how the PR controller would
			const pullRequestsParams = {
				workspace: workspaceSlug,
				repo_slug: repoSlug,
				pagelen: DEFAULT_PAGE_SIZE, // Limit to PRs using constant
				sort: '-updated_on', // Sort by most recently updated
				// No state filter to get all PRs regardless of state
			};
			methodLogger.debug(
				'Fetching recent pull requests:',
				pullRequestsParams,
			);
			recentPullRequests =
				await atlassianPullRequestsService.list(pullRequestsParams);
			methodLogger.debug(
				`Retrieved ${recentPullRequests.values?.length || 0} recent pull requests`,
			);
		} catch (prError) {
			methodLogger.warn('Failed to fetch pull requests:', prError);
			// Continue with repository details even if PR fetch fails
		}

		// Format the repository data for display using the formatter
		const formattedRepository = formatRepositoryDetails(
			repositoryData,
			recentPullRequests,
		);

		return {
			content: formattedRepository,
		};
	} catch (error) {
		throw handleControllerError(error, {
			source: 'controllers/atlassian.repositories.controller.ts@get',
			entityType: 'Repository',
			operation: 'retrieving',
			entityId: { workspaceSlug, repoSlug },
		});
	}
}

/**
 * Retrieves the commit history for a repository.
 * @param options Options containing repository identifier and optional filtering parameters
 * @returns Formatted commit history with pagination information.
 */
async function getCommitHistory(
	options: GetCommitHistoryToolArgsType,
): Promise<ControllerResponse> {
	const { workspaceSlug, repoSlug } = options;
	const methodLogger = Logger.forContext(
		'controllers/atlassian.repositories.controller.ts',
		'getCommitHistory',
	);

	methodLogger.debug(
		`Getting commit history for ${workspaceSlug}/${repoSlug}`,
		options,
	);

	try {
		const defaults: Partial<GetCommitHistoryToolArgsType> = {
			limit: DEFAULT_PAGE_SIZE,
		};
		const mergedOptions = applyDefaults<GetCommitHistoryToolArgsType>(
			options,
			defaults,
		);

		const serviceParams: ListCommitsParams = {
			workspace: workspaceSlug,
			repo_slug: repoSlug,
			include: mergedOptions.revision,
			path: mergedOptions.path,
			pagelen: mergedOptions.limit,
			page: mergedOptions.cursor
				? parseInt(mergedOptions.cursor, 10)
				: undefined,
		};

		methodLogger.debug('Using commit service parameters:', serviceParams);

		const commitsData =
			await atlassianRepositoriesService.listCommits(serviceParams);
		methodLogger.debug(
			`Retrieved ${commitsData.values?.length || 0} commits`,
		);

		const formattedHistory = formatCommitHistory(commitsData, {
			revision: mergedOptions.revision,
			path: mergedOptions.path,
		});

		return {
			content: formattedHistory,
		};
	} catch (error) {
		throw handleControllerError(error, {
			entityType: 'Commit History',
			operation: 'retrieving',
			source: 'controllers/atlassian.repositories.controller.ts@getCommitHistory',
			additionalInfo: { options },
		});
	}
}

/**
 * Creates a new branch in a repository.
 * @param options Options including workspace, repo, new branch name, and source target.
 * @returns Confirmation message.
 */
async function createBranch(
	options: CreateBranchToolArgsType,
): Promise<ControllerResponse> {
	const { workspaceSlug, repoSlug, newBranchName, sourceBranchOrCommit } =
		options;
	const methodLogger = Logger.forContext(
		'controllers/atlassian.repositories.controller.ts',
		'createBranch',
	);

	methodLogger.debug(
		`Attempting to create branch '${newBranchName}' from '${sourceBranchOrCommit}' in ${workspaceSlug}/${repoSlug}`,
	);

	try {
		const serviceParams: CreateBranchParams = {
			workspace: workspaceSlug,
			repo_slug: repoSlug,
			name: newBranchName,
			target: {
				hash: sourceBranchOrCommit,
			},
		};

		methodLogger.debug('Calling service to create branch:', serviceParams);

		const createdBranchRef: BranchRef =
			await atlassianRepositoriesService.createBranch(serviceParams);

		methodLogger.debug('Branch created successfully:', createdBranchRef);

		// Format a simple success message
		const successMessage = `Successfully created branch \`${createdBranchRef.name}\` from target \`${sourceBranchOrCommit}\` (commit: ${createdBranchRef.target.hash.substring(0, 7)}).`;

		return {
			content: successMessage,
		};
	} catch (error) {
		throw handleControllerError(error, {
			entityType: 'Branch',
			operation: 'creating',
			source: 'controllers/atlassian.repositories.controller.ts@createBranch',
			additionalInfo: { options },
		});
	}
}

/**
 * Clones a Bitbucket repository to a specified target path.
 * @param options Options including workspaceSlug, repoSlug, and targetPath.
 * @returns Confirmation message.
 */
async function cloneRepository(
	options: CloneRepositoryToolArgsType,
): Promise<ControllerResponse> {
	const { workspaceSlug, repoSlug, targetPath } = options;
	const methodLogger = Logger.forContext(
		'controllers/atlassian.repositories.controller.ts',
		'cloneRepository',
	);

	methodLogger.debug(
		`Attempting to clone repository ${workspaceSlug}/${repoSlug} to ${targetPath}`,
		options,
	);

	try {
		// 1. Get repository details to find the clone URL
		const repoDetails = await atlassianRepositoriesService.get({
			workspace: workspaceSlug,
			repo_slug: repoSlug,
		});

		// 2. Find the SSH clone URL first, then HTTPS as a fallback
		let cloneUrl: string | undefined;
		if (repoDetails.links?.clone) {
			const sshLink = repoDetails.links.clone.find(
				(link) => link.name === 'ssh',
			);
			if (sshLink) {
				cloneUrl = sshLink.href;
				methodLogger.info(`Found SSH clone URL: ${cloneUrl}`);
			} else {
				methodLogger.warn(
					'SSH clone URL not found. Looking for HTTPS.',
				);
				const httpsLink = repoDetails.links.clone.find(
					(link) => link.name === 'https',
				);
				if (httpsLink) {
					cloneUrl = httpsLink.href;
					methodLogger.info(
						`Found HTTPS clone URL as fallback: ${cloneUrl}`,
					);
				} else if (repoDetails.links.clone.length > 0) {
					// Fallback to the first available clone link if neither SSH nor HTTPS is explicitly named
					cloneUrl = repoDetails.links.clone[0].href;
					methodLogger.warn(
						`Neither SSH nor HTTPS clone URL found by name, using first available: ${cloneUrl}`,
					);
				}
			}
		}

		if (!cloneUrl) {
			throw new Error(
				`Could not find a clone URL for repository ${workspaceSlug}/${repoSlug}.`,
			);
		}
		methodLogger.info(`Found clone URL: ${cloneUrl}`);

		// 3. Construct and execute the git clone command
		let command;
		let operationDescSuffix;
		let finalTargetPathForMessage = targetPath;

		const repoDirName = repoSlug; // The directory name for the repo itself

		if (targetPath === '.') {
			// If targetPath is '.', clone into a new directory named after the repo in the current path.
			// Git will create repoDirName in the current directory.
			command = `git clone ${cloneUrl} ${repoDirName}`;
			operationDescSuffix = `into ./${repoDirName}`;
			finalTargetPathForMessage = `./${repoDirName}`;
		} else {
			// Resolve the absolute path for the directory that will contain the cloned repo
			const parentDir = path.resolve(targetPath);
			// Ensure the parent directory exists
			await fs.mkdir(parentDir, { recursive: true });

			// The final path where the repo will be cloned (e.g., /path/to/targetPath/repoSlug)
			const cloneDestination = path.join(parentDir, repoDirName);

			// Quote if it contains spaces, though path.resolve and path.join usually handle this well
			// for command execution, explicit quoting is safer for the final string.
			const safeCloneDestination = cloneDestination.includes(' ')
				? `"${cloneDestination}"`
				: cloneDestination;

			command = `git clone ${cloneUrl} ${safeCloneDestination}`;
			operationDescSuffix = `to ${cloneDestination}`;
			finalTargetPathForMessage = cloneDestination;
		}

		const operationDesc = `clone repository ${workspaceSlug}/${repoSlug} ${operationDescSuffix}`;
		const cloneOutput = await executeShellCommand(command, operationDesc);

		const successMessage = `Successfully initiated cloning of repository ${workspaceSlug}/${repoSlug} to ${finalTargetPathForMessage}. Output: ${cloneOutput}`;
		methodLogger.info(successMessage);

		return {
			content: successMessage,
		};
	} catch (error) {
		throw handleControllerError(error, {
			entityType: 'Repository Clone',
			operation: 'cloning',
			source: 'controllers/atlassian.repositories.controller.ts@cloneRepository',
			additionalInfo: { options },
		});
	}
}

export default { list, get, getCommitHistory, createBranch, cloneRepository };
