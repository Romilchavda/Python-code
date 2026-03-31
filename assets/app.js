// ==========================================
// FILE: app.js (Monaco Editor, Terminal & Code Runner)
// ==========================================

function formatCode() {
    if (!currentFile || !editor) return;
    let ext = currentFile.split('.').pop(); let content = editor.getValue();
    try {
        let formatted = content;
        if (ext === 'html') formatted = prettier.format(content, { parser: "html", plugins: prettierPlugins });
        else if (ext === 'css') formatted = prettier.format(content, { parser: "css", plugins: prettierPlugins });
        else if (ext === 'js') formatted = prettier.format(content, { parser: "babel", plugins: prettierPlugins });
        else if (ext === 'json') formatted = prettier.format(content, { parser: "json", plugins: prettierPlugins });
        else if (ext === 'py') { printTerm("Auto-format for Python coming soon!", "text-sys"); return; }
        editor.setValue(formatted); printTerm(`✔ ${currentFile} formatted successfully!`, "text-succ");
    } catch (err) { printTerm("❌ Format error: " + err.message, "text-err"); }
}

// --- Monaco Init ---
require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' } });

require(['vs/editor/editor.main'], function() {
    monaco.editor.defineTheme('vs-dark-custom', { base: 'vs-dark', inherit: true, rules: [], colors: { 'editor.background': '#1e1e1e' } });
    Object.keys(files).forEach(f => { monacoModels[f] = monaco.editor.createModel(files[f], getLanguage(f)); });
    
    editor = monaco.editor.create(document.getElementById('editor-container'), {
        theme: 'vs-dark-custom', automaticLayout: true, wordWrap: 'on', fontSize: 14, fontFamily: "'JetBrains Mono', monospace", minimap: { enabled: false },
        suggestSelection: 'first', acceptSuggestionOnEnter: 'on', quickSuggestions: { other: true, comments: false, strings: true }, mouseWheelZoom: true
    });
    
    // 🚀 DYNAMIC SNIPPET INJECTION (Ye code automatically aapke snippets load karega)
    ['html', 'css', 'javascript'].forEach(lang => {
        monaco.languages.registerCompletionItemProvider(lang, {
            provideCompletionItems: function(model, position) {
                let suggestions = [];
                if(userSnippets[lang]) {
                    suggestions = userSnippets[lang].map(snip => {
                        return { label: snip.trigger, kind: monaco.languages.CompletionItemKind.Snippet, documentation: 'Custom Snippet', insertText: snip.code, insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet };
                    });
                }
                return { suggestions: suggestions };
            }
        });
    });
    
    if (currentFile && monacoModels[currentFile]) editor.setModel(monacoModels[currentFile]);
    editor.onDidChangeModelContent(() => { if (currentFile) { files[currentFile] = editor.getValue(); saveState(); } });
    editor.onDidChangeCursorPosition((e) => { document.getElementById("cursor-position").innerText = `Ln ${e.position.lineNumber}, Col ${e.position.column}`; });
    document.addEventListener('touchend', (e) => { let suggestItem = e.target.closest('.monaco-list-row'); if (suggestItem) { e.preventDefault(); suggestItem.click(); } }, { passive: false });
    
    renderUI();
});

// --- Terminal Logic ---
function printTerm(msg, type = "") { const div = document.createElement("div"); div.textContent = msg; div.className = type; terminal.appendChild(div); terminal.scrollTop = terminal.scrollHeight; }
function clearOutput() { terminal.innerHTML = ''; }
function minimizeTerminal() { let term = document.getElementById("terminal-container"); term.style.height = term.style.height === "30px" ? "30%" : "30px"; setTimeout(() => { if (editor) editor.layout(); }, 300); }

function openPreviewInNewTab() {
    if (!currentFile || (getLanguage(currentFile) !== 'html' && getLanguage(currentFile) !== 'css')) return;
    let htmlContent = files[currentFile];
    if (currentFile.endsWith('.html')) {
        if (files['style.css']) htmlContent = htmlContent.replace('</head>', `<style>${files['style.css']}</style></head>`);
        if (files['app.js'] || files['script.js']) { let jsName = files['app.js'] ? 'app.js' : 'script.js'; htmlContent = htmlContent.replace('</body>', `<script>${files[jsName]}</script></body>`); }
    } else { htmlContent = files['index.html'].replace('</head>', `<style>${files[currentFile]}</style></head>`); }
    
    const blob = new Blob([htmlContent], { type: 'text/html' }); const url = URL.createObjectURL(blob); window.open(url, '_blank');
}

