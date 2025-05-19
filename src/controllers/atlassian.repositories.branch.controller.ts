import atlassianRepositoriesService from '../services/vendor.atlassian.repositories.service.js';
import { Logger } from '../utils/logger.util.js';
import { handleControllerError } from '../utils/error-handler.util.js';
import { DEFAULT_PAGE_SIZE, applyDefaults } from '../utils/defaults.util.js';
import {
	extractPaginationInfo,
	PaginationType,
} from '../utils/pagination.util.js';
import { formatPagination } from '../utils/formatter.util.js';
import { ControllerResponse } from '../types/common.types.js';
import {
	CreateBranchToolArgsType,
	ListBranchesToolArgsType,
} from '../tools/atlassian.repositories.types.js';
import { CreateBranchParams } from '../services/vendor.atlassian.repositories.types.js';
import { getDefaultWorkspace } from '../utils/workspace.util.js';

// Logger instance for this module
const logger = Logger.forContext(
	'controllers/atlassian.repositories.branch.controller.ts',
);

/**
 * Creates a new branch in a repository.
 * @param options Options including workspace, repo, new branch name, and source target.
 * @returns Confirmation message.
 */
export async function handleCreateBranch(
	options: CreateBranchToolArgsType,
): Promise<ControllerResponse> {
	const { repoSlug, newBranchName, sourceBranchOrCommit } = options;
	let { workspaceSlug } = options;
	const methodLogger = logger.forMethod('handleCreateBranch');

	try {
		methodLogger.debug('Creating new branch with options:', options);

		// Handle optional workspaceSlug
		if (!workspaceSlug) {
			methodLogger.debug(
				'No workspace provided, fetching default workspace',
			);
			const defaultWorkspace = await getDefaultWorkspace();
			if (!defaultWorkspace) {
				throw new Error(
					'No default workspace found. Please provide a workspace slug.',
				);
			}
			workspaceSlug = defaultWorkspace;
			methodLogger.debug(`Using default workspace: ${defaultWorkspace}`);
		}

		if (!repoSlug) {
			throw new Error('Repository slug is required');
		}

		if (!newBranchName) {
			throw new Error('New branch name is required');
		}

		if (!sourceBranchOrCommit) {
			throw new Error(
				'Source branch or commit is required as the starting point',
			);
		}

		// First, check if branch already exists to avoid potential errors
		methodLogger.debug('Checking if branch already exists');
		try {
			// Call API to check if branch exists
			// Note: this is a simulation as the actual API might not have this specific endpoint
			// We'll make a call using the list branches endpoint with a filter
			const existingBranches =
				await atlassianRepositoriesService.listBranches({
					workspace: workspaceSlug,
					repo_slug: repoSlug,
					q: `name="${newBranchName}"`,
				});

			// If we get matching branches, assume the branch exists
			if (existingBranches.values && existingBranches.values.length > 0) {
				methodLogger.warn(
					`Branch '${newBranchName}' already exists in ${workspaceSlug}/${repoSlug}`,
				);
				return {
					content: `⚠️ Branch \`${newBranchName}\` already exists in the repository.`,
				};
			}
		} catch (error) {
			// If error is 404, branch doesn't exist and we can proceed
			if ((error as { statusCode?: number }).statusCode !== 404) {
				throw error; // Other errors should be propagated
			}
			methodLogger.debug(
				`Branch '${newBranchName}' does not exist, proceeding with creation`,
			);
		}

		// Prepare the branch creation parameters
		const createParams: CreateBranchParams = {
			workspace: workspaceSlug,
			repo_slug: repoSlug,
			name: newBranchName,
			target: {
				hash: sourceBranchOrCommit,
			},
		};

		// Create the branch
		methodLogger.debug('Creating branch with params:', createParams);
		const result =
			await atlassianRepositoriesService.createBranch(createParams);

		// Confirm success with a meaningful message
		methodLogger.debug('Branch created successfully:', result);
		return {
			content: `✅ Successfully created branch \`${newBranchName}\` from \`${sourceBranchOrCommit}\` in ${workspaceSlug}/${repoSlug}.`,
		};
	} catch (error) {
		throw handleControllerError(error, {
			entityType: 'Branch',
			operation: 'create',
			source: 'controllers/atlassian.repositories.branch.controller.ts@handleCreateBranch',
			additionalInfo: options,
		});
	}
}

/**
 * Lists branches in a repository with optional filtering
 *
 * @param options - Options containing workspaceSlug, repoSlug, and filters
 * @returns Formatted list of branches and pagination information
 */
export async function handleListBranches(
	options: ListBranchesToolArgsType,
): Promise<ControllerResponse> {
	const methodLogger = logger.forMethod('handleListBranches');
	methodLogger.debug('Listing branches with options:', options);

	try {
		// Apply defaults
		const defaults: Partial<ListBranchesToolArgsType> = {
			limit: DEFAULT_PAGE_SIZE,
			sort: 'name', // Default sort by name
		};
		const params = applyDefaults<ListBranchesToolArgsType>(
			options,
			defaults,
		);

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

		// Required parameters check
		if (!params.repoSlug) {
			throw new Error('Repository slug is required');
		}

		// Call the service to list branches
		methodLogger.debug('Listing branches with params:', {
			workspace: params.workspaceSlug,
			repo_slug: params.repoSlug,
			q: params.query ? `name ~ "${params.query}"` : undefined,
			sort: params.sort,
			pagelen: params.limit,
			page: params.cursor ? parseInt(params.cursor, 10) : undefined,
		});

		const branchesData = await atlassianRepositoriesService.listBranches({
			workspace: params.workspaceSlug,
			repo_slug: params.repoSlug,
			q: params.query ? `name ~ "${params.query}"` : undefined,
			sort: params.sort,
			pagelen: params.limit,
			page: params.cursor ? parseInt(params.cursor, 10) : undefined,
		});

		methodLogger.debug(
			`Retrieved ${branchesData.values?.length || 0} branches`,
		);

		// Extract pagination information
		const pagination = extractPaginationInfo(
			branchesData,
			PaginationType.PAGE,
		);

		// Format branches data into Markdown
		let content = '';

		if (!branchesData.values || branchesData.values.length === 0) {
			content = 'No branches found in this repository.';
		} else {
			content = `# Branches in \`${params.workspaceSlug}/${params.repoSlug}\`\n\n`;

			if (params.query) {
				content += `Filtered by query: "${params.query}"\n\n`;
			}

			branchesData.values.forEach((branch) => {
				// Using target.hash to get the commit hash this branch points to
				const commitHash =
					branch.target?.hash?.substring(0, 8) || 'N/A';
				content += `## ${branch.name}\n\n`;
				content += `- **Latest Commit**: ${commitHash}\n`;
				content += `- **Type**: ${branch.type || 'branch'}\n`;

				if (branch.default_merge_strategy) {
					content += `- **Default Merge Strategy**: ${branch.default_merge_strategy}\n`;
				}

				if (branch.merge_strategies && branch.merge_strategies.length) {
					content += `- **Available Merge Strategies**: ${branch.merge_strategies.join(
						', ',
					)}\n`;
				}

				content += '\n';
			});
		}

		// Add pagination information if available
		if (
			pagination &&
			(pagination.hasMore || pagination.count !== undefined)
		) {
			const paginationString = formatPagination(pagination);
			content += paginationString;
		}

		return { content };
	} catch (error) {
		throw handleControllerError(error, {
			entityType: 'Branches',
			operation: 'listing',
			source: 'controllers/atlassian.repositories.branch.controller.ts@handleListBranches',
			additionalInfo: options,
		});
	}
}
