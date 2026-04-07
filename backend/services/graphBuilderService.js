function normalizePath(value) {
  return String(value || '')
    .replace(/\\/g, '/')
    .toLowerCase();
}

function basename(path) {
  return normalizePath(path).split('/').pop() || '';
}

function inferImportTargets(file, allFiles) {
  const currentPath = normalizePath(file.path);
  const currentBase = basename(file.path);
  const targets = new Set();

  for (const imported of file.imports || []) {
    const source = normalizePath(imported.source || '');
    if (!source) continue;

    for (const candidate of allFiles) {
      const candidatePath = normalizePath(candidate.path);
      const candidateBase = basename(candidate.path);
      if (candidatePath === currentPath) continue;

      if (
        source.includes(candidateBase.replace(/\.[^.]+$/, '')) ||
        candidatePath.includes(source.replace(/^\.\//, '').replace(/\.[^.]+$/, '')) ||
        candidateBase.replace(/\.[^.]+$/, '') === source.split('/').pop()
      ) {
        targets.add(candidate.path);
      }
    }
  }

  return [...targets];
}

function buildGraphData(analysis) {
  const nodes = [];
  const edges = [];
  const fileLookup = new Map(analysis.files.map((file) => [file.path, file]));
  const seenEdges = new Set();
  const rootFile =
    [...analysis.files]
      .sort((a, b) => (b.finding?.confidence || 0) - (a.finding?.confidence || 0))[0] || null;

  nodes.push({
    id: `issue:${analysis.issue.id}`,
    label: analysis.issue.title,
    type: 'issue',
    status: String(analysis.issue.status || '').toLowerCase() === 'resolved' ? 'resolved' : 'issue',
    severity: analysis.issue.priority,
    rootCause: false,
    affected: true,
    data: analysis.issue,
  });

  for (const file of analysis.files) {
    const isRoot = rootFile?.path === file.path;
    const flowTargets = file.finding?.flowTo || [];
    const hasFlow = Boolean(flowTargets.length);
    const isResolved = String(file.finding?.severity || '').toLowerCase() === 'low' && !isRoot && !hasFlow;
    nodes.push({
      id: `file:${file.path}`,
      label: basename(file.path),
      path: file.path,
      type: 'file',
      status: isRoot ? 'active' : hasFlow ? 'affected' : isResolved ? 'resolved' : 'normal',
      rootCause: isRoot,
      affected: hasFlow,
      confidence: file.finding?.confidence || 0,
      data: file,
    });

    const edgeId = `issue-${analysis.issue.id}-${file.path}`;
    if (!seenEdges.has(edgeId)) {
      edges.push({
        id: edgeId,
        source: `issue:${analysis.issue.id}`,
        target: `file:${file.path}`,
        type: isRoot ? 'root-cause' : 'issue-relationship',
        active: isRoot,
        label: isRoot ? 'root cause' : 'related',
      });
      seenEdges.add(edgeId);
    }
  }

  for (const file of analysis.files) {
    const importTargets = inferImportTargets(file, analysis.files);
    importTargets.forEach((targetPath) => {
      const edgeId = `import-${file.path}-${targetPath}`;
      if (seenEdges.has(edgeId)) return;
      edges.push({
        id: edgeId,
        source: `file:${file.path}`,
        target: `file:${targetPath}`,
        type: 'import',
        active: false,
        label: 'imports',
      });
      seenEdges.add(edgeId);
    });

    (file.finding?.flowTo || []).forEach((targetPath) => {
      if (fileLookup.has(targetPath)) {
        const edgeId = `flow-${file.path}-${targetPath}`;
        if (seenEdges.has(edgeId)) return;
        edges.push({
          id: edgeId,
          source: `file:${file.path}`,
          target: `file:${targetPath}`,
          type: 'issue-flow',
          active: true,
          label: 'propagates',
        });
        seenEdges.add(edgeId);
      }
    });
  }

  return {
    nodes,
    edges,
    meta: {
      rootNodeId: rootFile ? `file:${rootFile.path}` : `issue:${analysis.issue.id}`,
      issueNodeId: `issue:${analysis.issue.id}`,
      fileCount: analysis.files.length,
      edgeCount: edges.length,
    },
  };
}

module.exports = {
  buildGraphData,
};
