import * as path from 'path';
import { Logger } from './logger.util.js';

const logger = Logger.forContext('utils/path.util.ts');

/**
 * Safely converts a path or path segments to a string, handling various input types.
 * Useful for ensuring consistent path string representations across different platforms.
 *
 * @param pathInput - The path or path segments to convert to a string
 * @returns The path as a normalized string
 */
export function pathToString(pathInput: string | string[] | unknown): string {
	if (Array.isArray(pathInput)) {
		return path.join(...pathInput);
	} else if (typeof pathInput === 'string') {
		return pathInput;
	} else if (pathInput instanceof URL) {
		return pathInput.pathname;
	} else if (
		pathInput &&
		typeof pathInput === 'object' &&
		'toString' in pathInput
	) {
		return String(pathInput);
	}

	logger.warn(`Unable to convert path input to string: ${typeof pathInput}`);
	return ''; // Return empty string for null/undefined
}

/**
 * Determines if a given path is within the user's home directory
 * which is generally considered a safe location for MCP operations.
 *
 * @param inputPath - Path to check
 * @returns True if the path is within the user's home directory
 */
export function isPathInHome(inputPath: string): boolean {
	const homePath = process.env.HOME || process.env.USERPROFILE || '';
	if (!homePath) {
		logger.warn('Could not determine user home directory');
		return false;
	}

	const resolvedPath = path.resolve(inputPath);
	return resolvedPath.startsWith(homePath);
}

/**
 * Gets a user-friendly display version of a path for use in messages.
 * For paths within the home directory, can replace with ~ for brevity.
 *
 * @param inputPath - Path to format
 * @param useHomeTilde - Whether to replace home directory with ~ symbol
 * @returns Formatted path string
 */
export function formatDisplayPath(
	inputPath: string,
	useHomeTilde = true,
): string {
	const homePath = process.env.HOME || process.env.USERPROFILE || '';

	if (
		useHomeTilde &&
		homePath &&
		path.resolve(inputPath).startsWith(homePath)
	) {
		return path.resolve(inputPath).replace(homePath, '~');
	}

	return path.resolve(inputPath);
}
