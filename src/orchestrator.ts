import { query } from '@anthropic-ai/claude-agent-sdk';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ReviewReport, ReviewReportSchema } from './types/report-types.js';
import { buildOrchestratorPrompt } from './prompts/index.js';
import {
  codeQualityAnalyzer,
  testCoverageAnalyzer,
  refactoringSuggester
} from './agents/index.js';
import { mcpServersConfig } from './config/mcp.config.js';
import { logger, ReviewError, ErrorCodes } from './utils/index.js';

/**
 * GitHub API PR data structure
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

/**
 * Orchestrator configuration options
 */
export interface OrchestratorOptions {
  model?: string;
  timeout?: number;
}

/**
 * Main Code Review Orchestrator
 * Coordinates subagents to analyze pull requests and generate comprehensive reports
 */
export class CodeReviewOrchestrator {
  private model: string;
  private timeout: number;

  constructor(options: OrchestratorOptions = {}) {
    this.model = options.model || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';
    this.timeout = options.timeout || 300000; // 5 minutes default
  }

  /**
   * Get fixture data for airaamane/simple-todo-app PRs
   */
  private getFixturePRData(prNumber: number): GitHubPRData | null {
    const fixtures: Record<number, GitHubPRData> = {
      1: {
        title: 'Add clean code fixture',
        description: 'This PR adds clean, well-structured code for the todo model and service layer.',
        author: 'airaamane',
        files: [
          {
            filename: 'src/models/todo.ts',
            status: 'added',
            additions: 42,
            deletions: 0,
            patch: `@@ -0,0 +1,42 @@
+/**
+ * Todo model representing a task item
+ */
+export interface Todo {
+  id: string;
+  title: string;
+  description?: string;
+  completed: boolean;
+  createdAt: Date;
+  updatedAt: Date;
+  userId: string;
+  priority: 'low' | 'medium' | 'high';
+  tags: string[];
+}
+
+/**
+ * Create a new Todo with default values
+ */
+export function createTodo(
+  title: string,
+  userId: string,
+  options?: Partial<Omit<Todo, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'title'>>
+): Todo {
+  const now = new Date();
+  return {
+    id: generateId(),
+    title,
+    description: options?.description,
+    completed: options?.completed ?? false,
+    createdAt: now,
+    updatedAt: now,
+    userId,
+    priority: options?.priority ?? 'medium',
+    tags: options?.tags ?? []
+  };
+}
+
+function generateId(): string {
+  return \`todo_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
+}`
          },
          {
            filename: 'src/services/todoService.ts',
            status: 'added',
            additions: 68,
            deletions: 0,
            patch: `@@ -0,0 +1,68 @@
+import { Todo, createTodo } from '../models/todo.js';
+
+/**
+ * In-memory storage for todos
+ */
+class TodoService {
+  private todos: Map<string, Todo> = new Map();
+
+  /**
+   * Create a new todo
+   */
+  async create(
+    title: string,
+    userId: string,
+    options?: Partial<Omit<Todo, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'title'>>
+  ): Promise<Todo> {
+    const todo = createTodo(title, userId, options);
+    this.todos.set(todo.id, todo);
+    return todo;
+  }
+
+  /**
+   * Get a todo by ID
+   */
+  async getById(id: string): Promise<Todo | undefined> {
+    return this.todos.get(id);
+  }
+
+  /**
+   * Get all todos for a user
+   */
+  async getByUserId(userId: string): Promise<Todo[]> {
+    return Array.from(this.todos.values())
+      .filter(todo => todo.userId === userId);
+  }
+
+  /**
+   * Update a todo
+   */
+  async update(
+    id: string,
+    updates: Partial<Omit<Todo, 'id' | 'createdAt' | 'userId'>>
+  ): Promise<Todo | undefined> {
+    const todo = this.todos.get(id);
+    if (!todo) {
+      return undefined;
+    }
+
+    const updated = {
+      ...todo,
+      ...updates,
+      updatedAt: new Date()
+    };
+    this.todos.set(id, updated);
+    return updated;
+  }
+
+  /**
+   * Delete a todo
+   */
+  async delete(id: string): Promise<boolean> {
+    return this.todos.delete(id);
+  }
+}
+
+export const todoService = new TodoService();`
          }
        ]
      },
      2: {
        title: 'Add search functionality for todos',
        description: 'Implements search and filtering capabilities for todos with various criteria.',
        author: 'contributor123',
        files: [
          {
            filename: 'src/controllers/searchController.ts',
            status: 'added',
            additions: 52,
            deletions: 0,
            patch: `@@ -0,0 +1,52 @@
+import { Request, Response } from 'express';
+import { searchTodos } from '../utils/searchFilter.js';
+
+/**
+ * Search controller for todo items
+ */
+export class SearchController {
+  /**
+   * Handle search requests
+   */
+  async search(req: Request, res: Response) {
+    try {
+      const query = req.query.q as string;
+      const userId = req.user?.id;
+
+      // Missing input validation - security issue
+      const results = await searchTodos(query, userId);
+
+      // Returning potentially sensitive data without filtering
+      res.json(results);
+    } catch (error) {
+      // Poor error handling - exposing internal details
+      res.status(500).json({ error: error.message });
+    }
+  }
+
+  /**
+   * Advanced search with filters
+   */
+  async advancedSearch(req: Request, res: Response) {
+    const { q, priority, tags, completed } = req.query;
+    const userId = req.user?.id;
+
+    // No rate limiting - performance issue
+    // Inefficient query building
+    let sql = 'SELECT * FROM todos WHERE user_id = ?';
+    const params = [userId];
+
+    // SQL injection vulnerability!
+    if (q) {
+      sql += \` AND (title LIKE '%\${q}%' OR description LIKE '%\${q}%')\`;
+    }
+
+    if (priority) {
+      params.push(priority);
+      sql += ' AND priority = ?';
+    }
+
+    // Missing pagination - could return thousands of records
+    const results = await db.query(sql, params);
+    res.json(results);
+  }
+}`
          },
          {
            filename: 'src/utils/searchFilter.ts',
            status: 'added',
            additions: 45,
            deletions: 0,
            patch: `@@ -0,0 +1,45 @@
+import { Todo } from '../models/todo.js';
+import { todoService } from '../services/todoService.js';
+
+/**
+ * Search todos by query string
+ */
+export async function searchTodos(query: string, userId: string): Promise<Todo[]> {
+  // Missing input validation
+  const allTodos = await todoService.getByUserId(userId);
+
+  // Inefficient filtering - should use database query
+  return allTodos.filter(todo => {
+    const searchText = query.toLowerCase();
+    const titleMatch = todo.title.toLowerCase().includes(searchText);
+    const descMatch = todo.description?.toLowerCase().includes(searchText);
+    return titleMatch || descMatch;
+  });
+}
+
+/**
+ * Filter todos by criteria - needs refactoring
+ */
+export async function filterTodos(
+  userId: string,
+  filters: any  // Poor typing - should use proper interface
+): Promise<Todo[]> {
+  const todos = await todoService.getByUserId(userId);
+
+  // Duplicated filtering logic - should be extracted
+  let results = todos;
+
+  if (filters.priority) {
+    results = results.filter(t => t.priority === filters.priority);
+  }
+
+  if (filters.completed !== undefined) {
+    results = results.filter(t => t.completed === filters.completed);
+  }
+
+  if (filters.tags && filters.tags.length > 0) {
+    results = results.filter(t =>
+      filters.tags.some((tag: string) => t.tags.includes(tag))
+    );
+  }
+
+  return results;
+}`
          }
        ]
      },
      3: {
        title: 'Add premium subscription features',
        description: 'Implements premium subscription handling, authentication middleware, and payment processing.',
        author: 'devuser456',
        files: [
          {
            filename: 'src/services/subscriptionService.ts',
            status: 'added',
            additions: 58,
            deletions: 0,
            patch: `@@ -0,0 +1,58 @@
+import { paymentProcessor } from '../billing/paymentProcessor.js';
+
+interface Subscription {
+  userId: string;
+  plan: 'free' | 'premium' | 'enterprise';
+  status: 'active' | 'cancelled' | 'expired';
+  expiresAt?: Date;
+}
+
+/**
+ * Subscription management service
+ */
+class SubscriptionService {
+  private subscriptions: Map<string, Subscription> = new Map();
+
+  /**
+   * Upgrade user to premium - missing transaction handling
+   */
+  async upgradeToPremium(userId: string, paymentToken: string): Promise<Subscription> {
+    // No validation of payment token
+    // No error handling for failed payments
+    const payment = await paymentProcessor.charge(paymentToken, 999);
+
+    // Race condition - not atomic
+    const existing = this.subscriptions.get(userId);
+    const subscription: Subscription = {
+      userId,
+      plan: 'premium',
+      status: 'active',
+      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
+    };
+
+    this.subscriptions.set(userId, subscription);
+    return subscription;
+  }
+
+  /**
+   * Check if user has premium access - inefficient
+   */
+  async hasPremiumAccess(userId: string): Promise<boolean> {
+    const sub = this.subscriptions.get(userId);
+    if (!sub) return false;
+
+    // Missing status check
+    // Missing expiration check
+    return sub.plan === 'premium' || sub.plan === 'enterprise';
+  }
+
+  /**
+   * Cancel subscription - no refund handling
+   */
+  async cancel(userId: string): Promise<void> {
+    const sub = this.subscriptions.get(userId);
+    if (sub) {
+      sub.status = 'cancelled';
+    }
+  }
+}
+
+export const subscriptionService = new SubscriptionService();`
          },
          {
            filename: 'src/middleware/authMiddleware.ts',
            status: 'added',
            additions: 47,
            deletions: 0,
            patch: `@@ -0,0 +1,47 @@
+import { Request, Response, NextFunction } from 'express';
+import { subscriptionService } from '../services/subscriptionService.js';
+
+/**
+ * Authentication middleware with security issues
+ */
+export async function requireAuth(req: Request, res: Response, next: NextFunction) {
+  const token = req.headers.authorization;
+
+  // Weak token validation
+  if (!token) {
+    return res.status(401).json({ error: 'Unauthorized' });
+  }
+
+  // Synchronous token decoding in async function - should be async
+  // No signature verification!
+  const decoded = Buffer.from(token, 'base64').toString('utf-8');
+  const userData = JSON.parse(decoded);  // Potential JSON.parse error
+
+  req.user = userData;
+  next();
+}
+
+/**
+ * Premium feature gate - needs refactoring
+ */
+export async function requirePremium(req: Request, res: Response, next: NextFunction) {
+  // Missing auth check - assumes requireAuth was called
+  const userId = req.user?.id;
+
+  if (!userId) {
+    return res.status(401).json({ error: 'Unauthorized' });
+  }
+
+  // Inefficient - makes DB call on every request
+  // No caching
+  const hasPremium = await subscriptionService.hasPremiumAccess(userId);
+
+  if (!hasPremium) {
+    // Information disclosure - tells attacker about premium features
+    return res.status(403).json({
+      error: 'Premium subscription required',
+      upgradeUrl: '/subscribe/premium'
+    });
+  }
+
+  next();
+}`
          },
          {
            filename: 'src/billing/paymentProcessor.ts',
            status: 'added',
            additions: 41,
            deletions: 0,
            patch: `@@ -0,0 +1,41 @@
+/**
+ * Payment processing module - CRITICAL SECURITY ISSUES
+ */
+
+interface PaymentResult {
+  success: boolean;
+  transactionId?: string;
+  error?: string;
+}
+
+class PaymentProcessor {
+  private apiKey: string = 'sk_test_1234567890';  // Hardcoded API key!
+
+  /**
+   * Process payment - insecure implementation
+   */
+  async charge(token: string, amount: number): Promise<PaymentResult> {
+    // No amount validation - could charge negative amounts!
+    // No token validation
+
+    try {
+      // Logging sensitive data
+      console.log('Processing payment:', { token, amount });
+
+      // Simulated API call - would be real payment gateway
+      const response = await fetch('https://payment-api.example.com/charge', {
+        method: 'POST',
+        headers: {
+          'Authorization': \`Bearer \${this.apiKey}\`,  // Exposed in logs
+          'Content-Type': 'application/json'
+        },
+        body: JSON.stringify({ token, amount })
+      });
+
+      return { success: true, transactionId: 'txn_' + Date.now() };
+    } catch (error) {
+      // Exposing error details to caller
+      return { success: false, error: error.message };
+    }
+  }
+}
+
+export const paymentProcessor = new PaymentProcessor();`
          }
        ]
      }
    };

    return fixtures[prNumber] || null;
  }

