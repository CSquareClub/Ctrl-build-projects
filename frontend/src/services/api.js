/**
 * API Service - Frontend API client for backend communication
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

class APIClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP Error: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error: ${error.message}`);
      throw error;
    }
  }

  // Health Check
  async healthCheck() {
    return this.request('/api/health');
  }

  // Analyze endpoints
  async analyzeIssue(issueData) {
    return this.request('/api/analyze', {
      method: 'POST',
      body: JSON.stringify(issueData),
    });
  }

  async analyzeBatch(issues) {
    return this.request('/api/analyze/batch', {
      method: 'POST',
      body: JSON.stringify(issues),
    });
  }

  async getPriority(text) {
    return this.request('/api/analyze/priority', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  async getEmbedding(text) {
    return this.request('/api/analyze/embedding', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  // Issues endpoints
  async getIssues() {
    return this.request('/api/issues');
  }

  async getIssue(issueId) {
    return this.request(`/api/issues/${issueId}`);
  }

  async createIssue(issueData) {
    return this.request('/api/issues', {
      method: 'POST',
      body: JSON.stringify(issueData),
    });
  }

  async updateIssue(issueId, issueData) {
    return this.request(`/api/issues/${issueId}`, {
      method: 'PUT',
      body: JSON.stringify(issueData),
    });
  }

  async deleteIssue(issueId) {
    return this.request(`/api/issues/${issueId}`, {
      method: 'DELETE',
    });
  }

  async getIssuesByPriority(priority) {
    return this.request(`/api/issues/priority/${priority}`);
  }

  // Similar endpoints
  async findSimilarIssues(text, topK = 5) {
    return this.request('/api/similar', {
      method: 'POST',
      body: JSON.stringify({ text, top_k: topK }),
    });
  }

  async getSimilarById(issueId, topK = 5) {
    return this.request(`/api/similar/${issueId}?top_k=${topK}`);
  }

  async findSimilarBatch(texts) {
    return this.request('/api/similar/batch', {
      method: 'POST',
      body: JSON.stringify(texts),
    });
  }

  async getIndexInfo() {
    return this.request('/api/similar/index-info');
  }
}

// Create singleton instance
const apiClient = new APIClient();

export default apiClient;
export { APIClient };
