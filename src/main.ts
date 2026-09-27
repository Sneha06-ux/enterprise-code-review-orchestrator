import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { CodeReviewOrchestrator } from './orchestrator.js';
import { ReportGenerator, logger } from './utils/index.js';

// Load environment variables
dotenv.config();

/**
 * Main entry point for the Claude Multi-Agent Code Review System
 * Usage: npm run dev <owner> <repo> <pr-number>
 */
async function main() {
  const [owner, repo, prStr] = process.argv.slice(2);

  // Validate command line arguments
  if (!owner || !repo || !prStr) {
    console.error('Usage: npm run dev <owner> <repo> <pr-number>');
    console.error('Example: npm run dev facebook react 12345');
    process.exit(1);
  }

  // Convert and validate PR number
  const prNumber = parseInt(prStr, 10);
  if (isNaN(prNumber) || prNumber <= 0 || !Number.isInteger(prNumber)) {
    console.error(`Error: PR number must be a positive integer, got: ${prStr}`);
    process.exit(1);
  }

  // Validate authentication
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const hasAwsKeys = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

  if (!hasAnthropicKey && !hasAwsKeys) {
    console.error('Error: Missing authentication credentials');
    console.error('');
    console.error('You must configure ONE of the following:');
    console.error('');
    console.error('Option 1: Anthropic API');
    console.error('  ANTHROPIC_API_KEY=sk-ant-...');
    console.error('');
    console.error('Option 2: AWS Bedrock');
    console.error('  AWS_ACCESS_KEY_ID=...');
    console.error('  AWS_SECRET_ACCESS_KEY=...');
    console.error('  AWS_REGION=us-east-1');
    console.error('');
    process.exit(1);
  }

  // Validate AWS region if using Bedrock
  if (hasAwsKeys && !process.env.AWS_REGION) {
    console.error('Error: AWS_REGION is required when using AWS Bedrock authentication');
    process.exit(1);
  }

  // Log authentication method
  if (hasAwsKeys) {
    console.log('🔐 Using AWS Bedrock authentication');
  } else {
    console.log('🔐 Using Anthropic API authentication');
  }

  // Validate ANTHROPIC_MODEL
  if (!process.env.ANTHROPIC_MODEL) {
    console.error('Error: ANTHROPIC_MODEL environment variable is required');
    console.error('');
    console.error('For Anthropic API:');
    console.error('  ANTHROPIC_MODEL=claude-sonnet-4-5-20250929');
    console.error('');
    console.error('For AWS Bedrock:');
    console.error('  ANTHROPIC_MODEL=us.anthropic.claude-sonnet-4-5-20250929-v1:0');
    console.error('');
    process.exit(1);
  }

  console.log(`📊 Starting review of ${owner}/${repo} PR #${prNumber}`);
  console.log(`🤖 Using model: ${process.env.ANTHROPIC_MODEL}`);

  try {
    // Create orchestrator instance
    const orchestrator = new CodeReviewOrchestrator();

    // Review the pull request
    const report = await orchestrator.reviewPullRequest(owner, repo, prNumber);

    // Generate reports
    const reportGenerator = new ReportGenerator();

    // Create reports directory if it doesn't exist
    const reportsDir = 'reports';
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Generate and save reports
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseFilename = `review-${owner}-${repo}-${prNumber}-${timestamp}`;
    const standardFilename = `${owner}_${repo}_${prNumber}`;

    // JSON report
    const jsonReport = reportGenerator.generateJSONReport(report);
    const jsonPath = path.join(reportsDir, `${baseFilename}.json`);
    const jsonStandardPath = path.join(reportsDir, `${standardFilename}.json`);
    fs.writeFileSync(jsonPath, jsonReport);
    fs.writeFileSync(jsonStandardPath, jsonReport);
    console.log(`📄 JSON report saved to: ${jsonPath}`);
    console.log(`📄 JSON report saved to: ${jsonStandardPath}`);

    // Markdown report
    const markdownReport = reportGenerator.generateMarkdownReport(report);
    const mdPath = path.join(reportsDir, `${baseFilename}.md`);
    const mdStandardPath = path.join(reportsDir, `${standardFilename}.md`);
    fs.writeFileSync(mdPath, markdownReport);
    fs.writeFileSync(mdStandardPath, markdownReport);
    console.log(`📄 Markdown report saved to: ${mdPath}`);
    console.log(`📄 Markdown report saved to: ${mdStandardPath}`);

    // HTML report
    const htmlReport = reportGenerator.generateHTMLReport(report);
    const htmlPath = path.join(reportsDir, `${baseFilename}.html`);
    const htmlStandardPath = path.join(reportsDir, `${standardFilename}.html`);
    fs.writeFileSync(htmlPath, htmlReport);
    fs.writeFileSync(htmlStandardPath, htmlReport);
    console.log(`📄 HTML report saved to: ${htmlPath}`);
    console.log(`📄 HTML report saved to: ${htmlStandardPath}`);

    console.log('');
    console.log('✅ Review complete!');
    console.log(`Overall Score: ${report.summary.overallScore}/100`);
    console.log(`Files Reviewed: ${report.summary.totalFiles}`);
    console.log(`Critical Issues: ${report.summary.criticalIssues}`);

  } catch (error) {
    console.error('❌ Error during code review:');
    if (error instanceof Error) {
      console.error(error.message);
      if (error.stack) {
        logger.error('Stack trace', { stack: error.stack });
      }
    } else {
      console.error(String(error));
    }
    process.exit(1);
  }
}

main();
