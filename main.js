const jsInput = document.getElementById("jsInput");
const convertBtn = document.getElementById("convertBtn");
const pyOutput = document.getElementById("pyOutput");

convertBtn.addEventListener("click", () => {
  const jsCode = jsInput.value;

  // Simple (mock) JS ➜ Python conversion
  let pyCode = jsCode
    .replace(/console\.log\((.*?)\)/g, "print($1)")
    .replace(/\bconst\b|\blet\b/g, "") // remove const/let
    .replace(/;/g, "")                 // remove semicolons
    .trim();

  pyOutput.textContent = pyCode || "(No code entered)";
});
