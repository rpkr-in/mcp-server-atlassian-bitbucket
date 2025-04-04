# Atlassian Bitbucket MCP Server

This project provides a Model Context Protocol (MCP) server that acts as a bridge between AI assistants (like Anthropic's Claude, Cursor AI, or other MCP-compatible clients) and your Atlassian Bitbucket instance. It allows AI to securely access and interact with your repositories, pull requests, and workspaces in real time.

---

# Overview

## What is MCP?

Model Context Protocol (MCP) is an open standard that allows AI systems to securely and contextually connect with external tools and data sources.

This server implements MCP specifically for Bitbucket Cloud, bridging your Bitbucket data with AI assistants.

## Why Use This Server?

- **Minimal Input, Maximum Output Philosophy**: Simple identifiers like `workspaceSlug` and `repoSlug` are all you need. Each tool returns comprehensive details without requiring extra flags.

- **Rich Code Visualization**: Get detailed insights into repositories and code changes with file statistics, diff views, and smart context around code modifications.

- **Secure Local Authentication**: Credentials are never stored in the server. The server runs locally, so your tokens never leave your machine and you can request only the permissions you need.

- **Intuitive Markdown Responses**: All responses use well-structured Markdown for readability with consistent formatting and navigational links.

- **Full Bitbucket Integration**: Access workspaces, repositories, pull requests, comments, code search, and more through a unified interface.

---

# Getting Started

## Prerequisites

- **Node.js** (>=18.x): [Download](https://nodejs.org/)
- **Bitbucket Cloud Account**

---

## Step 1: Authenticate

Choose one of the following authentication methods:

### Option A: Bitbucket App Password (Recommended)

Generate one from [Bitbucket App Passwords](https://bitbucket.org/account/settings/app-passwords/). Minimum permissions:

- Workspaces: Read
- Repositories: Read
- Pull Requests: Read

### Option B: Atlassian API Token

Generate one from [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens).

---

## Step 2: Configure Credentials

### Method A: MCP Config File (Recommended)

Create or edit `~/.mcp/configs.json`:

**Using Bitbucket App Password:**

```json
{
	"@aashari/mcp-server-atlassian-bitbucket": {
		"environments": {
			"ATLASSIAN_BITBUCKET_USERNAME": "<your_username>",
			"ATLASSIAN_BITBUCKET_APP_PASSWORD": "<your_app_password>"
		}
	}
}
```

**Using Atlassian API Token:**

```json
{
	"@aashari/mcp-server-atlassian-bitbucket": {
		"environments": {
			"ATLASSIAN_SITE_NAME": "bitbucket",
			"ATLASSIAN_USER_EMAIL": "<your_email>",
			"ATLASSIAN_API_TOKEN": "<your_api_token>"
		}
	}
}
```

### Method B: Environment Variables

Pass credentials directly when running the server:

```bash
ATLASSIAN_BITBUCKET_USERNAME="<your_username>" \
ATLASSIAN_BITBUCKET_APP_PASSWORD="<your_app_password>" \
npx -y @aashari/mcp-server-atlassian-bitbucket
```

---

## Step 3: Connect Your AI Assistant

Configure your MCP-compatible client to launch this server.

**Claude / Cursor Configuration:**

```json
{
	"mcpServers": {
		"aashari/mcp-server-atlassian-bitbucket": {
			"command": "npx",
			"args": ["-y", "@aashari/mcp-server-atlassian-bitbucket"]
		}
	}
}
```

This configuration launches the server automatically at runtime.

---

# Tools

This section covers the MCP tools available when using this server with an AI assistant. Note that MCP tools use `snake_case` for tool names and `camelCase` for parameters.

## `list_workspaces`

List available Bitbucket workspaces.

```json
{}
```

_or:_

```json
{ "query": "devteam" }
```

> "Show me all my Bitbucket workspaces."

---

## `get_workspace`

Get full details for a specific workspace.

```json
{ "workspaceSlug": "acme-corp" }
```

> "Tell me more about the 'acme-corp' workspace."

---

## `list_repositories`

List repositories in a workspace.

```json
{ "workspaceSlug": "acme-corp" }
```

_or:_

```json
{ "workspaceSlug": "acme-corp", "query": "api" }
```

> "List repositories in 'acme-corp'."

---

## `get_repository`

Get details of a specific repository.

```json
{ "workspaceSlug": "acme-corp", "repoSlug": "backend-api" }
```

> "Show me the 'backend-api' repository in 'acme-corp'."

---

## `search`

Search Bitbucket content.

**Repositories:**

```json
{ "workspaceSlug": "acme-corp", "query": "api", "scope": "repositories" }
```

**Pull Requests:**

```json
{
	"workspaceSlug": "acme-corp",
	"repoSlug": "backend-api",
	"query": "fix",
	"scope": "pullrequests"
}
```

**Commits:**

```json
{
	"workspaceSlug": "acme-corp",
	"repoSlug": "backend-api",
	"query": "update",
	"scope": "commits"
}
```

**Code:**

```json
{ "workspaceSlug": "acme-corp", "query": "function getUser", "scope": "code" }
```

> "Search for 'function getUser' in the 'acme-corp' workspace."

---

## `list_pull_requests`

List pull requests in a repository.

```json
{ "workspaceSlug": "acme-corp", "repoSlug": "frontend-app", "state": "OPEN" }
```

> "Show open PRs in 'frontend-app'."

---

## `get_pull_request`

Get full details of a pull request, including code diffs and file changes.

```json
{ "workspaceSlug": "acme-corp", "repoSlug": "frontend-app", "prId": "42" }
```

> "Get PR #42 from 'frontend-app' with all code changes."

---

## `list_pr_comments`

List comments on a specific pull request.

```json
{ "workspaceSlug": "acme-corp", "repoSlug": "frontend-app", "prId": "42" }
```

> "Show me all comments on PR #42."

---

## `add_pr_comment`

Add a comment to a pull request.

**General:**

```json
{
	"workspaceSlug": "acme-corp",
	"repoSlug": "frontend-app",
	"prId": "42",
	"content": "Looks good."
}
```

**Inline:**

```json
{
	"workspaceSlug": "acme-corp",
	"repoSlug": "frontend-app",
	"prId": "42",
	"content": "Consider refactoring.",
	"inline": { "path": "src/utils.js", "line": 42 }
}
```

> "Add a comment to PR #42 on line 42."

---

## `pull_requests_create`

Create a new pull request.

```json
{
	"workspaceSlug": "acme-corp",
	"repoSlug": "frontend-app",
	"title": "Add login screen",
	"sourceBranch": "feature/login"
}
```

> "Create a PR from 'feature/login' to 'main'."

---

# Command-Line Interface (CLI)

The CLI uses kebab-case for commands (e.g., `list-workspaces`) and options (e.g., `--workspace-slug`).

## Quick Use with `npx`

```bash
npx -y @aashari/mcp-server-atlassian-bitbucket list-workspaces
npx -y @aashari/mcp-server-atlassian-bitbucket get-repository \
  --workspace-slug acme-corp \
  --repo-slug backend-api
```

## Install Globally

```bash
npm install -g @aashari/mcp-server-atlassian-bitbucket
```

Then run directly:

```bash
mcp-atlassian-bitbucket list-workspaces
```

## Discover More CLI Options

Use `--help` to see flags and usage for all available commands:

```bash
mcp-atlassian-bitbucket --help
```

Or get detailed help for a specific command:

```bash
mcp-atlassian-bitbucket get-repository --help
mcp-atlassian-bitbucket list-pull-requests --help
mcp-atlassian-bitbucket search --help
```

---

# License

[ISC License](https://opensource.org/licenses/ISC)
