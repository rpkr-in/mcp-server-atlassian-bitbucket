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
	"bitbucket": {
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
	"bitbucket": {
		"environments": {
			"ATLASSIAN_SITE_NAME": "bitbucket",
			"ATLASSIAN_USER_EMAIL": "<your_email>",
			"ATLASSIAN_API_TOKEN": "<your_api_token>"
		}
	}
}
```

**Note:** For backward compatibility, the server will also recognize configurations under the full package name (`@aashari/mcp-server-atlassian-bitbucket`), the unscoped package name (`mcp-server-atlassian-bitbucket`), or the `atlassian-bitbucket` format if the recommended `bitbucket` key is not found. However, using the short `bitbucket` key is preferred for new configurations.

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
		"bitbucket": {
			"command": "npx",
			"args": ["-y", "@aashari/mcp-server-atlassian-bitbucket"]
		}
	}
}
```

This configuration launches the server automatically at runtime.

---

## Getting Started with Bitbucket Tools

This section provides a quick guide on how to use the MCP tools to interact with Bitbucket, focusing on common discovery workflows.

### Prerequisites

- Ensure you have the `mcp-server-atlassian-bitbucket` server running.
- Ensure you have authenticated with Bitbucket using one of the methods described above.

### Typical Workflow Example

Imagine you need to find a specific repository, check its recent activity, and review a pull request.

1.  **Find the Workspace:**

    - Most Bitbucket operations require a `workspaceSlug`. List your accessible workspaces to find the correct one:
        ```
        bb_ls_workspaces
        ```
    - _Example Output might show a workspace with slug `my-org`._

2.  **Find the Repository:**

    - List repositories within the `my-org` workspace. You can filter by name if needed:
        ```
        bb_ls_repos --workspaceSlug my-org --query "infra-config"
        ```
    - _Example Output might show a repository with slug `infra-terraform`._

3.  **Explore the Repository:**

    - Get details about the `infra-terraform` repository:
        ```
        bb_get_repo --workspaceSlug my-org --repoSlug infra-terraform
        ```
    - Check the recent commit history:
        ```
        bb_get_commit_history --workspaceSlug my-org --repoSlug infra-terraform --limit 10
        ```

4.  **Review a Pull Request:**
    - List open pull requests in the repository:
        ```
        bb_ls_prs --workspaceSlug my-org --repoSlug infra-terraform --state OPEN
        ```
    - _Example Output might show PR #55._
    - Get the full details and code changes for PR #55:
        ```
        bb_get_pr --workspaceSlug my-org --repoSlug infra-terraform --prId 55 --fullDiff
        ```
    - List comments on PR #55:
        ```
        bb_ls_pr_comments --workspaceSlug my-org --repoSlug infra-terraform --prId 55
        ```

This workflow demonstrates how to navigate from workspaces to repositories and pull requests using the Bitbucket MCP tools.

---

# Tools

This section covers the MCP tools available when using this server with an AI assistant. Note that MCP tools use `snake_case` for tool names and `camelCase` for parameters.

## `bb_ls_workspaces`

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

## `bb_get_workspace`

Get full details for a specific workspace.

```json
{ "workspaceSlug": "acme-corp" }
```

> "Tell me more about the 'acme-corp' workspace."

---

## `bb_ls_repos`

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

## `bb_get_repo`

Get details of a specific repository.

```json
{ "workspaceSlug": "acme-corp", "repoSlug": "backend-api" }
```

> "Show me the 'backend-api' repository in 'acme-corp'."

---

## `bb_search`

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

## `bb_ls_prs`

List pull requests in a repository.

```json
{ "workspaceSlug": "acme-corp", "repoSlug": "frontend-app", "state": "OPEN" }
```

> "Show open PRs in 'frontend-app'."

---

## `bb_get_pr`

Get full details of a pull request, including code diffs and file changes.

```json
{ "workspaceSlug": "acme-corp", "repoSlug": "frontend-app", "prId": "42" }
```

> "Get PR #42 from 'frontend-app' with all code changes."

---

## `bb_ls_pr_comments`

List comments on a specific pull request.

```json
{ "workspaceSlug": "acme-corp", "repoSlug": "frontend-app", "prId": "42" }
```

> "Show me all comments on PR #42."

---

## `bb_create_pr_comment`

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

## `bb_create_pr`

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

## `bb_get_commit_history`

Retrieve the commit history for a repository.

```json
{
	"workspaceSlug": "acme-corp",
	"repoSlug": "backend-api"
}
```

_or (filter by branch and path):_

```json
{
	"workspaceSlug": "acme-corp",
	"repoSlug": "backend-api",
	"revision": "develop",
	"path": "src/main/java/com/acme/service/UserService.java"
}
```

> "Show me the commit history for the 'backend-api' repository."
> "Get commits on the develop branch for UserService.java."

---

# Command-Line Interface (CLI)

The CLI uses kebab-case for commands (e.g., `ls-workspaces`) and options (e.g., `--workspace-slug`).

## Quick Use with `npx`

```bash
npx -y @aashari/mcp-server-atlassian-bitbucket ls-workspaces
npx -y @aashari/mcp-server-atlassian-bitbucket get-repo \
  --workspace-slug acme-corp \
  --repo-slug backend-api
npx -y @aashari/mcp-server-atlassian-bitbucket ls-prs \
  --workspace-slug acme-corp \
  --repo-slug frontend-app \
  --state OPEN
npx -y @aashari/mcp-server-atlassian-bitbucket create-pr-comment \
  --workspace-slug acme-corp \
  --repo-slug frontend-app \
  --pr-id 42 \
  --content "Looks good to merge."
npx -y @aashari/mcp-server-atlassian-bitbucket get-commit-history \
  --workspace-slug acme-corp \
  --repo-slug backend-api \
  --revision develop
```

## Install Globally

```bash
npm install -g @aashari/mcp-server-atlassian-bitbucket
```

Then run directly:

```bash
mcp-atlassian-bitbucket ls-workspaces
mcp-atlassian-bitbucket get-repo --workspace-slug acme-corp --repo-slug backend-api
```

## Discover More CLI Options

Use `--help` to see flags and usage for all available commands:

```bash
mcp-atlassian-bitbucket --help
```

Or get detailed help for a specific command:

```bash
mcp-atlassian-bitbucket ls-workspaces --help
mcp-atlassian-bitbucket get-workspace --help
mcp-atlassian-bitbucket ls-repos --help
mcp-atlassian-bitbucket get-repo --help
mcp-atlassian-bitbucket ls-prs --help
mcp-atlassian-bitbucket get-pr --help
mcp-atlassian-bitbucket ls-pr-comments --help
mcp-atlassian-bitbucket create-pr-comment --help
mcp-atlassian-bitbucket create-pr --help
mcp-atlassian-bitbucket search --help
mcp-atlassian-bitbucket get-commit-history --help
```

---

# License

[ISC License](https://opensource.org/licenses/ISC)
