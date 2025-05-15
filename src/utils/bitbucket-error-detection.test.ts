import { describe, expect, test } from '@jest/globals';
import { detectErrorType, ErrorCode } from './error-handler.util.js';
import { createApiError } from './error.util.js';

describe('Bitbucket Error Detection', () => {
	describe('Classic Bitbucket error structure: { error: { message, detail } }', () => {
		test('detects not found errors', () => {
			// Create a mock Bitbucket error structure
			const bitbucketError = {
				error: {
					message: 'Repository not found',
					detail: 'The repository does not exist or you do not have access',
				},
			};
			const mcpError = createApiError('API Error', 404, bitbucketError);

			const result = detectErrorType(mcpError);
			expect(result).toEqual({
				code: ErrorCode.NOT_FOUND,
				statusCode: 404,
			});
		});

		test('detects access denied errors', () => {
			const bitbucketError = {
				error: {
					message: 'Access denied to this repository',
					detail: 'You need admin permissions to perform this action',
				},
			};
			const mcpError = createApiError('API Error', 403, bitbucketError);

			const result = detectErrorType(mcpError);
			expect(result).toEqual({
				code: ErrorCode.ACCESS_DENIED,
				statusCode: 403,
			});
		});

		test('detects validation errors', () => {
			const bitbucketError = {
				error: {
					message: 'Invalid parameter: repository name',
					detail: 'Repository name can only contain alphanumeric characters',
				},
			};
			const mcpError = createApiError('API Error', 400, bitbucketError);

			const result = detectErrorType(mcpError);
			expect(result).toEqual({
				code: ErrorCode.VALIDATION_ERROR,
				statusCode: 400,
			});
		});

		test('detects rate limit errors', () => {
			const bitbucketError = {
				error: {
					message: 'Too many requests',
					detail: 'Rate limit exceeded. Try again later.',
				},
			};
			const mcpError = createApiError('API Error', 429, bitbucketError);

			const result = detectErrorType(mcpError);
			expect(result).toEqual({
				code: ErrorCode.RATE_LIMIT_ERROR,
				statusCode: 429,
			});
		});
	});

	describe('Alternate Bitbucket error structure: { type: "error", ... }', () => {
		test('detects not found errors', () => {
			const altBitbucketError = {
				type: 'error',
				status: 404,
				message: 'Resource not found',
			};
			const mcpError = createApiError(
				'API Error',
				404,
				altBitbucketError,
			);

			const result = detectErrorType(mcpError);
			expect(result).toEqual({
				code: ErrorCode.NOT_FOUND,
				statusCode: 404,
			});
		});

		test('detects access denied errors', () => {
			const altBitbucketError = {
				type: 'error',
				status: 403,
				message: 'Forbidden',
			};
			const mcpError = createApiError(
				'API Error',
				403,
				altBitbucketError,
			);

			const result = detectErrorType(mcpError);
			expect(result).toEqual({
				code: ErrorCode.ACCESS_DENIED,
				statusCode: 403,
			});
		});
	});

	describe('Bitbucket errors array structure: { errors: [{ ... }] }', () => {
		test('detects errors from array structure', () => {
			const arrayBitbucketError = {
				errors: [
					{
						status: 400,
						code: 'INVALID_REQUEST_PARAMETER',
						title: 'Invalid parameter value',
						message: 'The parameter is not valid',
					},
				],
			};
			const mcpError = createApiError(
				'API Error',
				400,
				arrayBitbucketError,
			);

			const result = detectErrorType(mcpError);
			expect(result).toEqual({
				code: ErrorCode.VALIDATION_ERROR,
				statusCode: 400,
			});
		});
	});

	describe('Network errors in Bitbucket context', () => {
		test('detects network errors from TypeError', () => {
			const networkError = new TypeError('Failed to fetch');
			const mcpError = createApiError('Network Error', 500, networkError);

			const result = detectErrorType(mcpError);
			expect(result).toEqual({
				code: ErrorCode.NETWORK_ERROR,
				statusCode: 500,
			});
		});

		test('detects other common network error messages', () => {
			const errorMessages = [
				'network error occurred',
				'ECONNREFUSED',
				'ENOTFOUND',
				'Network request failed',
				'Failed to fetch',
			];

			errorMessages.forEach((msg) => {
				const error = new Error(msg);
				const result = detectErrorType(error);
				expect(result).toEqual({
					code: ErrorCode.NETWORK_ERROR,
					statusCode: 500,
				});
			});
		});
	});
});
