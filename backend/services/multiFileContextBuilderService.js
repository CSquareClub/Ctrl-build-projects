function buildMultiFileContext({ issue, repository, files, astSummary, issueIntelligence }) {
  const contextFiles = files.slice(0, 5).map((file) => {
    const ast = astSummary.find((entry) => entry.path === file.path);
    return {
      path: file.path,
      filePurpose: file.filePurpose,
      matchedKeyword: file.matchedKeyword,
      matchStrength: file.matchStrength,
      snippetStartLine: file.startLine,
      snippetEndLine: file.endLine,
      imports: ast?.imports || [],
      functions: ast?.functions || [],
      riskyNodes: ast?.riskyNodes || [],
      snippet: String(file.snippet || '').slice(0, 2600),
    };
  });

  return {
    repository,
    issue: {
      id: issue.id,
      title: issue.title,
      summary: issue.summary || issue.description || '',
      priority: issue.priority,
    },
    issueIntelligence: issueIntelligence
      ? {
          severity: issueIntelligence.severity,
          frequency: issueIntelligence.frequency,
          affected_area: issueIntelligence.affected_area,
          probable_context: issueIntelligence.probable_context,
          analytics: issueIntelligence.analytics,
        }
      : null,
    files: contextFiles,
  };
}

module.exports = {
  buildMultiFileContext,
};
