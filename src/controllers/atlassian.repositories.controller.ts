import { Logger } from '../utils/logger.util.js';
import { ControllerResponse } from '../types/common.types.js';
import {
	ListRepositoriesToolArgsType,
	GetRepositoryToolArgsType,
	GetCommitHistoryToolArgsType,
	CreateBranchToolArgsType,
	CloneRepositoryToolArgsType,
	ListBranchesToolArgsType,
} from '../tools/atlassian.repositories.types.js';

// Import handlers from specialized controllers
import { handleRepositoriesList } from './atlassian.repositories.list.controller.js';
import { handleRepositoryDetails } from './atlassian.repositories.details.controller.js';
import { handleCommitHistory } from './atlassian.repositories.commit.controller.js';
import {
	handleCreateBranch,
	handleListBranches,
} from './atlassian.repositories.branch.controller.js';
import {
	handleCloneRepository,
	handleGetFileContent,
} from './atlassian.repositories.content.controller.js';

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
 * Lists repositories for a specific workspace with pagination and filtering options.
 * Delegates to the specialized list controller.
 *
 * @param options - Options for listing repositories including workspaceSlug
 * @returns Formatted list of repositories with pagination information
 */
async function list(
	options: ListRepositoriesToolArgsType,
): Promise<ControllerResponse> {
	return handleRepositoriesList(options);
}

/**
 * Get details of a specific repository.
 * Delegates to the specialized details controller.
 *
 * @param params - Parameters containing workspaceSlug and repoSlug
 * @returns Promise with formatted repository details content
 */
async function get(
	params: GetRepositoryToolArgsType,
): Promise<ControllerResponse> {
	return handleRepositoryDetails(params);
}

/**
 * Get commit history for a repository.
 * Delegates to the specialized commit controller.
 *
 * @param options - Options containing repository identifiers and filters
 * @returns Promise with formatted commit history content and pagination info
 */
async function getCommitHistory(
	options: GetCommitHistoryToolArgsType,
): Promise<ControllerResponse> {
	return handleCommitHistory(options);
}

/**
 * Creates a new branch in a repository.
 * Delegates to the specialized branch controller.
 *
 * @param options Options including workspace, repo, new branch name, and source target.
 * @returns Confirmation message.
 */
async function createBranch(
	options: CreateBranchToolArgsType,
): Promise<ControllerResponse> {
	return handleCreateBranch(options);
}

/**
 * Clones a Bitbucket repository to the local filesystem.
 * Delegates to the specialized content controller.
 *
 * @param options Options including repository identifiers and target path
 * @returns Information about the cloned repository
 */
async function cloneRepository(
	options: CloneRepositoryToolArgsType,
): Promise<ControllerResponse> {
	return handleCloneRepository(options);
}

/**
 * Retrieves file content from a repository.
 * Delegates to the specialized content controller.
 *
 * @param options Options including repository identifiers and file path
 * @returns The file content as text
 */
async function getFileContent(options: {
	workspaceSlug: string;
	repoSlug: string;
	path: string;
	ref?: string;
}): Promise<ControllerResponse> {
	return handleGetFileContent(options);
}

/**
 * Lists branches in a repository with optional filtering.
 * Delegates to the specialized branch controller.
 *
 * @param options - Options containing workspaceSlug, repoSlug, and filters
 * @returns Formatted list of branches and pagination information
 */
async function listBranches(
	options: ListBranchesToolArgsType,
): Promise<ControllerResponse> {
	return handleListBranches(options);
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