  /**
   * Fetch PR data directly from GitHub API
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param prNumber - Pull request number
   * @returns PR data including files and patches
   */
  private async fetchPRData(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<GitHubPRData> {
    const githubToken = process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = {
      'User-Agent': 'claude-code-review',
      'Accept': 'application/vnd.github.v3+json'
    };

    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }

    try {
      // Fetch PR details
      const prUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
      const prResponse = await fetch(prUrl, { headers });

      if (!prResponse.ok) {
        // Check if this is the airaamane/simple-todo-app repo that's now private/deleted
        if (prResponse.status === 404 && owner === 'airaamane' && repo === 'simple-todo-app') {
          logger.info('Using fixture data for airaamane/simple-todo-app', { prNumber });
          const fixtureData = this.getFixturePRData(prNumber);
          if (fixtureData) {
            return fixtureData;
          }
          throw new Error(`No fixture data available for PR #${prNumber}`);
        }

        throw new Error(`GitHub API error: ${prResponse.status} ${prResponse.statusText}`);
      }

      const prData = await prResponse.json() as any;

      // Fetch changed files
      const filesUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`;
      const filesResponse = await fetch(filesUrl, { headers });

      if (!filesResponse.ok) {
        // Check for fixture fallback on files endpoint too
        if (filesResponse.status === 404 && owner === 'airaamane' && repo === 'simple-todo-app') {
          logger.info('Using fixture data for airaamane/simple-todo-app', { prNumber });
          const fixtureData = this.getFixturePRData(prNumber);
          if (fixtureData) {
            return fixtureData;
          }
          throw new Error(`No fixture data available for PR #${prNumber}`);
        }

        throw new Error(`GitHub API error fetching files: ${filesResponse.status} ${filesResponse.statusText}`);
      }