// ==========================================
// 🚀 PYODIDE INITIALIZATION (With Auto-Hide Status)
// ==========================================
let pyodideReadyPromise;
async function initPyodide() {
    try { 
        let pyodide = await loadPyodide({ 
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/", 
            stdout: printTerm, 
            stderr: (t) => printTerm(t, "text-err") 
        }); 
        
        let statusElement = document.getElementById("pyodide-status");
        statusElement.innerHTML = `<i class="codicon codicon-check"></i> Workspace Ready`;
        
        // 3 second baad fade out karega
        setTimeout(() => {
            statusElement.style.transition = "opacity 0.5s ease";
            statusElement.style.opacity = "0";
            
            // Text clear kar dega taaki space khali ho jaye
            setTimeout(() => {
                statusElement.innerHTML = '';
                statusElement.style.opacity = "1"; // Next time use ke liye wapas opacity full
            }, 500);
        }, 3000);

        return pyodide;
    } catch (e) { 
        document.getElementById("pyodide-status").innerHTML = `<i class="codicon codicon-error"></i> Engine Failed`; 
    }
}
pyodideReadyPromise = initPyodide();

// --- Code Runner ---
async function runCode() {
    if (!currentFile) return;
    runBtn.innerHTML = `<i class="codicon codicon-sync codicon-modifier-spin"></i>`; runBtn.disabled = true;
    let ext = currentFile.split('.').pop(); let title = document.getElementById("output-title");
    
    if (ext === 'py') {
        terminal.classList.remove('hidden'); webPreview.classList.add('hidden'); btnExternal.classList.add('hidden');
        title.innerText = "TERMINAL - PYTHON"; printTerm(`\n> python ${currentFile}`, "text-sys");
        try { let pyodide = await pyodideReadyPromise; if (!pyodide) throw new Error("Python Engine is loading."); for (const [n, c] of Object.entries(files)) { pyodide.FS.writeFile(n, c); } await pyodide.runPythonAsync(files[currentFile]); } catch (err) { printTerm(err.toString(), "text-err"); }
    } else if (ext === 'html' || ext === 'css') {
        terminal.classList.add('hidden'); webPreview.classList.remove('hidden'); btnExternal.classList.remove('hidden');
        title.innerText = "WEB PREVIEW"; let htmlContent = files[currentFile];
        if (ext === 'html') { if (files['style.css']) htmlContent = htmlContent.replace('</head>', `<style>${files['style.css']}</style></head>`); if (files['script.js']) htmlContent = htmlContent.replace('</body>', `<script>${files['script.js']}</script></body>`); } else { if (files['index.html']) htmlContent = files['index.html'].replace('</head>', `<style>${files[currentFile]}</style></head>`); }
        webPreview.srcdoc = htmlContent;
    } else if (ext === 'js') {
        terminal.classList.remove('hidden'); webPreview.classList.add('hidden'); btnExternal.classList.add('hidden');
        title.innerText = "TERMINAL - NODE"; printTerm(`\n> node ${currentFile}`, "text-sys");
        let oldLog = console.log; console.log = function(...a) { printTerm(a.join(' ')); oldLog.apply(console, a); };
        try { eval(files[currentFile]); } catch (err) { printTerm(err.toString(), "text-err"); } console.log = oldLog;
    } else if (ext === 'json') {
        terminal.classList.remove('hidden'); webPreview.classList.add('hidden'); btnExternal.classList.add('hidden');
        title.innerText = "TERMINAL - JSON"; printTerm(`\n> Validating ${currentFile}...`, "text-sys");
        try { let parsed = JSON.parse(files[currentFile]); printTerm("✔ JSON is Valid!\n", "text-succ"); printTerm(JSON.stringify(parsed, null, 2)); } catch (err) { printTerm("❌ Invalid JSON Format!\n" + err.toString(), "text-err"); }
    }
    runBtn.innerHTML = `<i class="codicon codicon-play"></i> Run`; runBtn.disabled = false;
}

// 🚀 Keyboard Shortcuts Map
document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); runCode(); } });