import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import diffController from '../controllers/atlassian.diff.controller.js';
import {
	BranchDiffArgsSchema,
	CommitDiffArgsSchema,
	type BranchDiffArgsType,
	type CommitDiffArgsType,
} from './atlassian.diff.types.js';

// Create a contextualized logger for this file
const toolLogger = Logger.forContext('tools/atlassian.diff.tool.ts');

// Log tool initialization
toolLogger.debug('Bitbucket diff tool initialized');

/**
 * Handles branch diff requests
 * @param args - Arguments for the branch diff operation
 * @returns MCP tool response
 */
async function handleBranchDiff(args: BranchDiffArgsType) {
	const methodLogger = toolLogger.forMethod('handleBranchDiff');
	try {
		methodLogger.debug('Processing branch diff tool request', args);

		const result = await diffController.branchDiff(args);

		return {
			content: [{ type: 'text' as const, text: result.content }],
			metadata: { pagination: result.pagination },
		};
	} catch (error) {
		methodLogger.error('Branch diff tool failed', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Handles commit diff requests
 * @param args - Arguments for the commit diff operation
 * @returns MCP tool response
 */
async function handleCommitDiff(args: CommitDiffArgsType) {
	const methodLogger = toolLogger.forMethod('handleCommitDiff');
	try {
		methodLogger.debug('Processing commit diff tool request', args);

		const result = await diffController.commitDiff(args);

		return {
			content: [{ type: 'text' as const, text: result.content }],
			metadata: { pagination: result.pagination },
		};
	} catch (error) {
		methodLogger.error('Commit diff tool failed', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Register diff tools with the MCP server
 * @param server - MCP server instance
 */
function registerTools(server: McpServer) {
	const registerLogger = toolLogger.forMethod('registerTools');
	registerLogger.debug('Registering Diff tools...');

	// Register branch diff tool
	server.tool(
		'bb_diff_branches',
		`Displays differences between two branches in a repository. Requires \`workspaceSlug\`, \`repoSlug\`, and \`sourceBranch\`. Optionally accepts \`destinationBranch\` (defaults to "main") and \`includeFullDiff\` (to include raw code changes). Supports pagination via \`limit\` and \`cursor\` (check metadata). Requires Bitbucket credentials to be configured. Returns a summary of changed files as Markdown.`,
		BranchDiffArgsSchema.shape,
		handleBranchDiff,
	);

	// Register commit diff tool
	server.tool(
		'bb_diff_commits',
		`Displays differences between two commits in a repository. Requires \`workspaceSlug\`, \`repoSlug\`, \`sinceCommit\`, and \`untilCommit\`. Optionally accepts \`includeFullDiff\` (to include raw code changes). Supports pagination via \`limit\` and \`cursor\` (check metadata). Requires Bitbucket credentials to be configured. Returns a summary of changed files as Markdown.`,
		CommitDiffArgsSchema.shape,
		handleCommitDiff,
	);

	registerLogger.debug('Successfully registered Diff tools');
}

export default { registerTools };
