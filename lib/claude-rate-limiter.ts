// Rate limiter for Claude API requests

interface RateLimiterOptions {
  maxRequestsPerMinute: number;
  maxTokensPerMinute: number;
  maxConcurrentRequests: number;
}

interface RequestInfo {
  timestamp: number;
  tokens: number;
}

export class ClaudeRateLimiter {
  private options: RateLimiterOptions;
  private requests: RequestInfo[] = [];
  private currentConcurrentRequests = 0;
  private tokenUsage: Map<number, number> = new Map();

  constructor(options: Partial<RateLimiterOptions> = {}) {
    this.options = {
      maxRequestsPerMinute: options.maxRequestsPerMinute || 50,
      maxTokensPerMinute: options.maxTokensPerMinute || 40000,
      maxConcurrentRequests: options.maxConcurrentRequests || 5,
    };
  }

  async acquireSlot(estimatedTokens: number = 1000): Promise<void> {
    // Clean up old requests
    this.cleanupOldRequests();

    // Check concurrent requests limit
    while (this.currentConcurrentRequests >= this.options.maxConcurrentRequests) {
      await this.delay(100);
    }

    // Check rate limits
    while (!this.canMakeRequest(estimatedTokens)) {
      const waitTime = this.getWaitTime();
      await this.delay(waitTime);
      this.cleanupOldRequests();
    }

    // Reserve the slot
    this.currentConcurrentRequests++;
    this.requests.push({
      timestamp: Date.now(),
      tokens: estimatedTokens,
    });
  }

  releaseSlot(actualTokens?: number): void {
    this.currentConcurrentRequests = Math.max(0, this.currentConcurrentRequests - 1);
    
    if (actualTokens && this.requests.length > 0) {
      // Update the last request with actual token usage
      const lastRequest = this.requests[this.requests.length - 1];
      lastRequest.tokens = actualTokens;
    }
  }

  private canMakeRequest(estimatedTokens: number): boolean {
    const oneMinuteAgo = Date.now() - 60000;
    const recentRequests = this.requests.filter(r => r.timestamp > oneMinuteAgo);
    
    // Check request count
    if (recentRequests.length >= this.options.maxRequestsPerMinute) {
      return false;
    }

    // Check token usage
    const recentTokens = recentRequests.reduce((sum, r) => sum + r.tokens, 0);
    if (recentTokens + estimatedTokens > this.options.maxTokensPerMinute) {
      return false;
    }

    return true;
  }

  private getWaitTime(): number {
    const oneMinuteAgo = Date.now() - 60000;
    const oldestRelevantRequest = this.requests.find(r => r.timestamp > oneMinuteAgo);
    
    if (!oldestRelevantRequest) {
      return 100; // Default wait time
    }

    // Wait until the oldest request is outside the 1-minute window
    const waitTime = (oldestRelevantRequest.timestamp + 60000) - Date.now();
    return Math.max(100, waitTime);
  }

  private cleanupOldRequests(): void {
    const oneMinuteAgo = Date.now() - 60000;
    this.requests = this.requests.filter(r => r.timestamp > oneMinuteAgo);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get current rate limit status
  getStatus(): {
    requestsInLastMinute: number;
    tokensInLastMinute: number;
    concurrentRequests: number;
    canMakeRequest: boolean;
  } {
    this.cleanupOldRequests();
    
    const oneMinuteAgo = Date.now() - 60000;
    const recentRequests = this.requests.filter(r => r.timestamp > oneMinuteAgo);
    const recentTokens = recentRequests.reduce((sum, r) => sum + r.tokens, 0);

    return {
      requestsInLastMinute: recentRequests.length,
      tokensInLastMinute: recentTokens,
      concurrentRequests: this.currentConcurrentRequests,
      canMakeRequest: this.canMakeRequest(1000),
    };
  }
}

// Global rate limiter instance
export const claudeRateLimiter = new ClaudeRateLimiter();