      const filesData = await filesResponse.json() as any[];

      return {
        title: prData.title || '',
        description: prData.body || '',
        author: prData.user?.login || 'unknown',
        files: filesData.map(file => ({
          filename: file.filename,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
          patch: file.patch
        }))
      };
    } catch (error) {
      logger.error('Failed to fetch PR data from GitHub API', {
        owner,
        repo,
        prNumber,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new ReviewError(
        `Failed to fetch PR data: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCodes.GITHUB_API_FAILED,
        { owner, repo, prNumber }
      );
    }
  }

  /**
   * Review a pull request using parallel subagent analysis
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param prNumber - Pull request number
   * @returns Complete review report
   */
  async reviewPullRequest(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<ReviewReport> {
    const startTime = Date.now();

    logger.info('Starting code review', { owner, repo, prNumber });

    try {
      // Fetch PR data directly from GitHub API
      logger.info('Fetching PR data from GitHub API', { owner, repo, prNumber });
      const prData = await this.fetchPRData(owner, repo, prNumber);
      logger.info('PR data fetched successfully', {
        owner,
        repo,
        prNumber,
        filesCount: prData.files.length
      });

      // Build the orchestrator prompt with the fetched PR data
      const prompt = buildOrchestratorPrompt({ owner, repo, prNumber, prData });

      // Configure the query with all subagents and tools
      const queryGenerator = query({
        prompt,
        options: {
          model: this.model,
          agents: {
            'code-quality-analyzer': codeQualityAnalyzer,
            'test-coverage-analyzer': testCoverageAnalyzer,
            'refactoring-suggester': refactoringSuggester
          },
          allowedTools: ['Task', 'mcp__github__*', 'mcp__eslint__*'],
          mcpServers: mcpServersConfig,
          permissionMode: 'bypassPermissions',
          outputFormat: {
            type: 'json_schema',
            schema: zodToJsonSchema(ReviewReportSchema as any, { $refStrategy: 'root' }) as Record<string, unknown>
          }
        }
      });

      // Iterate through messages to get the final result
      let structuredOutput: unknown = null;
      for await (const message of queryGenerator) {
        // Check if this is a result message with structured output
        if (message.type === 'result' && message.subtype === 'success' && message.structured_output) {
          structuredOutput = message.structured_output;
        }
      }

      if (!structuredOutput) {
        throw new ReviewError(
          'No structured output received from orchestrator',
          ErrorCodes.STRUCTURED_OUTPUT_FAILED,
          { owner, repo, prNumber }
        );
      }

      // Validate the output against the schema
      const validation = ReviewReportSchema.safeParse(structuredOutput);

      if (!validation.success) {
        logger.error('Structured output validation failed', {
          errors: validation.error.errors,
          output: structuredOutput
        });

        throw new ReviewError(
          'Structured output validation failed',
          ErrorCodes.VALIDATION_FAILED,
          {
            errors: validation.error.errors,
            owner,
            repo,
            prNumber
          }
        );
      }

      const report = validation.data;
      const duration = Date.now() - startTime;

      logger.info('Code review completed', {
        owner,
        repo,
        prNumber,
        duration,
        overallScore: report.summary.overallScore,
        totalFiles: report.summary.totalFiles
      });

      return report;

    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Code review failed', {
        owner,
        repo,
        prNumber,
        duration,
        error: error instanceof Error ? error.message : String(error)
      });

      if (error instanceof ReviewError) {
        throw error;
      }

      throw new ReviewError(
        `Code review failed: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCodes.AGENT_FAILED,
        { owner, repo, prNumber, originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }
}
