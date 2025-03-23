/**
 * Types for Atlassian Jira Issues API
 */
import { ContentRepresentation } from './vendor.atlassian.types.js';

/**
 * Issue status
 */
export interface IssueStatus {
	iconUrl: string;
	name: string;
}

/**
 * Issue link type
 */
export interface IssueLinkType {
	id: string;
	inward: string;
	name: string;
	outward: string;
}

/**
 * Issue link
 */
export interface IssueLink {
	id: string;
	type: IssueLinkType;
	inwardIssue?: {
		id: string;
		key: string;
		self: string;
		fields: {
			status: IssueStatus;
		};
	};
	outwardIssue?: {
		id: string;
		key: string;
		self: string;
		fields: {
			status: IssueStatus;
		};
	};
}

/**
 * Issue attachment
 */
export interface IssueAttachment {
	id: string;
	self: string;
	filename: string;
	author: {
		accountId: string;
		accountType?: string;
		active: boolean;
		displayName: string;
		self: string;
		avatarUrls?: Record<string, string>;
	};
	created: string;
	size: number;
	mimeType: string;
	content: string;
	thumbnail?: string;
}

/**
 * Issue comment
 */
export interface IssueComment {
	id: string;
	self: string;
	author: {
		accountId: string;
		active: boolean;
		displayName: string;
		self: string;
	};
	body: string | ContentRepresentation;
	created: string;
	updated: string;
	updateAuthor: {
		accountId: string;
		active: boolean;
		displayName: string;
		self: string;
	};
	visibility?: {
		identifier: string;
		type: string;
		value: string;
	};
}

/**
 * Issue worklog
 */
export interface IssueWorklog {
	id: string;
	self: string;
	author: {
		accountId: string;
		active: boolean;
		displayName: string;
		self: string;
	};
	comment: string | ContentRepresentation;
	created: string;
	updated: string;
	issueId: string;
	started: string;
	timeSpent: string;
	timeSpentSeconds: number;
	updateAuthor: {
		accountId: string;
		active: boolean;
		displayName: string;
		self: string;
	};
	visibility?: {
		identifier: string;
		type: string;
		value: string;
	};
}

/**
 * Issue time tracking
 */
export interface IssueTimeTracking {
	originalEstimate?: string;
	originalEstimateSeconds?: number;
	remainingEstimate?: string;
	remainingEstimateSeconds?: number;
	timeSpent?: string;
	timeSpentSeconds?: number;
}

/**
 * Issue watcher
 */
export interface IssueWatcher {
	isWatching: boolean;
	self: string;
	watchCount: number;
}

/**
 * Issue fields
 */
export interface IssueFields {
	watcher?: IssueWatcher;
	attachment?: IssueAttachment[];
	description?: string | ContentRepresentation;
	project: {
		id: string;
		key: string;
		name: string;
		self: string;
		avatarUrls: Record<string, string>;
		simplified: boolean;
		insight?: {
			lastIssueUpdateTime: string;
			totalIssueCount: number;
		};
		projectCategory?: {
			id: string;
			name: string;
			description?: string;
			self: string;
		};
	};
	comment?: IssueComment[];
	issuelinks?: IssueLink[];
	worklog?: IssueWorklog[];
	updated?: string | number;
	timetracking?: IssueTimeTracking;
	summary?: string;
	status?: IssueStatus;
	assignee?: {
		accountId: string;
		active: boolean;
		displayName: string;
		self: string;
		avatarUrls?: Record<string, string>;
	};
	priority?: {
		id: string;
		name: string;
		iconUrl: string;
		self: string;
	};
	issuetype?: {
		id: string;
		name: string;
		description: string;
		iconUrl: string;
		self: string;
		subtask: boolean;
		avatarId?: number;
		hierarchyLevel?: number;
	};
	creator?: {
		accountId: string;
		active: boolean;
		displayName: string;
		self: string;
		avatarUrls?: Record<string, string>;
	};
	reporter?: {
		accountId: string;
		active: boolean;
		displayName: string;
		self: string;
		avatarUrls?: Record<string, string>;
	};
	created?: string;
	labels?: string[];
	components?: {
		id: string;
		name: string;
		self: string;
	}[];
	fixVersions?: {
		id: string;
		name: string;
		self: string;
		released: boolean;
		archived: boolean;
		releaseDate?: string;
	}[];
	[key: string]: unknown; // For custom fields
}

/**
 * Issue object returned from the API
 */
export interface Issue {
	id: string;
	key: string;
	self: string;
	expand?: string;
	fields: IssueFields;
}

/**
 * Parameters for searching issues
 */
export interface SearchIssuesParams {
	jql?: string;
	startAt?: number;
	maxResults?: number;
	fields?: string[];
	expand?: string[];
	validateQuery?: boolean;
	properties?: string[];
	fieldsByKeys?: boolean;
	nextPageToken?: string;
	reconcileIssues?: boolean;
}

/**
 * Parameters for getting an issue by ID or key
 */
export interface GetIssueByIdParams {
	fields?: string[];
	expand?: string[];
	properties?: string[];
	fieldsByKeys?: boolean;
	updateHistory?: boolean;
}

/**
 * API response for searching issues
 */
export interface IssuesResponse {
	expand?: string;
	startAt: number;
	maxResults: number;
	total: number;
	issues: Issue[];
	warningMessages?: string[];
	names?: Record<string, string>;
	schema?: Record<string, unknown>;
	nextPageToken?: string;
}
