# Visual Guide: How the Extension Works

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        VS Code Extension                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐      ┌──────────────────┐      ┌──────────────┐ │
│  │  extension   │─────▶│ GitHub Actions   │─────▶│  Status Bar  │ │
│  │  .ts         │      │  Monitor         │      │  Manager     │ │
│  └──────────────┘      └──────────────────┘      └──────────────┘ │
│                                │                                    │
│                                │                                    │
│                                ▼                                    │
│                        ┌───────────────┐                           │
│                        │  Output       │                           │
│                        │  Channel      │                           │
│                        └───────────────┘                           │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                │ GitHub API Calls
                                ▼
                    ┌───────────────────────┐
                    │   GitHub Actions API  │
                    │                       │
                    │  • Workflow Runs      │
                    │  • Job Details        │
                    │  • Step Information   │
                    └───────────────────────┘
```

## User Interaction Flow

```
1. Extension Activation
   ┌─────────────┐
   │ VS Code     │
   │ Opens       │──▶ Extension activates
   └─────────────┘    │
                      ├─▶ Creates status bar item
                      ├─▶ Initializes monitor
                      └─▶ Starts polling

2. Monitoring Loop (Every 5 minutes by default)
   ┌──────────────┐
   │  Timer Tick  │
   └──────────────┘
          │
          ▼
   ┌──────────────────┐
   │ Query GitHub API │
   │ for workflow runs│
   └──────────────────┘
          │
          ▼
   ┌──────────────────┐
   │ New failure?     │◀───┐
   └──────────────────┘    │ No
          │ Yes             │
          ▼                 │
   ┌──────────────────┐    │
   │ Fetch job details│    │
   └──────────────────┘    │
          │                │
          ▼                │
   ┌──────────────────┐    │
   │ Show notification│    │
   │ Log to output    │    │
   │ Update status bar│    │
   └──────────────────┘    │
          │                │
          └────────────────┘

3. User Response to Notification
   ┌────────────────────┐
   │ Notification       │
   │ "Build Failed"     │
   │                    │
   │ [View Details]     │──▶ Opens webview panel
   │ [Open in Browser]  │──▶ Opens GitHub.com
   └────────────────────┘
```

## Status Bar States

```
┌─────────────────────────────────────────────┐
│ Idle State                                  │
│ $(github) GitHub Actions                    │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Loading State                               │
│ $(sync~spin) Checking GitHub Actions...    │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Success State                               │
│ $(check) All checks passing                 │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Error State (Red Background)                │
│ $(error) Build failing: CI Build            │
└─────────────────────────────────────────────┘
```

## Webview Panel Layout

```
┌───────────────────────────────────────────────────────┐
│ Failed: CI Build                              [X]     │
├───────────────────────────────────────────────────────┤
│                                                       │
│  Workflow Failed: CI Build                           │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │ Branch: main                                 │    │
│  │ Commit: Fix authentication bug               │    │
│  │ Time: 2/14/2026, 2:30:00 PM                 │    │
│  │ [View on GitHub →]                          │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  Failed Jobs                                          │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │ Build and Test                               │    │
│  │ Status: failure                              │    │
│  │ • Step 3: Run tests - failure                │    │
│  │ • Step 4: Upload coverage - skipped          │    │
│  │ [View Job →]                                │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │ Lint                                         │    │
│  │ Status: failure                              │    │
│  │ • Step 2: Run ESLint - failure               │    │
│  │ [View Job →]                                │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
└───────────────────────────────────────────────────────┘
```

## Output Channel Format

```
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

## Command Palette Integration

```
┌─────────────────────────────────────────────┐
│ > GitHub Actions:                           │
├─────────────────────────────────────────────┤
│  GitHub Actions: Check Status               │
│  GitHub Actions: Configure                  │
│  GitHub Actions: Show Recent Failures       │
└─────────────────────────────────────────────┘
```

## Settings UI

