# MCP (Model Context Protocol) Integration Guide

## Overview

The Model Context Protocol (MCP) is an open protocol that standardizes how applications provide context to Large Language Models (LLMs). In xFunnel, MCP is used to integrate Claude AI for intelligent content processing and editing capabilities.

## What is MCP?

MCP is a protocol that enables:
- **Standardized Context Sharing**: Consistent way to share application context with AI models
- **Tool Integration**: Allow AI models to use specific tools and APIs
- **Secure Communication**: Encrypted channels between applications and AI services
- **Stateful Interactions**: Maintain context across multiple AI interactions

## MCP Architecture in xFunnel

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   xFunnel   │────▶│ MCP Servers │────▶│  Claude AI  │
│     App     │     │             │     │   Engine    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                    │                    │
       │                    ▼                    │
       │            ┌─────────────┐             │
       └───────────▶│     n8n     │◀────────────┘
                    │  Workflows  │
                    └─────────────┘
```

## MCP Servers Used

### 1. Context7 Server

**Purpose**: Document and content retrieval system

**Key Features**:
- Library documentation access
- Content versioning support
- Topic-based retrieval
- Token-optimized responses

**Usage in xFunnel**:
```javascript
// Example: Loading article content
const context7Tools = {
  'resolve-library-id': {
    libraryName: 'article-source'
  },
  'get-library-docs': {
    context7CompatibleLibraryID: '/org/project',
    tokens: 10000,
    topic: 'specific-topic'
  }
};
```

### 2. TaskMaster AI Server

**Purpose**: Task management and content processing

**Key Features**:
- Project initialization
- Task creation and management
- Research capabilities
- Content editing workflows

**Usage in xFunnel**:
```javascript
// Example: Content editing workflow
const taskMasterTools = {
  'initialize_project': {
    projectRoot: '/tmp/edit-session',
    skipInstall: true
  },
  'add_task': {
    prompt: 'Edit content according to user instructions',
    priority: 'high'
  },
  'research': {
    query: 'Additional context needed',
    detailLevel: 'high'
  }
};
```

## Implementation Details

### 1. MCP Client Setup

```typescript
// lib/mcp/client.ts
import { MCPClient } from '@modelcontextprotocol/sdk';

export class XFunnelMCPClient {
  private context7Client: MCPClient;
  private taskMasterClient: MCPClient;

  constructor() {
    this.context7Client = new MCPClient({
      server: 'context7',
      apiKey: process.env.MCP_CONTEXT7_API_KEY
    });

    this.taskMasterClient = new MCPClient({
      server: 'taskmaster-ai',
      apiKey: process.env.MCP_TASKMASTER_API_KEY
    });
  }

  async loadContent(source: string, topic: string) {
    // Implementation for content loading
  }

  async processEdit(content: string, instructions: string) {
    // Implementation for content editing
  }
}
```

### 2. Workflow Integration

```typescript
// lib/workflows/content-edit.ts
export async function executeContentEditWorkflow({
  articleSource,
  articleTopic,
  editInstructions,
  sessionId
}) {
  // Step 1: Load article
  const article = await mcpClient.loadContent(articleSource, articleTopic);
  
  // Step 2: Process edits
  const edited = await mcpClient.processEdit(article.content, editInstructions);
  
  // Step 3: Get user confirmation
  const confirmed = await getUserConfirmation(edited);
  
  // Step 4: Send webhook
  if (confirmed) {
    await sendWebhookNotification({
      sessionId,
      original: article.content,
      edited: edited.content,
      status: 'approved'
    });
  }
}
```

### 3. API Route Example

```typescript
// app/api/mcp/edit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { executeContentEditWorkflow } from '@/lib/workflows/content-edit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { articleSource, articleTopic, editInstructions } = body;
    
    const sessionId = crypto.randomUUID();
    
    const result = await executeContentEditWorkflow({
      articleSource,
      articleTopic,
      editInstructions,
      sessionId
    });
    
    return NextResponse.json({ success: true, sessionId, result });
  } catch (error) {
    return NextResponse.json(
      { error: 'Workflow execution failed' },
      { status: 500 }
    );
  }
}
```

## Configuration

### Environment Variables

```bash
# Required for MCP integration
MCP_CONTEXT7_API_KEY=your-context7-key
MCP_TASKMASTER_API_KEY=your-taskmaster-key

