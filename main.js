// Get DOM elements
const jsInput = document.getElementById("jsInput");
const convertBtn = document.getElementById("convertBtn");
const pyOutput = document.getElementById("pyOutput");

// Conversion logic
function convertJsToPython(jsCode) {
  let py = jsCode;

  // 1. Input handling
  py = py.replace(/parseInt\s*\(\s*prompt\((.*?)\)\s*\)/g, 'int(input($1))');

  // 2. Booleans and null
  py = py.replace(/\btrue\b/gi, 'True');
  py = py.replace(/\bfalse\b/gi, 'False');
  py = py.replace(/\bnull\b/g, 'None');

  // 3. Variable declarations
  py = py.replace(/\b(const|let|var)\b/g, '');

  // 4. Console output
  py = py.replace(/console\.log/g, 'print');

  // 5. Semicolons
  py = py.replace(/;/g, '');

  // 6. If/else
  py = py.replace(/else if\s*\((.*?)\)/g, 'elif $1');
  py = py.replace(/if\s*\((.*?)\)/g, 'if $1');
  py = py.replace(/\belse\b/g, 'else');

  // 7. Function declarations
  py = py.replace(/function\s+(\w+)\s*\((.*?)\)\s*{/g, 'def $1($2):');

  // 8. JS-style for loops → flagged for manual fix
  py = py.replace(/for\s*\((.*?)\)/g, '# [Manual fix needed] for ($1)');

  // 9. Template literals
  py = py.replace(/`([^`$]*)\$\{(.*?)\}([^`]*)`/g, 'f"$1{$2}$3"');

  // 10. Braces
  py = py.replace(/[{}]/g, '');

  // 11. JS-style comments
  py = py.replace(/\/\/(.*)/g, '# $1');

  // 12. Fix spacing from removing braces
  const lines = py.split('\n').map(line => line.trimEnd());
  const indented = [];

  let indentLevel = 0;
  lines.forEach(line => {
    if (line.match(/^elif |^else:|^if |^for |^while |^def /)) {
      indented.push(' '.repeat(indentLevel * 4) + line);
      indentLevel += 1;
    } else if (line === '') {
      indented.push('');
    } else {
      indented.push(' '.repeat(indentLevel * 4) + line);
    }

    // If the next line is outdented (naive handling for end of block)
    if (line.trim().endsWith('break') || line.trim().endsWith('return') || line.trim().startsWith('print')) {
      indentLevel = Math.max(indentLevel - 1, 0);
    }
  });

  return indented.join('\n');
}

// Event listener
convertBtn.addEventListener("click", () => {
  const jsCode = jsInput.value;
  const pyCode = convertJsToPython(jsCode);
  pyOutput.textContent = pyCode;
});
