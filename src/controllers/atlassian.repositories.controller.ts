import atlassianRepositoriesService from '../services/vendor.atlassian.repositories.service.js';
import atlassianPullRequestsService from '../services/vendor.atlassian.pullrequests.service.js';
import { Logger } from '../utils/logger.util.js';
import {
	handleControllerError,
	buildErrorContext,
} from '../utils/error-handler.util.js';
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
	ListCommitsParams,
	BranchRef,
	CreateBranchParams,
} from '../services/vendor.atlassian.repositories.types.js';
import { formatBitbucketQuery } from '../utils/query.util.js';
import { DEFAULT_PAGE_SIZE, applyDefaults } from '../utils/defaults.util.js';
import { executeShellCommand } from '../utils/shell.util.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import { PullRequestsResponse } from '../services/vendor.atlassian.pullrequests.types.js';

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

		// Post-filter by project key if provided and Bitbucket API returned extra results
		if (mergedOptions.projectKey && repositoriesData.values) {
			const originalCount = repositoriesData.values.length;

			// Only keep repositories with exact project key match
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
					!serviceParams.page &&
					filteredCount <
						(serviceParams.pagelen || DEFAULT_PAGE_SIZE) &&
					repositoriesData.next
				) {
					methodLogger.debug(
						`After filtering, only ${filteredCount} items remain. Fetching next page to supplement...`,
					);

					try {
						// Extract the next page number
						let nextPage = 2; // Default to page 2
						try {
							const nextUrl = new URL(repositoriesData.next);
							const pageParam = nextUrl.searchParams.get('page');
							if (pageParam) {
								nextPage = parseInt(pageParam, 10);
							}
						} catch (e) {
							methodLogger.warn(
								`Could not extract next page from URL: ${repositoriesData.next}`,
								e,
							);
						}

						// Fetch the next page
						const nextPageParams = {
							...serviceParams,
							page: nextPage,
						};

						const nextPageData =
							await atlassianRepositoriesService.list(
								nextPageParams,
							);

						// Filter the next page results too
						if (nextPageData.values) {
							const nextPageFiltered = nextPageData.values.filter(
								(repo) =>
									repo.project?.key ===
									mergedOptions.projectKey,
							);

							// Add enough items to reach the requested limit
							const itemsNeeded =
								(serviceParams.pagelen || DEFAULT_PAGE_SIZE) -
								filteredCount;
							const itemsToAdd = nextPageFiltered.slice(
								0,
								itemsNeeded,
							);

							if (itemsToAdd.length > 0) {
								repositoriesData.values = [
									...repositoriesData.values,
									...itemsToAdd,
								];
								methodLogger.debug(
									`Added ${itemsToAdd.length} items from the next page to reach requested limit`,
								);
							}

							// Update pagination info if we still have more results
							if (nextPageFiltered.length > itemsToAdd.length) {
								// Keep the next URL as is (no need to reassign)
							} else if (nextPageData.next) {
								repositoriesData.next = nextPageData.next; // Use the next page's next URL
							} else {
								repositoriesData.next = undefined; // No more results
							}
						}
					} catch (fetchError) {
						// Just log the error but continue with the current results
						methodLogger.warn(
							`Error fetching next page to supplement filtered results:`,
							fetchError,
						);
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
 * Get detailed information about a specific Bitbucket repository
 * @param identifier The repository identifier (workspace slug and repo slug)
 * @returns Formatted repository details with recent pull requests
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
		`Getting repository details for ${workspaceSlug}/${repoSlug}`,
	);

	try {
		const repositoryData = await atlassianRepositoriesService.get({
			workspace: workspaceSlug,
			repo_slug: repoSlug,
		});

		methodLogger.debug(`Retrieved repository data`, {
			name: repositoryData.name,
			created_on: repositoryData.created_on,
			updated_on: repositoryData.updated_on,
		});

		// Fetch recent pull requests for the repository (if available)
		let recentPullRequests: PullRequestsResponse = {
			pagelen: 0,
			size: 0,
			page: 1,
			values: [],
		};

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
		throw handleControllerError(
			error,
			buildErrorContext(
				'Repository',
				'retrieving',
				'controllers/atlassian.repositories.controller.ts@get',
				{ workspaceSlug, repoSlug },
			),
		);
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

		// 2. Prefer SSH clone URL for environments with configured SSH keys; fallback to HTTPS if SSH is unavailable
		let cloneUrl: string | undefined;
		if (repoDetails.links?.clone) {
			const sshLink = repoDetails.links.clone.find(
				(link) => link.name === 'ssh',
			);
			const httpsLink = repoDetails.links.clone.find(
				(link) => link.name === 'https',
			);

			if (sshLink) {
				cloneUrl = sshLink.href;
				methodLogger.info(`Using SSH clone URL: ${cloneUrl}`);
			} else if (httpsLink) {
				cloneUrl = httpsLink.href;
				methodLogger.info(
					`SSH clone URL not found. Falling back to HTTPS: ${cloneUrl}`,
				);
			}
		}

		if (!cloneUrl) {
			throw new Error(
				`Could not determine clone URL for ${workspaceSlug}/${repoSlug}`,
			);
		}
		methodLogger.info(`Resolved clone URL: ${cloneUrl}`);

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

			try {
				// Check if parent directory exists first
				try {
					await fs.access(path.dirname(parentDir));
				} catch (accessError: unknown) {
					// If the check fails, provide a detailed error
					const errorMessage =
						accessError instanceof Error
							? accessError.message
							: String(accessError);

					throw new Error(
						`Cannot access parent directory of '${parentDir}'. Either the directory doesn't exist or you don't have permissions to access it. Error: ${errorMessage}`,
					);
				}

				// Ensure the parent directory exists
				try {
					await fs.mkdir(parentDir, { recursive: true });
				} catch (mkdirError: unknown) {
					// Provide a detailed error message for directory creation failures
					const errorMessage =
						mkdirError instanceof Error
							? mkdirError.message
							: String(mkdirError);

					throw new Error(
						`Failed to create directory '${parentDir}'. This may be due to permission issues or the parent directory doesn't exist. Error: ${errorMessage}`,
					);
				}

				// The final path where the repo will be cloned (e.g., /path/to/targetPath/repoSlug)
				const cloneDestination = path.join(parentDir, repoDirName);

				// Verify the target directory can be created
				try {
					// Test if we can write to the parent directory by creating and removing a temporary file
					const testFile = path.join(
						parentDir,
						'.write-test-' + Date.now(),
					);
					await fs.writeFile(testFile, '');
					await fs.unlink(testFile);
				} catch (writeError: unknown) {
					const errorMessage =
						writeError instanceof Error
							? writeError.message
							: String(writeError);

					throw new Error(
						`Cannot write to directory '${parentDir}'. You may not have write permissions. Error: ${errorMessage}`,
					);
				}

				// Quote if it contains spaces, though path.resolve and path.join usually handle this well
				// for command execution, explicit quoting is safer for the final string.
				const safeCloneDestination = cloneDestination.includes(' ')
					? `"${cloneDestination}"`
					: cloneDestination;

				command = `git clone ${cloneUrl} ${safeCloneDestination}`;
				operationDescSuffix = `to ${cloneDestination}`;

				// Continue with the rest of the function...
			} catch (pathError) {
				throw handleControllerError(pathError, {
					entityType: 'Path',
					operation: 'resolving',
					source: 'controllers/atlassian.repositories.controller.ts@cloneRepository',
					additionalInfo: { options },
				});
			}
		}

		// Execute the command
		methodLogger.debug(`Executing command: ${command}`);
		const result = await executeShellCommand(
			command,
			operationDescSuffix || 'cloning repository',
		);

		methodLogger.debug(`Command executed successfully`, {
			result,
			operationDescSuffix,
			finalTargetPathForMessage,
		});

		// Format a success message
		const successMessage = `Successfully cloned repository ${workspaceSlug}/${repoSlug} to ${finalTargetPathForMessage}.`;

		return {
			content: successMessage,
		};
	} catch (error) {
		throw handleControllerError(error, {
			entityType: 'Repository',
			operation: 'cloning',
			source: 'controllers/atlassian.repositories.controller.ts@cloneRepository',
			additionalInfo: { options },
		});
	}
}

/**
 * Get file content from a repository.
 * Stub implementation for backward compatibility.
 */
async function getFileContent(options: {
	workspaceSlug: string;
	repoSlug: string;
	path: string;
	ref?: string;
}): Promise<ControllerResponse> {
	console.log('getFileContent called with:', options); // Use options to prevent unused variable warning
	throw new Error('Method getFileContent is not implemented');
}

/**
 * List branches in a repository.
 * Stub implementation for backward compatibility.
 */
async function listBranches(options: {
	workspaceSlug: string;
	repoSlug: string;
	query?: string;
	sort?: string;
	limit?: number;
	cursor?: string;
}): Promise<ControllerResponse> {
	console.log('listBranches called with:', options); // Use options to prevent unused variable warning
	throw new Error('Method listBranches is not implemented');
}

export default {
	list,
	get,
	getCommitHistory,
	createBranch,
	cloneRepository,
	getFileContent,
	listBranches,
};