# Optional MCP configuration
MCP_TIMEOUT=30000  # Request timeout in ms
MCP_RETRY_COUNT=3  # Number of retries on failure
MCP_LOG_LEVEL=info # Logging level (debug, info, warn, error)
```

### MCP Server Configuration

Create `.mcp/config.json` in your project root:

```json
{
  "servers": {
    "context7": {
      "endpoint": "https://api.context7.com/mcp",
      "version": "1.0",
      "capabilities": ["retrieve", "search"]
    },
    "taskmaster-ai": {
      "endpoint": "https://api.taskmaster.ai/mcp",
      "version": "1.0",
      "capabilities": ["task", "research", "edit"]
    }
  },
  "security": {
    "encryption": "TLS_1_3",
    "authentication": "api_key"
  }
}
```

## Usage Examples

### 1. Simple Content Edit

```typescript
// Simple content editing
const result = await fetch('/api/mcp/edit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    articleSource: 'blog-posts',
    articleTopic: 'ai-integration',
    editInstructions: 'Make the content more engaging and add examples'
  })
});
```

### 2. Advanced Workflow with Research

```typescript
// Advanced editing with research
const result = await fetch('/api/mcp/advanced-edit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    articleSource: 'technical-docs',
    articleTopic: 'api-reference',
    editInstructions: 'Update with latest best practices',
    researchQuery: 'Latest API design patterns 2024',
    includeResearch: true
  })
});
```

### 3. Batch Processing

```typescript
// Batch content processing
const results = await fetch('/api/mcp/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jobs: [
      {
        source: 'blog-posts',
        topic: 'tutorial-1',
        instructions: 'Simplify for beginners'
      },
      {
        source: 'blog-posts',
        topic: 'tutorial-2',
        instructions: 'Add code examples'
      }
    ]
  })
});
```

## Best Practices

### 1. Error Handling

Always implement comprehensive error handling:

```typescript
try {
  const result = await mcpClient.processEdit(content, instructions);
} catch (error) {
  if (error.code === 'MCP_TIMEOUT') {
    // Handle timeout
  } else if (error.code === 'MCP_AUTH_FAILED') {
    // Handle authentication failure
  } else {
    // Handle general errors
  }
}
```

### 2. Session Management

Maintain session state for complex workflows:

```typescript
const session = {
  id: crypto.randomUUID(),
  startTime: Date.now(),
  steps: [],
  context: {}
};

// Track each step
session.steps.push({
  name: 'load-content',
  status: 'completed',
  timestamp: Date.now()
});
```

### 3. Rate Limiting

Implement rate limiting to avoid API throttling:

```typescript
import { RateLimiter } from '@/lib/rate-limiter';

const limiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60000 // 1 minute
});

export async function mcpRequest(params) {
  await limiter.checkLimit();
  return mcpClient.request(params);
}
```

### 4. Caching

Cache frequently accessed content:

```typescript
import { cache } from '@/lib/cache';

export async function getCachedContent(source, topic) {
  const cacheKey = `content:${source}:${topic}`;
  
  let content = await cache.get(cacheKey);
  if (!content) {
    content = await mcpClient.loadContent(source, topic);
    await cache.set(cacheKey, content, 3600); // 1 hour TTL
  }
  
  return content;
}
```

## Security Considerations

### 1. API Key Management
- Never expose API keys in client-side code
- Use environment variables for all sensitive data
- Rotate API keys regularly

### 2. Input Validation
- Validate all user inputs before sending to MCP
- Sanitize content to prevent injection attacks
- Implement request size limits

### 3. Access Control
- Implement proper authentication before MCP requests
- Use role-based access for different MCP operations
- Log all MCP interactions for audit trails

### 4. Data Privacy
- Don't send sensitive user data through MCP
- Implement data retention policies
- Ensure GDPR compliance for EU users

## Troubleshooting

### Common Issues

1. **MCP Connection Failed**
   - Check API keys are correctly set
   - Verify network connectivity
   - Ensure MCP servers are accessible

2. **Timeout Errors**
   - Increase timeout values for large content
   - Implement retry logic
   - Consider breaking large requests into smaller chunks

3. **Authentication Failures**
   - Verify API key validity
   - Check key permissions
   - Ensure proper header formatting

### Debug Mode

Enable debug logging for troubleshooting:

```typescript
// Enable debug mode
process.env.MCP_LOG_LEVEL = 'debug';

// Or in code
mcpClient.setLogLevel('debug');
```

### Health Checks

Implement health checks for MCP servers:

```typescript
export async function checkMCPHealth() {
  const checks = {
    context7: await context7Client.ping(),
    taskmaster: await taskMasterClient.ping()
  };
  
  return {
    healthy: Object.values(checks).every(c => c),
    servers: checks
  };
}
```

## Performance Optimization

### 1. Connection Pooling
- Reuse MCP client connections
- Implement connection pooling for high traffic

### 2. Request Batching
- Batch multiple small requests together
- Use bulk operations when available

### 3. Async Processing
- Use background jobs for long-running tasks
- Implement progress tracking for users

### 4. Response Streaming
- Stream large responses instead of loading all at once
- Implement chunked processing for better UX

## Future Enhancements

### Planned Features
1. **Additional MCP Servers**: Integration with more specialized servers
2. **Custom Tools**: Development of xFunnel-specific MCP tools
3. **AI Model Selection**: Support for multiple AI models
4. **Advanced Caching**: Intelligent caching based on usage patterns
5. **Real-time Collaboration**: Multi-user editing with MCP

### Contributing to MCP Integration
If you want to contribute to the MCP integration:
1. Review the MCP specification
2. Test with development MCP servers
3. Submit PRs with comprehensive tests
4. Update documentation for new features

## Resources

- [MCP Official Documentation](https://modelcontextprotocol.io)
- [Claude AI Documentation](https://docs.anthropic.com)
- [xFunnel MCP Examples](https://github.com/xfunnel/mcp-examples)
- [MCP Server Development Guide](https://modelcontextprotocol.io/servers)