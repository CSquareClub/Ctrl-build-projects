const { parse } = require('@babel/parser');

function walk(node, visitor, parent = null) {
  if (!node || typeof node !== 'object') return;
  visitor(node, parent);

  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const child of value) {
        walk(child, visitor, node);
      }
      continue;
    }

    if (value && typeof value === 'object' && value.type) {
      walk(value, visitor, node);
    }
  }
}

function safeParse(code) {
  return parse(String(code || ''), {
    sourceType: 'unambiguous',
    errorRecovery: true,
    ranges: true,
    plugins: ['jsx', 'typescript'],
  });
}

function getLoc(node) {
  return {
    startLine: node?.loc?.start?.line || 1,
    endLine: node?.loc?.end?.line || node?.loc?.start?.line || 1,
  };
}

function extractFileAstSummary(file) {
  try {
    const ast = safeParse(file.snippet || '');
    const imports = [];
    const functions = [];
    const riskyNodes = [];

    walk(ast, (node, parent) => {
      if (node.type === 'ImportDeclaration') {
        imports.push({
          source: node.source?.value || '',
          startLine: getLoc(node).startLine,
          endLine: getLoc(node).endLine,
        });
      }

      if (
        node.type === 'FunctionDeclaration' ||
        node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression'
      ) {
        const loc = getLoc(node);
        const name =
          node.id?.name ||
          parent?.id?.name ||
          parent?.key?.name ||
          `anonymous_${loc.startLine}`;
        functions.push({
          name,
          async: node.async === true,
          startLine: loc.startLine,
          endLine: loc.endLine,
        });
      }

      if (
        node.type === 'AwaitExpression' ||
        node.type === 'ThrowStatement' ||
        node.type === 'TryStatement' ||
        node.type === 'MemberExpression' ||
        node.type === 'CallExpression'
      ) {
        const calleeName = node.callee?.name || node.callee?.property?.name || '';
        let label = node.type;

        if (node.type === 'CallExpression' && /(fetch|axios|request|query|save|create|update|delete|find|send)/i.test(calleeName)) {
          label = `async-call:${calleeName}`;
        } else if (node.type === 'MemberExpression') {
          label = 'property-access';
        } else if (node.type === 'AwaitExpression') {
          label = 'await';
        }

        riskyNodes.push({
          type: label,
          ...getLoc(node),
        });
      }
    });

    return {
      path: file.path,
      imports: imports.slice(0, 10),
      functions: functions.slice(0, 12),
      riskyNodes: riskyNodes.slice(0, 16),
      parser: 'babel',
    };
  } catch {
    return {
      path: file.path,
      imports: [],
      functions: [],
      riskyNodes: [],
      parser: 'babel-fallback',
    };
  }
}

function extractMultiFileAst(files) {
  return files.map((file) => ({
    ...extractFileAstSummary(file),
    snippetStartLine: file.startLine,
    snippetEndLine: file.endLine,
    filePurpose: file.filePurpose,
  }));
}

module.exports = {
  extractMultiFileAst,
};
