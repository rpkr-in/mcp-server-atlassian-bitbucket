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
import { getDefaultWorkspace } from '../utils/workspace.util.js';

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

		// Handle optional workspaceSlug similar to CLI implementation
		let workspaceSlug = args.workspaceSlug;
		if (!workspaceSlug) {
			methodLogger.debug(
				'No workspace provided, defaulting to workspaceSlug from config',
			);
			const defaultWorkspace = await getDefaultWorkspace();
			if (!defaultWorkspace) {
				return {
					content: [
						{
							type: 'text' as const,
							text: 'Error: No workspace provided and no default workspace configured',
						},
					],
				};
			}
			workspaceSlug = defaultWorkspace;
			methodLogger.debug(`Using default workspace: ${workspaceSlug}`);
		}

		// Call the controller with updated arguments
		const result = await diffController.branchDiff({
			...args,
			workspaceSlug,
		});

		return {
			content: [{ type: 'text' as const, text: result.content }],
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

		// Handle optional workspaceSlug similar to CLI implementation
		let workspaceSlug = args.workspaceSlug;
		if (!workspaceSlug) {
			methodLogger.debug(
				'No workspace provided, defaulting to workspaceSlug from config',
			);
			const defaultWorkspace = await getDefaultWorkspace();
			if (!defaultWorkspace) {
				return {
					content: [
						{
							type: 'text' as const,
							text: 'Error: No workspace provided and no default workspace configured',
						},
					],
				};
			}
			workspaceSlug = defaultWorkspace;
			methodLogger.debug(`Using default workspace: ${workspaceSlug}`);
		}

		// Call the controller with updated arguments
		const result = await diffController.commitDiff({
			...args,
			workspaceSlug,
		});

		return {
			content: [{ type: 'text' as const, text: result.content }],
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
		`Displays detailed differences between two branches in a repository, including code changes by default. Requires \`repoSlug\` and \`sourceBranch\`. If \`workspaceSlug\` is not provided, the system will use your default workspace. Optionally accepts \`destinationBranch\` (defaults to "main") and \`includeFullDiff\` (defaults to true). 

**IMPORTANT PARAMETER ORDER NOTE:** 
- The output displays changes as \`destinationBranch → sourceBranch\` regardless of parameter naming
- For complete code changes (not just summary), try reversing the branch parameters if initial results show only summary
- When \`sourceBranch\` contains newer changes, set \`sourceBranch\` to your feature branch and \`destinationBranch\` to main
- When comparing branches where main contains newer changes than your branch, try reversing the parameters

Supports pagination via \`limit\` and \`cursor\`. Pagination details are included at the end of the text content. Requires Bitbucket credentials to be configured. Returns a rich summary of changed files and code changes as Markdown.`,
		BranchDiffArgsSchema.shape,
		handleBranchDiff,
	);

	// Register commit diff tool
	server.tool(
		'bb_diff_commits',
		`Displays detailed differences between two commits in a repository, including code changes by default. Requires \`repoSlug\`, \`sinceCommit\`, and \`untilCommit\`. If \`workspaceSlug\` is not provided, the system will use your default workspace. Optionally accepts \`includeFullDiff\` (defaults to true).

**IMPORTANT PARAMETER ORDER NOTE:**
- The parameter names are counterintuitive to their actual ordering requirements
- For proper results with full code changes, you must specify:
  - \`sinceCommit\`: The NEWER commit (chronologically later in time)
  - \`untilCommit\`: The OLDER commit (chronologically earlier in time)
- If you see "No changes detected", try reversing the commit order
- The diff result shows changes that would be needed to transform \`sinceCommit\` into \`untilCommit\`

Supports pagination via \`limit\` and \`cursor\`. Pagination details are included at the end of the text content. Requires Bitbucket credentials to be configured. Returns a rich summary of changed files and code changes as Markdown.`,
		CommitDiffArgsSchema.shape,
		handleCommitDiff,
	);

	registerLogger.debug('Successfully registered Diff tools');
}

export default { registerTools };
