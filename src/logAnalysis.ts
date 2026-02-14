import { Octokit } from '@octokit/rest';

export class LogAnalysis {
    constructor(private octokit: Octokit) {}

    async getFailureContext(owner: string, repo: string, runId: number): Promise<string> {
        try {
            // 1. Get failed jobs
            const { data: jobs } = await this.octokit.actions.listJobsForWorkflowRun({
                owner,
                repo,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                run_id: runId
            });
            
            const failedJob = jobs.jobs.find(j => j.conclusion === 'failure');
            if (!failedJob) {
                return 'No failed job found to analyze.';
            }

            // 2. Download logs for the failed job
            try {
                const response = await this.octokit.actions.downloadJobLogsForWorkflowRun({
                    owner,
                    repo,
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    job_id: failedJob.id,
                });

                // The logs are returned as a string in the data property
                const logContent = String(response.data);
                return `Job: ${failedJob.name}\n\nError Analysis:\n${this.extractError(logContent)}`;
            } catch (error) {
                return `Failed to download logs for job ${failedJob.name}. Error: ${error}`;
            }
        } catch (error) {
            return `Failed to analyze run ${runId}. Error: ${error}`;
        }
    }

    private extractError(log: string): string {
        const lines = log.split('\n');
        
        // Strategy 1: Look for "Error:" patterns
        const errorLines = lines.filter(l => 
            l.match(/error:/i) || 
            l.match(/exception/i) || 
            l.match(/failed/i)
        );

        if (errorLines.length > 0) {
            // Return context around the last few errors
            return errorLines.slice(-10).join('\n');
        }

        // Strategy 2: Return the tail of the log
        return lines.slice(-50).join('\n');
    }
}