```
┌─────────────────────────────────────────────┐
│ User Settings                               │
├─────────────────────────────────────────────┤
│ GitHub Actions Monitor                      │
│                                             │
│ Enabled                        ☑            │
│ Enable automatic monitoring                 │
│                                             │
│ Notify On Failure              ☑            │
│ Show notifications when workflows fail      │
│                                             │
│ Poll Interval                  300          │
│ Polling interval in seconds                 │
│                                             │
│ Token                          ••••••••     │
│ GitHub Personal Access Token                │
└─────────────────────────────────────────────┘
```

## Integration with Coding Agents

```
┌──────────────────────────────────────────────────┐
│ Coding Agent Process                             │
├──────────────────────────────────────────────────┤
│                                                  │
│  1. Monitor Output Channel                       │
│     ↓                                            │
│  2. Parse Failure Message                        │
│     ↓                                            │
│  3. Identify Failed Components                   │
│     ↓                                            │
│  4. Analyze Codebase                             │
│     ↓                                            │
│  5. Suggest Fixes                                │
│     ↓                                            │
│  6. Apply Changes                                │
│     ↓                                            │
│  7. Monitor for Re-run                           │
│                                                  │
└──────────────────────────────────────────────────┘

Example: Reading the output channel programmatically

const channel = vscode.window.createOutputChannel('GitHub Actions Failures');
// Extension writes structured data here
// Agent parses and acts on failures
```

## Data Flow Diagram

```
┌─────────┐         ┌──────────┐         ┌────────────┐
│ GitHub  │────1───▶│ Extension│────2───▶│ Status Bar │
│ Actions │         │          │         └────────────┘
│   API   │         │          │
└─────────┘         │          │         ┌────────────┐
                    │          │────3───▶│ Notification│
                    │          │         └────────────┘
                    │          │
                    │          │         ┌────────────┐
                    │          │────4───▶│   Output   │
                    │          │         │  Channel   │
                    │          │         └────────────┘
                    │          │              │
                    └──────────┘              │
                                              ▼
                                        ┌────────────┐
                                        │   Coding   │
                                        │   Agent    │
                                        └────────────┘

1. Poll for workflow runs
2. Update visual status
3. Show failure notification
4. Log detailed context
```

## Quick Reference

### For Users
- **Install**: F5 in VS Code or install VSIX
- **Configure**: Cmd+Shift+P → "GitHub Actions: Configure"
- **Check Status**: Click status bar or run command
- **View History**: "Show Recent Failures" command

### For Developers
- **Build**: `npm run compile`
- **Lint**: `npm run lint`
- **Watch**: `npm run watch`
- **Package**: `vsce package`

### For Coding Agents
- **Monitor**: Output channel "GitHub Actions Failures"
- **Format**: Structured text with timestamps
- **Trigger**: Automatic on each failure
- **Access**: Via VS Code Output API

## Example Workflow

```
Morning:
1. Open VS Code
2. Extension checks GitHub Actions
3. Notification: "Build failed overnight"
4. Click "View Details"
5. See: "Test failed in authentication.test.ts"
6. Fix the test
7. Push changes
8. Extension monitors new run
9. Notification: "Build passed!"
```

## Performance Characteristics

```
API Calls:
- Default: 1 call per 5 minutes
- Rate limit: 5,000/hour with token
- Typical usage: ~12 calls/hour

Memory:
- Keeps last 10 failures in memory
- ~1-2 MB footprint
- Output channel: append-only

CPU:
- Idle: negligible
- During check: brief spike
- Polling: minimal impact
```

## Error Handling

```
┌─────────────────┐
│ API Call Failed │
└─────────────────┘
        │
        ▼
┌─────────────────┐    Yes   ┌──────────────┐
│ Token Invalid?  │─────────▶│ Show warning │
└─────────────────┘          └──────────────┘
        │ No
        ▼
┌─────────────────┐    Yes   ┌──────────────┐
│ Rate Limited?   │─────────▶│ Wait & retry │
└─────────────────┘          └──────────────┘
        │ No
        ▼
┌─────────────────┐
│ Log error       │
│ Update status   │
└─────────────────┘
```
