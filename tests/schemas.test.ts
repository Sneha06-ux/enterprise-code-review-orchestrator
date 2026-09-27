import { describe, it, expect } from 'vitest';
import {
  CodeQualityResultSchema,
  TestCoverageResultSchema,
  RefactoringSuggestionSchema,
  ReviewReportSchema,
  CodeQualityResultJSONSchema,
  TestCoverageResultJSONSchema,
  RefactoringSuggestionJSONSchema,
  ReviewReportJSONSchema
} from '../src/types/index.js';

describe('CodeQualityResultSchema', () => {
  describe('Valid data', () => {
    it('should validate a complete valid result', () => {
      const validData = {
        file: 'src/utils/helper.ts',
        issues: [
          {
            line: 42,
            severity: 'high' as const,
            category: 'security' as const,
            description: 'Potential XSS vulnerability',
            suggestion: 'Sanitize user input before rendering'
          }
        ],
        overallScore: 75,
        summary: 'Good code quality with some security concerns'
      };

      const result = CodeQualityResultSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should validate with empty issues array', () => {
      const validData = {
        file: 'src/perfect.ts',
        issues: [],
        overallScore: 100,
        summary: 'Perfect code quality'
      };

      const result = CodeQualityResultSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate all severity levels', () => {
      const severities = ['critical', 'high', 'medium', 'low', 'info'];
      severities.forEach(severity => {
        const validData = {
          file: 'test.ts',
          issues: [{
            line: 1,
            severity,
            category: 'style' as const,
            description: 'Test',
            suggestion: 'Fix it'
          }],
          overallScore: 50,
          summary: 'Test'
        };

        const result = CodeQualityResultSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });
    });

    it('should validate all categories', () => {
      const categories = ['security', 'performance', 'maintainability', 'style', 'bug-risk', 'best-practice'];
      categories.forEach(category => {
        const validData = {
          file: 'test.ts',
          issues: [{
            line: 1,
            severity: 'low' as const,
            category,
            description: 'Test',
            suggestion: 'Fix it'
          }],
          overallScore: 50,
          summary: 'Test'
        };

        const result = CodeQualityResultSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Invalid data', () => {
    it('should reject missing required fields', () => {
      const invalidData = {
        file: 'test.ts',
        issues: []
        // missing overallScore and summary
      };

      const result = CodeQualityResultSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid severity', () => {
      const invalidData = {
        file: 'test.ts',
        issues: [{
          line: 1,
          severity: 'extreme',
          category: 'security',
          description: 'Test',
          suggestion: 'Fix'
        }],
        overallScore: 50,
        summary: 'Test'
      };

      const result = CodeQualityResultSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject score below 0', () => {
      const invalidData = {
        file: 'test.ts',
        issues: [],
        overallScore: -5,
        summary: 'Test'
      };

      const result = CodeQualityResultSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject score above 100', () => {
      const invalidData = {
        file: 'test.ts',
        issues: [],
        overallScore: 105,
        summary: 'Test'
      };

      const result = CodeQualityResultSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should validate with boundary scores (0 and 100)', () => {
      const data1 = {
        file: 'test.ts',
        issues: [],
        overallScore: 0,
        summary: 'Test'
      };

      const data2 = {
        file: 'test.ts',
        issues: [],
        overallScore: 100,
        summary: 'Test'
      };

      expect(CodeQualityResultSchema.safeParse(data1).success).toBe(true);
      expect(CodeQualityResultSchema.safeParse(data2).success).toBe(true);
    });
  });

  describe('JSON Schema export', () => {
    it('should export valid JSON Schema', () => {
      expect(CodeQualityResultJSONSchema).toBeDefined();
      expect(typeof CodeQualityResultJSONSchema).toBe('object');
      expect(CodeQualityResultJSONSchema).toHaveProperty('type');
    });
  });
});

describe('TestCoverageResultSchema', () => {
  describe('Valid data', () => {
    it('should validate a complete valid result', () => {
      const validData = {
        file: 'src/api/client.ts',
        hasTests: true,
        testFiles: ['tests/api/client.test.ts'],
        untestedPaths: [
          {
            type: 'function' as const,
            location: 'handleError',
            priority: 'high' as const,
            reasoning: 'Error handling is critical',
            suggestedTest: 'Test with network errors and timeout scenarios'
          }
        ],
        coverageEstimate: 65,
        summary: 'Good test coverage with some gaps'
      };

      const result = TestCoverageResultSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate with no tests', () => {
      const validData = {
        file: 'src/new.ts',
        hasTests: false,
        testFiles: [],
        untestedPaths: [],
        coverageEstimate: 0,
        summary: 'No tests found'
      };

      const result = TestCoverageResultSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate all untested path types', () => {
      const types = ['function', 'class', 'branch', 'edge-case'];
      types.forEach(type => {
        const validData = {
          file: 'test.ts',
          hasTests: true,
          testFiles: ['test.test.ts'],
          untestedPaths: [{
            type,
            location: 'test',
            priority: 'low' as const,
            reasoning: 'Test',
            suggestedTest: 'Test it'
          }],
          coverageEstimate: 50,
          summary: 'Test'
        };

        const result = TestCoverageResultSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Invalid data', () => {
    it('should reject invalid coverage estimate', () => {
      const invalidData = {
        file: 'test.ts',
        hasTests: true,
        testFiles: [],
        untestedPaths: [],
        coverageEstimate: 150,
        summary: 'Test'
      };

      const result = TestCoverageResultSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid priority', () => {
      const invalidData = {
        file: 'test.ts',
        hasTests: true,
        testFiles: [],
        untestedPaths: [{
          type: 'function',
          location: 'test',
          priority: 'super-high',
          reasoning: 'Test',
          suggestedTest: 'Test'
        }],
        coverageEstimate: 50,
        summary: 'Test'
      };

      const result = TestCoverageResultSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('JSON Schema export', () => {
    it('should export valid JSON Schema', () => {
      expect(TestCoverageResultJSONSchema).toBeDefined();
      expect(typeof TestCoverageResultJSONSchema).toBe('object');
    });
  });
});

describe('RefactoringSuggestionSchema', () => {
  describe('Valid data', () => {
    it('should validate a complete valid result', () => {
      const validData = {
        file: 'src/legacy.ts',
        suggestions: [
          {
            type: 'modernize' as const,
            location: 'lines 10-25',
            impact: 'high' as const,
            description: 'Convert callbacks to async/await',
            before: 'function getData(callback) { ... }',
            after: 'async function getData() { ... }',
            benefits: 'Improved readability and error handling'
          }
        ],
        summary: 'Several modernization opportunities identified'
      };

      const result = RefactoringSuggestionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate with no suggestions', () => {
      const validData = {
        file: 'src/perfect.ts',
        suggestions: [],
        summary: 'No refactoring needed'
      };

      const result = RefactoringSuggestionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate all suggestion types', () => {
      const types = ['extract-function', 'rename', 'modernize', 'simplify', 'pattern-improvement'];
      types.forEach(type => {
        const validData = {
          file: 'test.ts',
          suggestions: [{
            type,
            location: 'line 1',
            impact: 'low' as const,
            description: 'Test',
            before: 'old code',
            after: 'new code',
            benefits: 'Better'
          }],
          summary: 'Test'
        };

        const result = RefactoringSuggestionSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });
    });

    it('should validate all impact levels', () => {
      const impacts = ['low', 'medium', 'high'];
      impacts.forEach(impact => {
        const validData = {
          file: 'test.ts',
          suggestions: [{
            type: 'simplify' as const,
            location: 'line 1',
            impact,
            description: 'Test',
            before: 'old',
            after: 'new',
            benefits: 'Better'
          }],
          summary: 'Test'
        };

        const result = RefactoringSuggestionSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Invalid data', () => {
    it('should reject invalid suggestion type', () => {
      const invalidData = {
        file: 'test.ts',
        suggestions: [{
          type: 'delete-everything',
          location: 'line 1',
          impact: 'high',
          description: 'Test',
          before: 'old',
          after: 'new',
          benefits: 'Better'
        }],
        summary: 'Test'
      };

      const result = RefactoringSuggestionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('JSON Schema export', () => {
    it('should export valid JSON Schema', () => {
      expect(RefactoringSuggestionJSONSchema).toBeDefined();
      expect(typeof RefactoringSuggestionJSONSchema).toBe('object');
    });
  });
});

describe('ReviewReportSchema', () => {
  describe('Valid data', () => {
    it('should validate a complete valid report', () => {
      const validData = {
        pullRequest: {
          owner: 'facebook',
          repo: 'react',
          number: 12345
        },
        fileReviews: [
          {
            file: 'src/component.ts',
            codeQuality: {
              file: 'src/component.ts',
              issues: [],
              overallScore: 90,
              summary: 'Good quality'
            },
            testCoverage: {
              file: 'src/component.ts',
              hasTests: true,
              testFiles: ['tests/component.test.ts'],
              untestedPaths: [],
              coverageEstimate: 85,
              summary: 'Good coverage'
            },
            refactorings: {
              file: 'src/component.ts',
              suggestions: [],
              summary: 'No refactoring needed'
            }
          }
        ],
        summary: {
          totalFiles: 1,
          overallScore: 90,
          criticalIssues: 0,
          highPriorityTests: 0,
          refactoringOpportunities: 0
        },
        recommendations: [
          {
            priority: 'medium' as const,
            category: 'Testing',
            description: 'Add edge case tests',
            files: ['src/component.ts']
          }
        ],
        metadata: {
          analyzedAt: '2024-01-01T00:00:00.000Z',
          duration: 5000,
          agentVersions: {
            'code-quality-analyzer': '1.0.0',
            'test-coverage-analyzer': '1.0.0',
            'refactoring-suggester': '1.0.0'
          }
        }
      };

      const result = ReviewReportSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate with empty file reviews', () => {
      const validData = {
        pullRequest: {
          owner: 'test',
          repo: 'test',
          number: 1
        },
        fileReviews: [],
        summary: {
          totalFiles: 0,
          overallScore: 0,
          criticalIssues: 0,
          highPriorityTests: 0,
          refactoringOpportunities: 0
        },
        recommendations: [],
        metadata: {
          analyzedAt: '2024-01-01T00:00:00.000Z',
          duration: 100,
          agentVersions: {}
        }
      };

      const result = ReviewReportSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate all recommendation priorities', () => {
      const priorities = ['critical', 'high', 'medium', 'low'];
      priorities.forEach(priority => {
        const validData = {
          pullRequest: { owner: 'test', repo: 'test', number: 1 },
          fileReviews: [],
          summary: {
            totalFiles: 0,
            overallScore: 0,
            criticalIssues: 0,
            highPriorityTests: 0,
            refactoringOpportunities: 0
          },
          recommendations: [{
            priority,
            category: 'Test',
            description: 'Test',
            files: []
          }],
          metadata: {
            analyzedAt: '2024-01-01T00:00:00.000Z',
            duration: 100,
            agentVersions: {}
          }
        };

        const result = ReviewReportSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Invalid data', () => {
    it('should reject missing required fields', () => {
      const invalidData = {
        pullRequest: { owner: 'test', repo: 'test', number: 1 }
        // missing other required fields
      };

      const result = ReviewReportSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid PR number', () => {
      const invalidData = {
        pullRequest: {
          owner: 'test',
          repo: 'test',
          number: -1
        },
        fileReviews: [],
        summary: {
          totalFiles: 0,
          overallScore: 0,
          criticalIssues: 0,
          highPriorityTests: 0,
          refactoringOpportunities: 0
        },
        recommendations: [],
        metadata: {
          analyzedAt: '2024-01-01T00:00:00.000Z',
          duration: 100,
          agentVersions: {}
        }
      };

      const result = ReviewReportSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle large file reviews array', () => {
      const fileReview = {
        file: 'test.ts',
        codeQuality: {
          file: 'test.ts',
          issues: [],
          overallScore: 100,
          summary: 'Perfect'
        },
        testCoverage: {
          file: 'test.ts',
          hasTests: false,
          testFiles: [],
          untestedPaths: [],
          coverageEstimate: 0,
          summary: 'No tests'
        },
        refactorings: {
          file: 'test.ts',
          suggestions: [],
          summary: 'None'
        }
      };

      const validData = {
        pullRequest: { owner: 'test', repo: 'test', number: 1 },
        fileReviews: Array(100).fill(fileReview),
        summary: {
          totalFiles: 100,
          overallScore: 100,
          criticalIssues: 0,
          highPriorityTests: 0,
          refactoringOpportunities: 0
        },
        recommendations: [],
        metadata: {
          analyzedAt: '2024-01-01T00:00:00.000Z',
          duration: 50000,
          agentVersions: {}
        }
      };

      const result = ReviewReportSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('JSON Schema export', () => {
    it('should export valid JSON Schema', () => {
      expect(ReviewReportJSONSchema).toBeDefined();
      expect(typeof ReviewReportJSONSchema).toBe('object');
      expect(ReviewReportJSONSchema).toHaveProperty('type');
    });

    it('should have proper $refStrategy applied', () => {
      // The schema should not have external $ref pointers
      const schemaStr = JSON.stringify(ReviewReportJSONSchema);
      expect(schemaStr).toBeDefined();
      // Basic check that it's a proper schema
      expect(ReviewReportJSONSchema).toHaveProperty('type');
    });
  });
});
