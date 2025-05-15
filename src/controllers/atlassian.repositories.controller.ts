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
	GetFileContentToolArgsType,
} from '../tools/atlassian.repositories.types.js';
import {
	formatRepositoriesList,
	formatRepositoryDetails,
	formatCommitHistory,
	formatBranchesList,
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
import { createApiError } from '../utils/error.util.js';
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
				finalTargetPathForMessage = cloneDestination;
			} catch (dirError) {
				methodLogger.error('Directory setup failed:', dirError);
				throw dirError; // Re-throw with our enhanced error message
			}
		}

		const operationDesc = `clone repository ${workspaceSlug}/${repoSlug} ${operationDescSuffix}`;
		const cloneOutput = await executeShellCommand(command, operationDesc);

		const successMessage = `Successfully initiated cloning of repository ${workspaceSlug}/${repoSlug} to ${finalTargetPathForMessage}. Output: ${cloneOutput}`;
		methodLogger.info(successMessage);

		return {
			content: successMessage,
		};
	} catch (error) {
		// Provide more specific guidance for common clone authentication failures
		if (
			error instanceof Error &&
			/(permission denied|access denied|fatal:.*could not read)/i.test(
				error.message,
			)
		) {
			const enhancedMessage =
				`Access denied while attempting to clone the repository. ` +
				`Ensure that the machine running the MCP server has a valid SSH key added to Bitbucket **or** that your app-password credentials are correct. ` +
				`If your environment exposes a terminal tool, try running 'git clone <clone-ssh-url>' manually to verify SSH connectivity. ` +
				`Original git error: ${error.message}`;
			throw createApiError(enhancedMessage, 403);
		}
		throw handleControllerError(error, {
			entityType: 'Repository Clone',
			operation: 'cloning',
			source: 'controllers/atlassian.repositories.controller.ts@cloneRepository',
			additionalInfo: { options },
		});
	}
}

/**
 * Gets the content of a file from a specific repository.
 * If a revision is not specified, it uses the repository's default branch.
 *
 * @param options Parameters containing repository information and file path
 * @returns Promise resolving to the file content as a string
 * @throws Will throw an error if the file cannot be retrieved
 */
async function getFileContent(
	options: GetFileContentToolArgsType,
): Promise<ControllerResponse> {
	const { workspaceSlug, repoSlug, filePath, revision } = options;
	const methodLogger = Logger.forContext(
		'controllers/atlassian.repositories.controller.ts',
		'getFileContent',
	);

	methodLogger.debug(
		`Getting file content for ${workspaceSlug}/${repoSlug}/${filePath}`,
		{ revision },
	);

	try {
		// If revision is not provided, we need to get the default branch name
		let commitRef = revision;

		if (!commitRef) {
			methodLogger.debug(
				'No revision specified, getting repository details to identify default branch',
			);

			// Get repository details to find the default branch
			const repoDetails = await atlassianRepositoriesService.get({
				workspace: workspaceSlug,
				repo_slug: repoSlug,
			});

			// Get default branch name, or use 'main' as a fallback
			commitRef = repoDetails.mainbranch?.name || 'main';
			methodLogger.debug(
				`Using default branch as commit reference: ${commitRef}`,
			);
		}

		// Request the file content using the service
		const fileContent = await atlassianRepositoriesService.getFileContent({
			workspace: workspaceSlug,
			repo_slug: repoSlug,
			commit: commitRef,
			path: filePath,
		});

		// For consistency with other controller responses, return in expected format
		return {
			content: fileContent,
			// Not paginated, no need for pagination property
		};
	} catch (error) {
		throw handleControllerError(error, {
			entityType: 'File Content',
			operation: 'retrieving',
			source: 'controllers/atlassian.repositories.controller.ts@getFileContent',
			additionalInfo: { options },
		});
	}
}

/**
 * Lists branches for a specific repository.
 * @param options Options containing workspace and repository identifiers, plus pagination and filtering options
 * @returns Formatted list of branches with pagination information
 */
async function listBranches(options: {
	workspaceSlug: string;
	repoSlug: string;
	limit?: number;
	cursor?: string;
	query?: string;
	sort?: string;
}): Promise<ControllerResponse> {
	const { workspaceSlug, repoSlug } = options;
	const methodLogger = Logger.forContext(
		'controllers/atlassian.repositories.controller.ts',
		'listBranches',
	);

	methodLogger.debug(
		`Listing branches for repository ${workspaceSlug}/${repoSlug}`,
		options,
	);

	try {
		const defaults = {
			limit: DEFAULT_PAGE_SIZE,
			sort: 'name', // Default to sorting by name
		};
		const mergedOptions = applyDefaults(options, defaults);

		// Format query parameter correctly for Bitbucket API if it's a simple string
		let formattedQuery = options.query;
		if (
			formattedQuery &&
			!formattedQuery.includes('~') &&
			!formattedQuery.includes('=')
		) {
			// If the query is a simple string without operators, assume it's a name search
			formattedQuery = `name ~ "${formattedQuery}"`;
			methodLogger.debug(
				`Reformatted simple query to: ${formattedQuery}`,
			);
		}

		// Map controller options to service parameters
		const serviceParams = {
			workspace: workspaceSlug,
			repo_slug: repoSlug,
			pagelen: mergedOptions.limit,
			page: options.cursor // Access from original options, not merged options
				? parseInt(options.cursor, 10)
				: undefined,
			q: formattedQuery, // Use the formatted query
			sort: mergedOptions.sort,
		};

		methodLogger.debug('Using service parameters:', serviceParams);

		const branchesData =
			await atlassianRepositoriesService.listBranches(serviceParams);
		methodLogger.debug(
			`Retrieved ${branchesData.values?.length || 0} branches`,
		);

		// Extract pagination information
		const pagination = extractPaginationInfo(
			branchesData,
			PaginationType.PAGE,
		);

		// Format the branches into a Markdown list
		const formattedBranches = formatBranchesList(branchesData, {
			workspaceSlug,
			repoSlug,
		});

		return {
			content: formattedBranches,
			pagination,
		};
	} catch (error) {
		throw handleControllerError(error, {
			entityType: 'Branches',
			operation: 'listing',
			source: 'controllers/atlassian.repositories.controller.ts@listBranches',
			additionalInfo: { options },
		});
	}
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
