/**
 * Types for Atlassian Jira Projects API
 */
import {
	ContentProperty,
	OptionalFieldMeta,
	OptionalFieldLinks,
} from './vendor.atlassian.types.js';

/**
 * Project style enum
 */
export type ProjectStyle = 'classic' | 'next-gen';

/**
 * Project avatar URLs
 */
export interface ProjectAvatarUrls {
	'16x16': string;
	'24x24': string;
	'32x32': string;
	'48x48': string;
}

/**
 * Project insight information
 */
export interface ProjectInsight {
	lastIssueUpdateTime: string;
	totalIssueCount: number;
}

/**
 * Project category
 */
export interface ProjectCategory {
	id: string;
	name: string;
	description?: string;
	self: string;
}

/**
 * Project object returned from the API
 */
export interface Project {
	id: string;
	key: string;
	name: string;
	self: string;
	simplified: boolean;
	style: ProjectStyle;
	avatarUrls: ProjectAvatarUrls;
	insight?: ProjectInsight;
	projectCategory?: ProjectCategory;
}

/**
 * Extended project object with optional fields
 */
export interface ProjectDetailed extends Project {
	description?: string;
	lead?: {
		id: string;
		displayName: string;
		active: boolean;
	};
	components: ProjectComponent[];
	versions: ProjectVersion[];
	properties?: {
		results: ContentProperty[];
		meta: OptionalFieldMeta;
		_links: OptionalFieldLinks;
	};
}

/**
 * Project component
 */
export interface ProjectComponent {
	id: string;
	name: string;
	description?: string;
	lead?: {
		id: string;
		displayName: string;
	};
	assigneeType?: string;
	assignee?: {
		id: string;
		displayName: string;
	};
	self: string;
}

/**
 * Project version
 */
export interface ProjectVersion {
	id: string;
	name: string;
	description?: string;
	archived: boolean;
	released: boolean;
	releaseDate?: string;
	startDate?: string;
	self: string;
}

/**
 * Parameters for listing projects
 */
export interface ListProjectsParams {
	ids?: string[];
	keys?: string[];
	query?: string;
	typeKey?: string;
	categoryId?: string;
	action?: string;
	expand?: string[];
	status?: string[];
	orderBy?: string;
	startAt?: number;
	maxResults?: number;
}

/**
 * Parameters for getting a project by ID or key
 */
export interface GetProjectByIdParams {
	expand?: string[];
	includeComponents?: boolean;
	includeVersions?: boolean;
	includeProperties?: boolean;
}

/**
 * API response for listing projects
 */
export interface ProjectsResponse {
	isLast: boolean;
	maxResults: number;
	nextPage?: string;
	self: string;
	startAt: number;
	total: number;
	values: Project[];
}
