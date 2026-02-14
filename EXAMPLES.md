# Example Usage

This document demonstrates how the GitHub Actions Monitor extension works in practice.

## Scenario 1: First Time Setup

1. **Install and Open Extension**
   - Install the extension in VS Code
   - Open a GitHub repository
   - Extension activates automatically

2. **Configure GitHub Token**
   ```
   Command Palette → "GitHub Actions: Configure"
   → Enter token: ghp_xxxxxxxxxxxx
   → "GitHub token saved successfully"
   ```

3. **Automatic Monitoring Starts**
   - Status bar shows: `$(github) Checking GitHub Actions...`
   - After initial check: `$(check) All checks passing`

## Scenario 2: Workflow Failure Notification

When a workflow fails, the extension:

1. **Detects the Failure**
   ```
   Polling GitHub API...
   → Found new failed run: "CI Build"
   → Fetching job details...
   ```

2. **Shows Notification**
   ```
   [Error Notification]
   GitHub Actions workflow "CI Build" failed
   
   [View Details] [Open in Browser]
   ```

3. **Logs to Output Channel**
   ```
   [Output: GitHub Actions Failures]
   ================================================================================
   [2026-02-14T14:30:00.000Z] GITHUB ACTIONS FAILURE DETECTED
   ================================================================================
   GitHub Actions Failed: CI Build
   
   Branch: main
   Commit: Fix authentication bug
   
   Job: Build and Test
     - Step 3: Run tests - failure
     - Step 4: Upload coverage - skipped
   
   Job: Lint
     - Step 2: Run ESLint - failure
   ================================================================================
   ```

4. **Updates Status Bar**
   ```
   $(error) Build failing: CI Build
   ```

## Scenario 3: Viewing Failure Details

User clicks "View Details":

1. **Webview Panel Opens**
   ```
   [Panel Title: Failed: CI Build]
   
   Workflow Failed: CI Build
   ┌─────────────────────────────────────┐
   │ Branch: main                        │
   │ Commit: Fix authentication bug      │
   │ Time: 2/14/2026, 2:30:00 PM        │
   │ View on GitHub →                    │
   └─────────────────────────────────────┘
   
   Failed Jobs
   
   Build and Test
   Status: failure
   • Step 3: Run tests - failure
   • Step 4: Upload coverage - skipped
   View Job →
   
   Lint
   Status: failure
   • Step 2: Run ESLint - failure
   View Job →
   ```

## Scenario 4: Checking Recent Failures

User runs "GitHub Actions: Show Recent Failures":

```
[Quick Pick Menu]
Select a failed workflow to view details

$(error) CI Build
  main - 2/14/2026, 2:30:00 PM
  Fix authentication bug

$(error) Deploy to Production
  release-v1.2 - 2/14/2026, 1:15:00 PM
  Update deployment configuration

$(error) CI Build
  feature/new-ui - 2/14/2026, 10:45:00 AM
  Add dark mode support
```

## Scenario 5: Manual Status Check

User clicks status bar or runs "GitHub Actions: Check Status":

```
Status bar: $(sync~spin) Checking GitHub Actions...

[After API call]
Status bar: $(check) All checks passing

[Notification]
Latest workflow "CI Build" completed successfully
```

## Configuration Examples

### Example 1: Frequent Checks (CI-heavy project)
```json
{
  "githubActionsMonitor.pollInterval": 120,  // Check every 2 minutes
  "githubActionsMonitor.notifyOnFailure": true
}
```

### Example 2: Less Frequent (Battery saving)
```json
{
  "githubActionsMonitor.pollInterval": 600,  // Check every 10 minutes
  "githubActionsMonitor.notifyOnFailure": true
}
```

### Example 3: Disabled Notifications
```json
{
  "githubActionsMonitor.pollInterval": 300,
  "githubActionsMonitor.notifyOnFailure": false  // Silent monitoring
}
```

## For Coding Agents

Coding agents can monitor the output channel programmatically:

```typescript
// Example: Reading the output channel
const outputChannel = vscode.window.createOutputChannel('GitHub Actions Failures');

// The extension writes structured failure information
// Format:
// - Timestamp
// - Workflow name
// - Branch and commit
// - Failed jobs and steps
// - Links to logs

// Agents can parse this to understand:
// 1. What failed
// 2. Where it failed
// 3. When it failed
// 4. How to access detailed logs
```

## Real-World Integration

### With GitHub Copilot
When a test fails, Copilot can:
1. Read the failure from the output channel
2. Understand which tests failed
3. Analyze the codebase
4. Suggest fixes

### With Custom Scripts
```javascript
// Monitor the output channel file
const fs = require('fs');
const outputPath = '~/.vscode/extensions/.../output';

fs.watch(outputPath, (event) => {
  if (event === 'change') {
    // Parse new failures
    // Trigger automated debugging
    // Create issue tickets
  }
});
```

## Status Bar States

| Icon | Status | Meaning |
|------|--------|---------|
| `$(github)` | Idle | Extension loaded, ready to check |
| `$(sync~spin)` | Loading | Checking status... |
| `$(check)` | Success | All workflows passing |
| `$(error)` | Error | One or more workflows failing |

## Common Workflows

### Morning Routine
1. Open VS Code
2. Extension checks status automatically
3. If failures overnight → notification appears
4. Click "View Details" → see what broke
5. Fix issues → push changes
6. Extension detects new run → monitors progress

### Pull Request Review
1. Checkout PR branch
2. Extension monitors PR's checks
3. If CI fails → immediate notification
4. View failure details in VS Code
5. Fix and push → re-check status

### Release Process
1. Create release branch
2. Extension monitors deployment workflow
3. Any failures → detailed context
4. Review logs without leaving editor
5. Verify all checks pass before merging
