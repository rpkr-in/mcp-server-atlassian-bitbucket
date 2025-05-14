import { Logger } from './logger.util.js';
import { formatSeparator } from './formatter.util.js';

/**
 * Error types for classification
 */
export enum ErrorType {
	AUTH_MISSING = 'AUTH_MISSING',
	AUTH_INVALID = 'AUTH_INVALID',
	API_ERROR = 'API_ERROR',
	UNEXPECTED_ERROR = 'UNEXPECTED_ERROR',
}

/**
 * Custom error class with type classification
 */
export class McpError extends Error {
	type: ErrorType;
	statusCode?: number;
	originalError?: unknown;

	constructor(
		message: string,
		type: ErrorType,
		statusCode?: number,
		originalError?: unknown,
	) {
		super(message);
		this.name = 'McpError';
		this.type = type;
		this.statusCode = statusCode;
		this.originalError = originalError;
	}
}

/**
 * Helper to unwrap nested McpErrors and return the deepest original error.
 * This is useful when an McpError contains another McpError as `originalError`
 * which in turn may wrap the vendor (Bitbucket) error text or object.
 */
function getDeepOriginalError(error: McpError | unknown): unknown {
	let current: unknown = error;
	// Traverse a maximum of 5 levels to avoid infinite loops in pathological cases
	for (let i = 0; i < 5; i += 1) {
		if (current instanceof McpError && current.originalError) {
			current = current.originalError;
			continue;
		}
		break;
	}
	return current instanceof McpError ? current.message : current;
}

/**
 * Create an authentication missing error
 */
export function createAuthMissingError(
	message: string = 'Authentication credentials are missing',
	originalError?: unknown,
): McpError {
	return new McpError(
		message,
		ErrorType.AUTH_MISSING,
		undefined,
		originalError,
	);
}

/**
 * Create an authentication invalid error
 */
export function createAuthInvalidError(
	message: string = 'Authentication credentials are invalid',
	originalError?: unknown,
): McpError {
	return new McpError(message, ErrorType.AUTH_INVALID, 401, originalError);
}

/**
 * Create an API error
 */
export function createApiError(
	message: string,
	statusCode?: number,
	originalError?: unknown,
): McpError {
	return new McpError(
		message,
		ErrorType.API_ERROR,
		statusCode,
		originalError,
	);
}

/**
 * Create an unexpected error
 */
export function createUnexpectedError(
	message: string = 'An unexpected error occurred',
	originalError?: unknown,
): McpError {
	return new McpError(
		message,
		ErrorType.UNEXPECTED_ERROR,
		undefined,
		originalError,
	);
}

/**
 * Ensure an error is an McpError
 */
export function ensureMcpError(error: unknown): McpError {
	if (error instanceof McpError) {
		return error;
	}

	if (error instanceof Error) {
		return createUnexpectedError(error.message, error);
	}

	return createUnexpectedError(String(error));
}

/**
 * Format error for MCP tool response – provides enough detail for LLMs
 * while remaining concise.  Vendor (Bitbucket) error details are included
 * when available so the AI can reason about the exact failure cause.
 */
export function formatErrorForMcpTool(error: unknown): {
	content: Array<{ type: 'text'; text: string }>;
} {
	const methodLogger = Logger.forContext(
		'utils/error.util.ts',
		'formatErrorForMcpTool',
	);
	const mcpError = ensureMcpError(error);

	methodLogger.error(`${mcpError.type} error`, mcpError);

	let detailedMessage = `Error: ${mcpError.message}`;

	const deepOriginal = getDeepOriginalError(mcpError);
	if (deepOriginal && typeof deepOriginal === 'string') {
		if (!detailedMessage.includes(deepOriginal)) {
			detailedMessage += `\nVendor API Error: ${deepOriginal}`;
		}
	} else if (deepOriginal instanceof Error) {
		if (!detailedMessage.includes(deepOriginal.message)) {
			detailedMessage += `\nVendor API Error: ${deepOriginal.message}`;
		}
	}

	return {
		content: [
			{
				type: 'text' as const,
				text: detailedMessage,
			},
		],
	};
}

/**
 * Format error for MCP resource response
 */
export function formatErrorForMcpResource(
	error: unknown,
	uri: string,
): {
	contents: Array<{
		uri: string;
		text: string;
		mimeType: string;
		description?: string;
	}>;
} {
	const methodLogger = Logger.forContext(
		'utils/error.util.ts',
		'formatErrorForMcpResource',
	);
	const mcpError = ensureMcpError(error);

	methodLogger.error(`${mcpError.type} error`, mcpError);

	return {
		contents: [
			{
				uri,
				text: `Error: ${mcpError.message}`,
				mimeType: 'text/plain',
				description: `Error: ${mcpError.type}`,
			},
		],
	};
}

/**
 * Handle error in CLI context
 * @param error The error to handle
 * @param source Optional source information for better error messages
 */
export function handleCliError(error: unknown, source?: string): never {
	const methodLogger = Logger.forContext(
		'utils/error.util.ts',
		'handleCliError',
	);
	const mcpError = ensureMcpError(error);

	// Log detailed information at different levels based on error type
	if (mcpError.statusCode && mcpError.statusCode >= 500) {
		methodLogger.error(`${mcpError.type} error occurred`, {
			message: mcpError.message,
			statusCode: mcpError.statusCode,
			source,
			stack: mcpError.stack,
		});
	} else {
		methodLogger.warn(`${mcpError.type} error occurred`, {
			message: mcpError.message,
			statusCode: mcpError.statusCode,
			source,
		});
	}

	// Log additional debug information if DEBUG is enabled
	methodLogger.debug('Error details', {
		type: mcpError.type,
		statusCode: mcpError.statusCode,
		originalError: mcpError.originalError,
		stack: mcpError.stack,
	});

	// Build a well-formatted CLI output using markdown-style helpers
	const cliLines: string[] = [];

	// Primary error headline
	cliLines.push(`❌  ${mcpError.message}`);

	// Status code (if any)
	if (mcpError.statusCode) {
		cliLines.push(`HTTP Status: ${mcpError.statusCode}`);
	}

	// Separator
	cliLines.push(formatSeparator());

	// Vendor error (code block for readability)
	const deepOriginal = getDeepOriginalError(mcpError);
	if (deepOriginal) {
		cliLines.push('Vendor API Error:');
		const vendorText =
			deepOriginal instanceof Error
				? deepOriginal.message
				: String(deepOriginal);
		cliLines.push('```');
		cliLines.push(vendorText.trim());
		cliLines.push('```');
	}

	console.error(cliLines.join('\n'));
	process.exit(1);
}
