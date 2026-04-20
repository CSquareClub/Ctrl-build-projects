const axios = require('axios');

class GithubService {
  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Accept: 'application/vnd.github.v3+json',
      }
    });

    if (process.env.GITHUB_TOKEN) {
      this.client.defaults.headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    }
  }

  async fetchIssue(owner, repo, issueNumber) {
    try {
      const [issueRes, commentsRes] = await Promise.all([
        this.client.get(`/repos/${owner}/${repo}/issues/${issueNumber}`),
        this.client.get(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`)
      ]);

      const issue = issueRes.data;
      const comments = commentsRes.data.map(c => ({
        author: c.user.login,
        body: c.body,
        createdAt: c.created_at
      }));

      return {
        id: `${owner}/${repo}#${issueNumber}`,
        repo: `${owner}/${repo}`,
        number: issueNumber,
        title: issue.title,
        body: issue.body || 'No description provided.',
        author: issue.user.login,
        state: issue.state,
        labels: issue.labels.map(l => l.name),
        createdAt: new Date(issue.created_at),
        commentsData: comments
      };
    } catch (error) {
      console.error('Error fetching issue from GitHub:', error.message);
      if (error.response && error.response.status === 404) {
        throw new Error('Issue not found on GitHub.');
      } else if (error.response && error.response.status === 403) {
        throw new Error('GitHub API rate limit exceeded. Please add GITHUB_TOKEN to .env');
      }
      throw error;
    }
  }
}

module.exports = new GithubService();
