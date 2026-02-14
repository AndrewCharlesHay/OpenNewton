# Changelog

All notable changes to the "GitHub Actions Monitor" extension will be documented in this file.

## [0.1.0] - 2026-02-14

### Added
- Initial release of GitHub Actions Monitor extension
- Automatic monitoring of GitHub Actions workflows
- Real-time notifications for failed workflow runs
- Detailed failure context with job and step information
- Status bar integration showing current build status
- Command palette commands for manual checks and configuration
- Output channel logging for coding agent integration
- Webview panel for detailed failure analysis
- Configuration options for polling interval and notifications
- Support for GitHub Personal Access Token authentication
- Recent failures quick pick menu
- Comprehensive documentation and examples

### Features
- Monitors workflow runs via GitHub API
- Detects new failures based on workflow run IDs
- Provides rich failure context including:
  - Workflow name and status
  - Branch and commit information
  - Failed jobs and steps
  - Direct links to GitHub
- Integrates with VS Code's Git extension for repository detection
- Respects GitHub API rate limits with configurable polling
- Works with both public and private repositories (with token)

### Commands
- `GitHub Actions: Check Status` - Manual status check
- `GitHub Actions: Configure` - Configure GitHub token
- `GitHub Actions: Show Recent Failures` - View failure history

### Configuration
- `githubActionsMonitor.token` - GitHub Personal Access Token
- `githubActionsMonitor.pollInterval` - Polling interval in seconds
- `githubActionsMonitor.enabled` - Enable/disable monitoring
- `githubActionsMonitor.notifyOnFailure` - Enable/disable notifications
