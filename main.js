function convertJsToPython(jsCode) {
  return jsCode
    .replace(/console\.log\(/g, 'print(')
    .replace(/\btrue\b/g, 'True')
    .replace(/\bfalse\b/g, 'False')
    .replace(/\bnull\b/g, 'None')
    .replace(/\bconst\b|\blet\b|\bvar\b/g, '')
    .replace(/;+/g, '')
    .replace(/===/g, '==')
    .replace(/!==/g, '!=')
    .replace(/else if\s*\((.*?)\)\s*{/g, 'elif $1:')
    .replace(/if\s*\((.*?)\)\s*{/g, 'if $1:')
    .replace(/else\s*{/g, 'else:')
    .replace(/while\s*\((.*?)\)\s*{/g, 'while $1:')
    .replace(/for\s*\((.*?);(.*?);(.*?)\)\s*{/g, '# for loop too complex to auto-convert')
    .replace(/function\s+(\w+)\s*\((.*?)\)\s*{/g, 'def $1($2):')
    .replace(/\/\/(.*)/g, '# $1')
    .replace(/{/g, '')
    .replace(/}/g, '')
    .replace(/\.push\(/g, '.append(')
    .trim();
}

document.getElementById('convertBtn').addEventListener('click', () => {
  const jsCode = document.getElementById('jsInput').value;
  const pyCode = convertJsToPython(jsCode);
  document.getElementById('pyOutput').textContent = pyCode || '(No code entered)';
});
