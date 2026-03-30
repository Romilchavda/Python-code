// Initial File System
let files = {
    "main.py": "print('🚀 Python is running!')\n",
    "index.html": "<!DOCTYPE html>\n<html>\n<head>\n  <style>body{color:white; background:#222; text-align:center; font-family:sans-serif;}</style>\n</head>\n<body>\n  <h1>🌐 HTML/CSS Preview Works!</h1>\n</body>\n</html>",
    "script.js": "console.log('🟨 JavaScript is running in terminal!');\n"
};
let currentFile = "main.py";
let monacoModels = {};

// UI Elements
const terminal = document.getElementById("terminal-output");
const webPreview = document.getElementById("web-preview");
const runBtn = document.getElementById("runBtn");
const termTitle = document.getElementById("output-title");

// Logos (SVG Links for Premium Look)
const icons = {
    py: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg",
    html: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg",
    css: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg",
    js: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg",
    folder: "https://www.svgrepo.com/show/448222/folder.svg",
    default: "https://www.svgrepo.com/show/448225/file.svg"
};

function getFileIcon(filename) {
    if(filename.endsWith('.py')) return icons.py;
    if(filename.endsWith('.html')) return icons.html;
    if(filename.endsWith('.css')) return icons.css;
    if(filename.endsWith('.js')) return icons.js;
    return icons.default;
}

// Sidebar Toggle
function toggleMenu() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active');
}

// --- File Explorer Logic (Create & Delete) ---
function addNewFile() {
    let name = prompt("Enter file name (e.g., style.css or folder/app.py):");
    if (name && name.trim() !== '' && !files[name]) {
        files[name] = "# New file";
        monacoModels[name] = monaco.editor.createModel(files[name], getLanguage(name));
        switchFile(name);
    }
}

function addNewFolder() {
    let name = prompt("Enter folder name:");
    if (name && name.trim() !== '') {
        // We simulate folders by adding a dummy file inside it
        files[`${name}/.keep`] = "# Folder created";
        renderUI();
    }
}

function deleteFile(filename, event) {
    event.stopPropagation(); // Prevent opening the file when clicking delete
    let confirmDel = confirm(`Delete ${filename}?`);
    if (confirmDel) {
        delete files[filename];
        if (monacoModels[filename]) {
            monacoModels[filename].dispose();
            delete monacoModels[filename];
        }
        if (currentFile === filename) {
            let remainingFiles = Object.keys(files);
            if (remainingFiles.length > 0) switchFile(remainingFiles[0]);
            else { currentFile = null; editor.setModel(null); }
        }
        renderUI();
    }
}

function getLanguage(filename) {
    if(filename.endsWith('.py')) return 'python';
    if(filename.endsWith('.html')) return 'html';
    if(filename.endsWith('.css')) return 'css';
    if(filename.endsWith('.js')) return 'javascript';
    return 'plaintext';
}

function renderUI() {
    const fileTree = document.getElementById('fileTree');
    const fileTabs = document.getElementById('fileTabs');
    fileTree.innerHTML = ''; fileTabs.innerHTML = '';

    // Sort files to show folders properly (Basic simulated folder view)
    let sortedKeys = Object.keys(files).sort();

    sortedKeys.forEach(filename => {
        if(filename.endsWith('.keep')) return; // Hide dummy folder files

        // Sidebar Item
        let isFolderStr = filename.includes('/') ? `<span style="color:#8b949e;font-size:11px;">${filename.split('/')[0]}/</span> ` : '';
        let displayName = filename.includes('/') ? filename.split('/')[1] : filename;

        let div = document.createElement('div');
        div.className = `tree-item ${filename === currentFile ? 'active' : ''}`;
        div.innerHTML = `
            <div class="item-left">
                <img src="${getFileIcon(filename)}" class="item-icon">
                <span>${isFolderStr}${displayName}</span>
            </div>
            <button class="btn-del" onclick="deleteFile('${filename}', event)">🗑️</button>
        `;
        div.onclick = () => switchFile(filename);
        fileTree.appendChild(div);

        // Tab Item
        let tab = document.createElement('div');
        tab.className = `tab ${filename === currentFile ? 'active' : ''}`;
        tab.innerHTML = `<img src="${getFileIcon(filename)}" width="14" height="14"> ${displayName}`;
        tab.onclick = () => switchFile(filename);
        fileTabs.appendChild(tab);
    });

    if (currentFile) runBtn.innerHTML = `▶ Run ${currentFile.split('/').pop()}`;
}

