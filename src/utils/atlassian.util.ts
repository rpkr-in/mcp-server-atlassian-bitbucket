/**
 * Types of content that can be searched in Bitbucket
 */
export enum ContentType {
	WIKI = 'wiki',
	ISSUE = 'issue',
	PULLREQUEST = 'pullrequest',
	COMMIT = 'commit',
	BRANCH = 'branch',
	TAG = 'tag',
}

/**
 * Get the display name for a content type
 */
export function getContentTypeDisplay(type: ContentType): string {
	switch (type) {
		case ContentType.WIKI:
			return 'Wiki';
		case ContentType.ISSUE:
			return 'Issue';
		case ContentType.PULLREQUEST:
			return 'Pull Request';
		case ContentType.COMMIT:
			return 'Commit';
		case ContentType.BRANCH:
			return 'Branch';
		case ContentType.TAG:
			return 'Tag';
		default:
			return type;
	}
}
