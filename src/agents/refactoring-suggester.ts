import { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { REFACTORING_SUGGESTER_PROMPT } from '../prompts/index.js';

/**
 * Refactoring Suggester Agent
 * Recommends code improvements and refactoring opportunities
 */
export const refactoringSuggester: AgentDefinition = {
  description: 'Suggests refactoring opportunities and code improvements',
  prompt: REFACTORING_SUGGESTER_PROMPT,
  model: 'inherit',
  tools: ['Read', 'Grep', 'Glob', 'Skill']
};
