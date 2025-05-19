import { ControllerResponse } from '../types/common.types.js';
import {
	ListPullRequestsToolArgsType,
	GetPullRequestToolArgsType,
	ListPullRequestCommentsToolArgsType,
	CreatePullRequestCommentToolArgsType,
	CreatePullRequestToolArgsType,
} from '../tools/atlassian.pullrequests.types.js';

import listController from './atlassian.pullrequests.list.controller.js';
import getController from './atlassian.pullrequests.get.controller.js';
import commentsController from './atlassian.pullrequests.comments.controller.js';
import createController from './atlassian.pullrequests.create.controller.js';

/**
 * Controller for managing Bitbucket pull requests.
 * Provides functionality for listing, retrieving, and creating pull requests and comments.
 *
 * NOTE ON MARKDOWN HANDLING:
 * Unlike Jira (which uses ADF) or Confluence (which uses a mix of formats),
 * Bitbucket Cloud API natively accepts Markdown for text content in both directions:
 * - When sending data TO the API (comments, PR descriptions)
 * - When receiving data FROM the API (PR descriptions, comments)
 *
 * The API expects content in the format: { content: { raw: "markdown-text" } }
 *
 * We use optimizeBitbucketMarkdown() to address specific rendering quirks in
 * Bitbucket's markdown renderer but it does NOT perform format conversion.
 * See formatter.util.ts for details on the specific issues it addresses.
 */

/**
 * List Bitbucket pull requests with optional filtering options
 * @param options - Options for listing pull requests including workspace slug and repo slug
 * @returns Promise with formatted pull requests list content and pagination information
 */
async function list(
	options: ListPullRequestsToolArgsType,
): Promise<ControllerResponse> {
	return listController.list(options);
}

/**
 * Get detailed information about a specific Bitbucket pull request
 * @param options - Options including workspace slug, repo slug, and pull request ID
 * @returns Promise with formatted pull request details as Markdown content
 */
async function get(
	options: GetPullRequestToolArgsType,
): Promise<ControllerResponse> {
	return getController.get(options);
}

/**
 * List comments on a Bitbucket pull request
 * @param options - Options including workspace slug, repo slug, and pull request ID
 * @returns Promise with formatted pull request comments as Markdown content
 */
async function listComments(
	options: ListPullRequestCommentsToolArgsType,
): Promise<ControllerResponse> {
	return commentsController.listComments(options);
}

/**
 * Add a comment to a Bitbucket pull request
 * @param options - Options including workspace slug, repo slug, PR ID, and comment content
 * @returns Promise with a success message as content
 */
async function addComment(
	options: CreatePullRequestCommentToolArgsType,
): Promise<ControllerResponse> {
	return commentsController.addComment(options);
}

/**
 * Create a new pull request in Bitbucket
 * @param options - Options including workspace slug, repo slug, source branch, target branch, title, etc.
 * @returns Promise with formatted pull request details as Markdown content
 */
async function add(
	options: CreatePullRequestToolArgsType,
): Promise<ControllerResponse> {
	return createController.add(options);
}

// Export the controller functions
export default { list, get, listComments, addComment, add };
