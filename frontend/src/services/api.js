/**
 * API Service - Frontend API client for backend communication
 */

const rawBaseUrl =
  import.meta.env.VITE_API_URL ||
  import.meta.env.REACT_APP_API_URL ||
  "/api";
const API_BASE_URL = rawBaseUrl.replace(/\/$/, "");

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

      const data = await response
        .json()
        .catch(() => ({ error: `HTTP Error: ${response.status}` }));

      if (!response.ok) {
        throw new Error(
          data.detail || data.error || `HTTP Error: ${response.status}`
        );
      }

      return data;
    } catch (error) {
      console.error(`API Error: ${error.message}`);
      throw error;
    }
  }

  // Health Check
  async healthCheck() {
    return this.request('/health');
  }

  // Analyze endpoints
  async analyzeIssue(issueData) {
    return this.request('/analyze/', {
      method: 'POST',
      body: JSON.stringify(issueData),
    });
  }

  async analyzeBatch(issues) {
    return this.request('/analyze/batch', {
      method: 'POST',
      body: JSON.stringify(issues),
    });
  }

  async getPriority(text) {
    return this.request('/analyze/priority', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  async getEmbedding(text) {
    return this.request('/analyze/embedding', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  // Issues endpoints
  async getIssues() {
    return this.request('/issues/');
  }

  async getIssue(issueId) {
    return this.request(`/issues/${issueId}`);
  }

  async createIssue(issueData) {
    return this.request('/issues/', {
      method: 'POST',
      body: JSON.stringify(issueData),
    });
  }

  async updateIssue(issueId, issueData) {
    return this.request(`/issues/${issueId}`, {
      method: 'PUT',
      body: JSON.stringify(issueData),
    });
  }

  async deleteIssue(issueId) {
    return this.request(`/issues/${issueId}`, {
      method: 'DELETE',
    });
  }

  async getIssuesByPriority(priority) {
    return this.request(`/issues/priority/${priority}`);
  }

  // Similar endpoints
  async findSimilarIssues(text, topK = 5) {
    return this.request('/similar/', {
      method: 'POST',
      body: JSON.stringify({ text, top_k: topK }),
    });
  }

  async getSimilarById(issueId, topK = 5) {
    return this.request(`/similar/${issueId}?top_k=${topK}`);
  }

  async findSimilarBatch(texts) {
    return this.request('/similar/batch', {
      method: 'POST',
      body: JSON.stringify(texts),
    });
  }

  async getIndexInfo() {
    return this.request('/similar/index-info');
  }
}

// Create singleton instance
const apiClient = new APIClient();

export default apiClient;
export { APIClient };
