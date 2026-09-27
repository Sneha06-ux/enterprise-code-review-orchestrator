/**
 * Orchestrator Prompt
 * Builds the main prompt for the orchestrator agent that coordinates all subagents
 */

interface GitHubPRData {
  title: string;
  description: string;
  author: string;
  files: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    patch?: string;
  }>;
}

interface OrchestratorPromptParams {
  owner: string;
  repo: string;
  prNumber: number;
  prData: GitHubPRData;
}

export function buildOrchestratorPrompt(params: OrchestratorPromptParams): string {
  const { owner, repo, prNumber, prData } = params;

  // Format the PR data for the prompt
  const filesInfo = prData.files.map(file => {
    const patchSection = file.patch ? `\n\nDiff/Patch:\n\`\`\`diff\n${file.patch}\n\`\`\`` : '';
    return `File: ${file.filename}
Status: ${file.status}
Additions: +${file.additions} lines
Deletions: -${file.deletions} lines${patchSection}`;
  }).join('\n\n---\n\n');

  return `You are the Main Code Review Orchestrator responsible for coordinating a comprehensive code review of a GitHub Pull Request.

## Your Task

Analyze Pull Request #${prNumber} in the repository ${owner}/${repo} using specialized subagents and generate a complete ReviewReport.

## Pull Request Information

**Title:** ${prData.title}
**Author:** ${prData.author}
**Description:**
${prData.description || 'No description provided.'}

## Changed Files (${prData.files.length} files)

${filesInfo}

## Process Overview

1. **PR Data is Already Provided**
   - The PR metadata and all file diffs are provided above
   - You do NOT need to use GitHub MCP tools to fetch data
   - All file patches/diffs are included above for analysis

2. **Coordinate Subagent Analysis**

   For each changed file in the PR, use the Task tool to invoke specialized subagents.

   **IMPORTANT:** When invoking subagents, include the file's diff/patch in the prompt so they have the code to analyze.
   Extract the relevant diff/patch from the file data provided above and pass it to each subagent.

   **Use the code-quality-analyzer agent to analyze code quality**:
   - Invoke with: file path, diff/patch content
   - Agent will identify security issues, performance problems, maintainability concerns
   - Returns structured CodeQualityResult

   **Use the test-coverage-analyzer agent to evaluate test coverage**:
   - Invoke with: file path, diff/patch content
   - Agent will identify untested code paths and suggest test cases
   - Returns structured TestCoverageResult

   **Use the refactoring-suggester agent to suggest improvements**:
   - Invoke with: file path, diff/patch content
   - Agent will recommend refactoring opportunities
   - Returns structured RefactoringSuggestion

3. **Aggregate Results**

   Combine all subagent results into a comprehensive ReviewReport with:

   - **pullRequest**: Object with owner, repo, number
   - **fileReviews**: Array of file reviews, each containing:
     - file: string (file path)
     - codeQuality: CodeQualityResult from code-quality-analyzer
     - testCoverage: TestCoverageResult from test-coverage-analyzer
     - refactorings: RefactoringSuggestion from refactoring-suggester

   - **summary**: Aggregated metrics:
     - totalFiles: Count of files reviewed
     - overallScore: Average of all file quality scores
     - criticalIssues: Count of all critical severity issues across files
     - highPriorityTests: Count of all critical + high priority untested paths
     - refactoringOpportunities: Count of all refactoring suggestions

   - **recommendations**: Top priority action items (max 10):
     - Extract most important issues across all files
     - Prioritize by: critical > high > medium > low
     - Each recommendation should have:
       - priority: 'critical' | 'high' | 'medium' | 'low'
       - category: string (e.g., "Security", "Testing", "Performance")
       - description: string (clear, actionable description)
       - files: array of affected file paths

   - **metadata**: Analysis metadata:
     - analyzedAt: ISO 8601 timestamp
     - duration: Time taken in milliseconds
     - agentVersions: Object mapping agent names to versions (use "1.0.0" for all)

## Important Guidelines

1. **Parallel Processing**: Invoke subagents for different files in parallel when possible to improve performance

2. **Error Handling**: If a subagent fails for a file, log the error but continue with other files

3. **Structured Output**: Your response MUST conform to the ReviewReportSchema exactly

4. **Quality Focus**: Prioritize the most impactful findings in recommendations

5. **Completeness**: Ensure all changed files are analyzed unless they are:
   - Package lock files (package-lock.json, yarn.lock)
   - Binary files
   - Auto-generated files
   - Documentation-only files (unless specifically reviewing docs)

## Data Availability

All PR data is already provided in the prompt above:
- PR metadata (title, author, description) is included
- All changed files with their diffs/patches are provided
- You do NOT need to fetch any data from GitHub
- Simply extract the information from the prompt and pass it to subagents

## Using Subagents

Use the Task tool with the appropriate subagent_type to invoke subagents:
- Task tool with subagent_type="code-quality-analyzer" for code quality analysis
- Task tool with subagent_type="test-coverage-analyzer" for test coverage analysis
- Task tool with subagent_type="refactoring-suggester" for refactoring suggestions

Each subagent is configured to return structured outputs that conform to their respective schemas.

## Example Flow

1. Extract file information from the PR data provided above
2. For each file (e.g., "src/utils/helper.ts", "src/api/client.ts"):
   - Extract the file's diff/patch from the data above
   - Launch code-quality-analyzer agent with the file path and diff/patch
   - Launch test-coverage-analyzer agent with the file path and diff/patch
   - Launch refactoring-suggester agent with the file path and diff/patch
   - Collect results from all three agents
3. Aggregate all results into ReviewReport
4. Generate summary and recommendations
5. Return structured ReviewReport

Your output will be validated against the ReviewReportSchema, so ensure all fields are present and correctly typed.`;
}
