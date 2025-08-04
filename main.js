// Get DOM elements
const jsInput = document.getElementById("jsInput");
const convertBtn = document.getElementById("convertBtn");
const pyOutput = document.getElementById("pyOutput");

function jsToPy(jsCode) {
  // Preprocess common patterns
  jsCode = jsCode
    // Convert comments
    .replace(/\/\/(.*)/g, '#$1')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Replace operators and keywords
    .replace(/===/g, '==').replace(/!==/g, '!=')
    .replace(/&&/g, ' and ').replace(/\|\|/g, ' or ')
    .replace(/\btrue\b/gi, 'True').replace(/\bfalse\b/gi, 'False')
    .replace(/\bnull\b/g, 'None').replace(/\bundefined\b/g, 'None')
    // Console and declaration keywords
    .replace(/console\.log/g, 'print').replace(/console\.error/g, 'print')
    .replace(/\b(let|const|var)\s+/g, '')
    // Remove trailing semicolons
    .replace(/;\s*$/gm, '');

  let lines = jsCode.split(/\r?\n/);
  let pyLines = [], indent = 0;

  lines.forEach((origLine) => {
    let l = origLine.trim();
    if (!l) { 
      pyLines.push(''); 
      return; 
    }

    // Combined '} catch (e) {' -> 'except'
    let mCatch = l.match(/^\}\s*catch\s*\(\s*(\w+)\s*\)\s*\{$/);
    if (mCatch) {
      indent = Math.max(indent-1, 0);
      pyLines.push('    '.repeat(indent) + `except Exception as ${mCatch[1]}:`);
      indent++;
      return;
    }
    // Combined '} else {' -> 'else:'
    let mElse = l.match(/^\}\s*else\s*\{$/);
    if (mElse) {
      indent = Math.max(indent-1, 0);
      pyLines.push('    '.repeat(indent) + 'else:');
      indent++;
      return;
    }

    // Template literals to f-strings
    if (l.includes('`')) {
      l = l.replace(/`([^`]*)`/g, (m, grp) => {
        // Convert `${expr}` to `{expr}`
        let inner = grp.replace(/\$\{([^}]+)\}/g, '{$1}');
        return `f"${inner}"`;
      });
    }
    // this. -> self.
    l = l.replace(/\bthis\./g, 'self.');

    // Single 'catch'
    let singleCatch = l.match(/^catch\s*\(\s*(\w+)\s*\)\s*\{$/);
    if (singleCatch) {
      pyLines.push('    '.repeat(indent) + `except Exception as ${singleCatch[1]}:`);
      indent++;
      return;
    }
    // try { 
    if (/^try\s*\{/.test(l)) {
      pyLines.push('    '.repeat(indent) + 'try:');
      indent++;
      return;
    }
    // if (...) {
    let mIf = l.match(/^if\s*\((.*)\)\s*\{$/);
    if (mIf) {
      pyLines.push('    '.repeat(indent) + `if ${mIf[1]}:`);
      indent++;
      return;
    }
    // async function
    let mAsync = l.match(/^async function\s+(\w+)\s*\(([^)]*)\)\s*\{$/);
    if (mAsync) {
      pyLines.push('    '.repeat(indent) + `async def ${mAsync[1]}(${mAsync[2]}):`);
      indent++;
      return;
    }
    // function declaration
    let mFunc = l.match(/^function\s+(\w+)\s*\(([^)]*)\)\s*\{$/);
    if (mFunc) {
      pyLines.push('    '.repeat(indent) + `def ${mFunc[1]}(${mFunc[2]}):`);
      indent++;
      return;
    }
    // class declaration
    let mClass = l.match(/^class\s+(\w+)/);
    if (mClass) {
      pyLines.push('    '.repeat(indent) + `class ${mClass[1]}:`);
      indent++;
      return;
    }
    // method in class or object (including constructor)
    let mMethod = l.match(/^(\w+)\s*\(([^)]*)\)\s*\{$/);
    if (mMethod) {
      let name = mMethod[1], params = mMethod[2];
      if (name === 'constructor') {
        // constructor -> __init__
        name = '__init__';
        pyLines.push('    '.repeat(indent) + (params ? 
            `def ${name}(self, ${params}):` :
            `def ${name}(self):`));
      } else {
        if (!l.startsWith('if') && !l.startsWith('for') && !l.startsWith('while')) {
          pyLines.push('    '.repeat(indent) + (params ? 
              `def ${name}(self, ${params}):` :
              `def ${name}(self):`));
        }
      }
      indent++;
      return;
    }
    // standalone else
    if (l.startsWith('else')) {
      indent = Math.max(indent-1, 0);
      let l2 = l.replace('else {', 'else:');
      pyLines.push('    '.repeat(indent) + l2);
      indent++;
      return;
    }

    // Standalone closing brace
    if (l === '}') {
      indent = Math.max(indent-1, 0);
      return;
    }
    // Arrow function (block body)
    let mArr = l.match(/^(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*\{$/);
    if (mArr) {
      pyLines.push('    '.repeat(indent) + `def ${mArr[1]}(${mArr[2]}):`);
      indent++;
      return;
    }
    // Arrow function (expression)
    let mArrExpr = l.match(/^(\w+)\s*=\s*\(?([^)]*)\)?\s*=>\s*([^;]+)$/);
    if (mArrExpr) {
      pyLines.push('    '.repeat(indent) + 
                  `def ${mArrExpr[1]}(${mArrExpr[2]}): return ${mArrExpr[3].trim()}`);
      return;
    }
    // Object destructuring
    let mObj = l.match(/^\{([^}]+)\}\s*=\s*(.+)$/);
    if (mObj) {
      let vars = mObj[1].split(',').map(v => v.trim());
      let obj = mObj[2].trim();
      // If RHS is a literal {a:1, b:2}, convert to Python dict literal for use
      if (/^\{.*\}$/.test(obj)) {
        let inner = obj.slice(1, -1);
        let items = inner.split(',').map(it => it.trim());
        let newItems = items.map(it => {
          let [k,v] = it.split(':').map(x => x.trim());
          return `"${k}": ${v}`;
        });
        obj = `{${newItems.join(', ')}}`;
      }
      vars.forEach(v => {
        pyLines.push('    '.repeat(indent) + `${v} = ${obj}['${v}']`);
      });
      return;
    }
    // Array destructuring
    let mArrDes = l.match(/^\[([^\]]+)\]\s*=\s*(.+)$/);
    if (mArrDes) {
      let vars = mArrDes[1].split(',').map(v => v.trim());
      let arr = mArrDes[2].trim();
      pyLines.push('    '.repeat(indent) + `${vars.join(', ')} = ${arr}`);
      return;
    }
    // for-of loop
    let mFor = l.match(/^for\s*\(\s*(\w+)\s+of\s+(.+)\)$/);
    if (mFor) {
      pyLines.push('    '.repeat(indent) + `for ${mFor[1]} in ${mFor[2]}:`);
      indent++;
      return;
    }
    // while loop
    if (l.startsWith('while')) {
      pyLines.push('    '.repeat(indent) + l + ':');
      indent++;
      return;
    }

    // Default: copy the line (with indent)
    pyLines.push('    '.repeat(indent) + l);
  });

  return pyLines.join('\n');
}

// Event listener
convertBtn.addEventListener("click", () => {
  const jsCode = jsInput.value;
  const pyCode = jsToPy(jsCode);
  pyOutput.textContent = pyCode;
});
