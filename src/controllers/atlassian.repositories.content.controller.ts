import atlassianRepositoriesService from '../services/vendor.atlassian.repositories.service.js';
import { Logger } from '../utils/logger.util.js';
import { handleControllerError } from '../utils/error-handler.util.js';
import { ControllerResponse } from '../types/common.types.js';
import { CloneRepositoryToolArgsType } from '../tools/atlassian.repositories.types.js';
import { getDefaultWorkspace } from '../utils/workspace.util.js';
import { executeShellCommand } from '../utils/shell.util.js';
import * as path from 'path';
import * as fs from 'fs/promises';

// Logger instance for this module
const logger = Logger.forContext(
	'controllers/atlassian.repositories.content.controller.ts',
);

/**
 * Clones a Bitbucket repository to the local filesystem
 * @param options Options including repository identifiers and target path
 * @returns Information about the cloned repository
 */
export async function handleCloneRepository(
	options: CloneRepositoryToolArgsType,
): Promise<ControllerResponse> {
	const methodLogger = logger.forMethod('handleCloneRepository');
	methodLogger.debug('Cloning repository with options:', options);

	try {
		// Handle optional workspaceSlug
		let { workspaceSlug } = options;
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

		// Required parameters check
		const { repoSlug, targetPath } = options;
		if (!repoSlug) {
			throw new Error('Repository slug is required');
		}
		if (!targetPath) {
			throw new Error('Target path is required');
		}

		// Ensure target path exists
		try {
			methodLogger.debug(`Checking if target path exists: ${targetPath}`);
			await fs.mkdir(targetPath, { recursive: true });
		} catch (dirError) {
			throw new Error(
				`Failed to create or access target directory: ${(dirError as Error).message}`,
			);
		}

		// Get repository details to determine clone URL
		methodLogger.debug(
			`Getting repository details for ${workspaceSlug}/${repoSlug}`,
		);
		const repoDetails = await atlassianRepositoriesService.get({
			workspace: workspaceSlug,
			repo_slug: repoSlug,
		});

		// Find HTTPS clone URL
		let cloneUrl: string | undefined;
		if (repoDetails.links?.clone) {
			const httpsClone = repoDetails.links.clone.find(
				(link) => link.name === 'https',
			);
			if (httpsClone) {
				cloneUrl = httpsClone.href;
			}
		}

		if (!cloneUrl) {
			throw new Error(
				'Could not find HTTPS clone URL for the repository',
			);
		}

		// Determine full target directory path
		// Clone into a subdirectory named after the repo slug
		const targetDir = path.join(targetPath, repoSlug);
		methodLogger.debug(`Will clone to: ${targetDir}`);

		// Check if directory already exists
		try {
			const stats = await fs.stat(targetDir);
			if (stats.isDirectory()) {
				methodLogger.warn(
					`Target directory already exists: ${targetDir}`,
				);
				return {
					content: `⚠️ Target directory \`${targetDir}\` already exists. Please choose a different target path or remove the existing directory.`,
				};
			}
		} catch {
			// Error means directory doesn't exist, which is what we want
			methodLogger.debug(
				`Target directory doesn't exist, proceeding with clone`,
			);
		}

		// Execute git clone command
		methodLogger.debug(`Cloning from URL: ${cloneUrl}`);
		const command = `git clone ${cloneUrl} "${targetDir}"`;
		const result = await executeShellCommand(command, 'cloning repository');

		if (typeof result === 'string') {
			// Result is just the stdout as a string
			return {
				content: `✅ Successfully cloned repository \`${workspaceSlug}/${repoSlug}\` to \`${targetDir}\`.\n\n**Output:**\n\`\`\`\n${result}\n\`\`\``,
			};
		} else {
			// This code is never reached based on our util function signature,
			// but we'll keep it for type safety
			return {
				content: `✅ Successfully cloned repository \`${workspaceSlug}/${repoSlug}\` to \`${targetDir}\`.`,
			};
		}
	} catch (error) {
		throw handleControllerError(error, {
			entityType: 'Repository',
			operation: 'clone',
			source: 'controllers/atlassian.repositories.content.controller.ts@handleCloneRepository',
			additionalInfo: options,
		});
	}
}

/**
 * Retrieves file content from a repository
 * @param options Options including repository identifiers and file path
 * @returns The file content as text
 */
export async function handleGetFileContent(options: {
	workspaceSlug: string;
	repoSlug: string;
	path: string;
	ref?: string;
}): Promise<ControllerResponse> {
	const methodLogger = logger.forMethod('handleGetFileContent');
	methodLogger.debug('Getting file content with options:', options);

	try {
		// Required parameters check
		const { repoSlug, path: filePath } = options;
		let { workspaceSlug } = options;

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
		if (!filePath) {
			throw new Error('File path is required');
		}

		// Get file content from service
		methodLogger.debug(
			`Fetching file content for ${workspaceSlug}/${repoSlug}/${filePath}`,
			{ ref: options.ref },
		);
		const fileContent = await atlassianRepositoriesService.getFileContent({
			workspace: workspaceSlug,
			repo_slug: repoSlug,
			path: filePath,
			commit: options.ref || 'main', // Default to 'main' if no ref is provided
		});

		// Return the file content as is
		methodLogger.debug(
			`Retrieved file content (${fileContent.length} bytes)`,
		);
		return {
			content: fileContent,
		};
	} catch (error) {
		throw handleControllerError(error, {
			entityType: 'File Content',
			operation: 'get',
			source: 'controllers/atlassian.repositories.content.controller.ts@handleGetFileContent',
			additionalInfo: options,
		});
	}
}
