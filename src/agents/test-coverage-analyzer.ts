import { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { TEST_COVERAGE_ANALYZER_PROMPT } from '../prompts/index.js';

/**
 * Test Coverage Analyzer Agent
 * Evaluates test completeness and identifies missing test cases
 */
export const testCoverageAnalyzer: AgentDefinition = {
  description: 'Evaluates test coverage and suggests missing test cases',
  prompt: TEST_COVERAGE_ANALYZER_PROMPT,
  model: 'inherit',
  tools: ['Read', 'Grep', 'Glob', 'Skill']
};
