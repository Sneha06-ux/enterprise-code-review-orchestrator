import { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { CODE_QUALITY_ANALYZER_PROMPT } from '../prompts/index.js';

/**
 * Code Quality Analyzer Agent
 * Identifies code quality issues, security vulnerabilities, and best practice violations
 */
export const codeQualityAnalyzer: AgentDefinition = {
  description: 'Analyzes code quality, security, performance, and best practices',
  prompt: CODE_QUALITY_ANALYZER_PROMPT,
  model: 'inherit',
  tools: ['Read', 'Grep', 'Glob', 'Skill']
};
