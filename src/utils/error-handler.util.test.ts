import { describe, expect, test, jest } from '@jest/globals';
import {
	ErrorCode,
	buildErrorContext,
	detectErrorType,
	createUserFriendlyErrorMessage,
	handleControllerError,
} from './error-handler.util.js';
import { McpError, ErrorType, createApiError } from './error.util.js';

describe('Error Handler Utilities', () => {
	describe('buildErrorContext function', () => {
		test('builds a complete error context object', () => {
			const context = buildErrorContext(
				'Repository',
				'retrieving',
				'controllers/repositories.controller.ts@get',
				{ workspaceSlug: 'atlassian', repoSlug: 'bitbucket' },
				{ queryParams: { sort: 'name' } },
			);

			expect(context).toEqual({
				entityType: 'Repository',
				operation: 'retrieving',
				source: 'controllers/repositories.controller.ts@get',
				entityId: { workspaceSlug: 'atlassian', repoSlug: 'bitbucket' },
				additionalInfo: { queryParams: { sort: 'name' } },
			});
		});

		test('handles minimal required parameters', () => {
			const context = buildErrorContext(
				'Repository',
				'listing',
				'controllers/repositories.controller.ts@list',
			);

			expect(context).toEqual({
				entityType: 'Repository',
				operation: 'listing',
				source: 'controllers/repositories.controller.ts@list',
			});
			expect(context.entityId).toBeUndefined();
			expect(context.additionalInfo).toBeUndefined();
		});
	});

	describe('detectErrorType function', () => {
		test('detects network errors', () => {
			const error = new Error('network error: connection refused');
			const result = detectErrorType(error);
			expect(result).toEqual({
				code: ErrorCode.NETWORK_ERROR,
				statusCode: 500,
			});
		});

		test('detects rate limit errors', () => {
			const error = new Error('too many requests');
			const result = detectErrorType(error);
			expect(result).toEqual({
				code: ErrorCode.RATE_LIMIT_ERROR,
				statusCode: 429,
			});
		});

		test('detects not found errors', () => {
			const error = new Error('resource not found');
			const result = detectErrorType(error);
			expect(result).toEqual({
				code: ErrorCode.NOT_FOUND,
				statusCode: 404,
			});
		});

		test('detects access denied errors', () => {
			const error = new Error('insufficient permissions');
			const result = detectErrorType(error);
			expect(result).toEqual({
				code: ErrorCode.ACCESS_DENIED,
				statusCode: 403,
			});
		});

		test('detects validation errors', () => {
			const error = new Error('validation failed: invalid input');
			const result = detectErrorType(error);
			expect(result).toEqual({
				code: ErrorCode.VALIDATION_ERROR,
				statusCode: 400,
			});
		});

		test('defaults to unexpected error', () => {
			const error = new Error('something unexpected happened');
			const result = detectErrorType(error);
			expect(result).toEqual({
				code: ErrorCode.UNEXPECTED_ERROR,
				statusCode: 500,
			});
		});

		test('respects explicit status code from error', () => {
			const error = new McpError(
				'Custom error',
				ErrorType.API_ERROR,
				418,
			);
			const result = detectErrorType(error);
			expect(result.statusCode).toBe(418);
		});

		test('detects Bitbucket-specific repository not found errors', () => {
			const bitbucketError = {
				error: {
					message: 'repository not found',
				},
			};
			const mcpError = createApiError('API Error', 404, bitbucketError);
			const result = detectErrorType(mcpError);
			expect(result).toEqual({
				code: ErrorCode.NOT_FOUND,
				statusCode: 404,
			});
		});

		test('detects Bitbucket-specific permission errors', () => {
			const bitbucketError = {
				error: {
					message: 'access denied for this repository',
				},
			};
			const mcpError = createApiError('API Error', 403, bitbucketError);
			const result = detectErrorType(mcpError);
			expect(result).toEqual({
				code: ErrorCode.ACCESS_DENIED,
				statusCode: 403,
			});
		});

		test('detects Bitbucket-specific validation errors', () => {
			const bitbucketError = {
				error: {
					message: 'invalid parameter: repository name',
				},
			};
			const mcpError = createApiError('API Error', 400, bitbucketError);
			const result = detectErrorType(mcpError);
			expect(result).toEqual({
				code: ErrorCode.VALIDATION_ERROR,
				statusCode: 400,
			});
		});
	});

	describe('createUserFriendlyErrorMessage function', () => {
		test('creates NOT_FOUND message with entityId string', () => {
			const message = createUserFriendlyErrorMessage(
				ErrorCode.NOT_FOUND,
				{
					entityType: 'Repository',
					entityId: 'atlassian/bitbucket',
				},
			);
			expect(message).toContain(
				'Repository atlassian/bitbucket not found',
			);
		});

		test('creates NOT_FOUND message with entityId object', () => {
			const message = createUserFriendlyErrorMessage(
				ErrorCode.NOT_FOUND,
				{
					entityType: 'Repository',
					entityId: {
						workspaceSlug: 'atlassian',
						repoSlug: 'bitbucket',
					},
				},
			);
			expect(message).toContain(
				'Repository atlassian/bitbucket not found',
			);
		});

		test('creates ACCESS_DENIED message', () => {
			const message = createUserFriendlyErrorMessage(
				ErrorCode.ACCESS_DENIED,
				{
					entityType: 'Repository',
					entityId: 'atlassian/bitbucket',
				},
			);
			expect(message).toContain(
				'Access denied for repository atlassian/bitbucket',
			);
		});

		test('creates VALIDATION_ERROR message', () => {
			const originalMessage = 'Invalid repository name';
			const message = createUserFriendlyErrorMessage(
				ErrorCode.VALIDATION_ERROR,
				{
					entityType: 'Repository',
					operation: 'creating',
				},
				originalMessage,
			);
			expect(message).toBe(
				`${originalMessage} Error details: ${originalMessage}`,
			);
		});

		test('creates NETWORK_ERROR message', () => {
			const message = createUserFriendlyErrorMessage(
				ErrorCode.NETWORK_ERROR,
				{
					entityType: 'Repository',
					operation: 'retrieving',
				},
			);
			expect(message).toContain('Network error');
			expect(message).toContain('Bitbucket API');
		});

		test('creates RATE_LIMIT_ERROR message', () => {
			const message = createUserFriendlyErrorMessage(
				ErrorCode.RATE_LIMIT_ERROR,
			);
			expect(message).toContain('Bitbucket API rate limit exceeded');
		});

		test('includes original message for non-specific errors', () => {
			const message = createUserFriendlyErrorMessage(
				ErrorCode.UNEXPECTED_ERROR,
				{
					entityType: 'Repository',
					operation: 'processing',
				},
				'Something went wrong',
			);
			expect(message).toContain('unexpected error');
			expect(message).toContain('Something went wrong');
		});
	});

	describe('handleControllerError function', () => {
		test('throws appropriate API error with user-friendly message', () => {
			const originalError = new Error('Repository not found');
			const context = buildErrorContext(
				'Repository',
				'retrieving',
				'controllers/repositories.controller.ts@get',
				'atlassian/bitbucket',
			);

			expect(() => {
				handleControllerError(originalError, context);
			}).toThrow(McpError);

			try {
				handleControllerError(originalError, context);
			} catch (error) {
				expect(error).toBeInstanceOf(McpError);
				expect((error as McpError).type).toBe(ErrorType.API_ERROR);
				expect((error as McpError).statusCode).toBe(404);
				expect((error as McpError).message).toContain(
					'Repository atlassian/bitbucket not found',
				);
				expect((error as McpError).originalError).toBe(originalError);
			}
		});
	});
});
