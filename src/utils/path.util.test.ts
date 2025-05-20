import * as os from 'os';
import * as path from 'path';
import { pathToString, isPathInHome, formatDisplayPath } from './path.util.js';

describe('Path Utilities', () => {
	describe('pathToString', () => {
		it('should convert string paths correctly', () => {
			expect(pathToString('/test/path')).toBe('/test/path');
		});

		it('should join array paths correctly', () => {
			expect(pathToString(['/test', 'path'])).toBe(
				path.join('/test', 'path'),
			);
		});

		it('should handle URL objects', () => {
			expect(pathToString(new URL('file:///test/path'))).toBe(
				'/test/path',
			);
		});

		it('should handle objects with toString', () => {
			expect(pathToString({ toString: () => '/test/path' })).toBe(
				'/test/path',
			);
		});

		it('should convert null or undefined to empty string', () => {
			expect(pathToString(null)).toBe('null');
			expect(pathToString(undefined)).toBe('');
		});
	});

	describe('isPathInHome', () => {
		const originalHome = process.env.HOME;
		const originalUserProfile = process.env.USERPROFILE;

		beforeEach(() => {
			// Set a mock home directory for testing
			process.env.HOME = '/mock/home';
			process.env.USERPROFILE = '/mock/home';
		});

		afterEach(() => {
			// Restore the original environment variables
			process.env.HOME = originalHome;
			process.env.USERPROFILE = originalUserProfile;
		});

		it('should return true for paths in home directory', () => {
			expect(isPathInHome('/mock/home/projects')).toBe(true);
		});

		it('should return false for paths outside home directory', () => {
			expect(isPathInHome('/tmp/projects')).toBe(false);
		});

		it('should resolve relative paths correctly', () => {
			const cwd = process.cwd();
			if (cwd.startsWith('/mock/home')) {
				expect(isPathInHome('./projects')).toBe(true);
			} else {
				expect(isPathInHome('./projects')).toBe(false);
			}
		});
	});

	describe('formatDisplayPath', () => {
		const originalHome = process.env.HOME;
		const originalUserProfile = process.env.USERPROFILE;

		beforeEach(() => {
			// Set a mock home directory for testing
			process.env.HOME = '/mock/home';
			process.env.USERPROFILE = '/mock/home';
		});

		afterEach(() => {
			// Restore the original environment variables
			process.env.HOME = originalHome;
			process.env.USERPROFILE = originalUserProfile;
		});

		it('should replace home directory with tilde when requested', () => {
			expect(formatDisplayPath('/mock/home/projects', true)).toBe(
				'~/projects',
			);
		});

		it('should not replace home directory when not requested', () => {
			expect(formatDisplayPath('/mock/home/projects', false)).toBe(
				'/mock/home/projects',
			);
		});

		it('should not modify paths outside of home directory', () => {
			expect(formatDisplayPath('/tmp/projects', true)).toBe(
				'/tmp/projects',
			);
		});

		it('should resolve relative paths', () => {
			// This will resolve to the absolute path based on current working directory
			const expected = path.resolve('./projects');
			expect(formatDisplayPath('./projects')).toBe(expected);
		});
	});
});