function switchFile(filename) {
    currentFile = filename;
    editor.setModel(monacoModels[filename]);
    // Dynamic Language Switching
    monaco.editor.setModelLanguage(monacoModels[filename], getLanguage(filename));
    renderUI();
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
}

function printTerm(msg, type = "") {
    const div = document.createElement("div");
    div.textContent = msg; div.className = type;
    terminal.appendChild(div);
    terminal.scrollTop = terminal.scrollHeight; // Auto-scroll fixed!
}

function clearOutput() { terminal.innerHTML = ''; }

// --- Initialization ---
require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' }});
let editor;

require(['vs/editor/editor.main'], function() {
    monaco.editor.defineTheme('customDark', {
        base: 'vs-dark', inherit: true, rules:[],
        colors: { 'editor.background': '#0d1117', 'editorLineNumber.foreground': '#484f58' }
    });

    Object.keys(files).forEach(filename => {
        monacoModels[filename] = monaco.editor.createModel(files[filename], getLanguage(filename));
    });

    editor = monaco.editor.create(document.getElementById('editor-container'), {
        model: monacoModels[currentFile],
        theme: 'customDark', automaticLayout: true, wordWrap: 'on', minimap: { enabled: false },
        lineNumbersMinChars: 3, fontSize: 14, fontFamily: "'JetBrains Mono', monospace", contextmenu: false
    });

    editor.onDidChangeModelContent(() => { if(currentFile) files[currentFile] = editor.getValue(); });
    renderUI();
});

// Pyodide Init
let pyodideReadyPromise;
async function initPyodide() {
    try {
        let pyodide = await loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/",
            stdout: (text) => printTerm(text),
            stderr: (text) => printTerm(text, "text-err")
        });
        printTerm("✔ System Ready.", "text-succ");
        runBtn.disabled = false;
        return pyodide;
    } catch(e) { printTerm("❌ Engine load failed.", "text-err"); }
}
pyodideReadyPromise = initPyodide();

// --- SMART EXECUTION (Py, HTML, JS) ---
async function runCode() {
    if(!currentFile) return;
    runBtn.innerHTML = "⏳ Running..."; runBtn.disabled = true;

    let ext = currentFile.split('.').pop();

    if (ext === 'py') {
        // RUN PYTHON
        terminal.classList.remove('hidden'); webPreview.classList.add('hidden');
        termTitle.innerText = "TERMINAL";
        printTerm(`\n$ python ${currentFile}`, "text-sys");

        try {
            let pyodide = await pyodideReadyPromise;
            // Write virtual files
            for (const [name, content] of Object.entries(files)) { pyodide.FS.writeFile(name, content); }
            // Clear Cache
            let clearCache = `import sys\nfor m in[f.replace('.py', '') for f in ${JSON.stringify(Object.keys(files))}]:\n    if m in sys.modules: del sys.modules[m]`;
            await pyodide.runPythonAsync(clearCache);
            // Run
            await pyodide.runPythonAsync(files[currentFile]);
        } catch (err) { printTerm(err.toString(), "text-err"); }

    } else if (ext === 'html' || ext === 'css') {
        // RUN HTML/WEB
        terminal.classList.add('hidden'); webPreview.classList.remove('hidden');
        termTitle.innerText = "WEB PREVIEW";
        
        let htmlContent = files[currentFile];
        // Inject CSS if running HTML
        if(ext === 'html' && files['style.css']) {
            htmlContent = htmlContent.replace('</head>', `<style>${files['style.css']}</style></head>`);
        }
        webPreview.srcdoc = htmlContent;

    } else if (ext === 'js') {
        // RUN JAVASCRIPT
        terminal.classList.remove('hidden'); webPreview.classList.add('hidden');
        termTitle.innerText = "TERMINAL";
        printTerm(`\n$ node ${currentFile}`, "text-sys");
        
        // Capture JS console.log
        let oldLog = console.log;
        console.log = function(...args) { printTerm(args.join(' ')); oldLog.apply(console, args); };
        try {
            eval(files[currentFile]); // Run the JS Code
        } catch (err) { printTerm(err.toString(), "text-err"); }
        console.log = oldLog; // Restore console
    }

    runBtn.innerHTML = `▶ Run ${currentFile.split('/').pop()}`; runBtn.disabled = false;
}