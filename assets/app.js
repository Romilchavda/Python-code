// --- Initial Setup & Local Storage ---
const defaultFiles = {
    "main.py": "print('🚀 Welcome to Ultimate Pro IDE!')\n# Press Ctrl+S to Run the code.",
    "index.html": "<!DOCTYPE html>\n<html>\n<head>\n  <link rel=\"stylesheet\" href=\"style.css\">\n</head>\n<body>\n  <h1>🌐 Premium IDE Web Preview</h1>\n  <script src=\"script.js\"></script>\n</body>\n</html>",
    "style.css": "body {\n  background: #1e1e1e;\n  color: #58a6ff;\n  text-align: center;\n  font-family: sans-serif;\n  padding-top: 50px;\n}",
    "script.js": "console.log('JS is running natively!');"
};

let files = JSON.parse(localStorage.getItem('ide_files')) || defaultFiles;
let currentFile = localStorage.getItem('ide_currentFile') || "main.py";
let openTabs = JSON.parse(localStorage.getItem('ide_openTabs')) || ["main.py", "index.html", "style.css"];
let monacoModels = {};

// UI Elements
const terminal = document.getElementById("terminal-output");
const webPreview = document.getElementById("web-preview");
const runBtn = document.getElementById("runBtn");
const statusLang = document.getElementById("current-language");
const statusCursor = document.getElementById("cursor-position");

// --- Utility Functions ---
function saveState() {
    localStorage.setItem('ide_files', JSON.stringify(files));
    localStorage.setItem('ide_currentFile', currentFile);
    localStorage.setItem('ide_openTabs', JSON.stringify(openTabs));
}

function getLanguage(filename) {
    if(filename.endsWith('.py')) return 'python';
    if(filename.endsWith('.html')) return 'html';
    if(filename.endsWith('.css')) return 'css';
    if(filename.endsWith('.js')) return 'javascript';
    if(filename.endsWith('.json')) return 'json';
    return 'plaintext';
}

function getIcon(filename) {
    if(filename.endsWith('.py')) return 'codicon-code';
    if(filename.endsWith('.html')) return 'codicon-browser';
    if(filename.endsWith('.css')) return 'codicon-symbol-color';
    if(filename.endsWith('.js')) return 'codicon-symbol-event';
    if(filename.includes('/')) return 'codicon-folder';
    return 'codicon-file';
}

// --- File Explorer & Tabs Management ---
function renderUI() {
    const fileTree = document.getElementById('fileTree');
    const fileTabs = document.getElementById('fileTabs');
    fileTree.innerHTML = ''; fileTabs.innerHTML = '';

    // Render Explorer
    Object.keys(files).sort().forEach(filename => {
        if(filename.endsWith('.keep')) return;
        
        let isFolderStr = filename.includes('/') ? `<span style="color:#8b949e;font-size:11px;">${filename.split('/')[0]}/</span> ` : '';
        let displayName = filename.includes('/') ? filename.split('/')[1] : filename;

        let div = document.createElement('div');
        div.className = `tree-item ${filename === currentFile ? 'active' : ''}`;
        div.innerHTML = `
            <div class="item-left" onclick="openFile('${filename}')">
                <i class="codicon ${getIcon(filename)} item-icon"></i>
                <span>${isFolderStr}${displayName}</span>
            </div>
            <div class="tree-actions">
                <i class="codicon codicon-edit" onclick="renameFile('${filename}')" title="Rename"></i>
                <i class="codicon codicon-trash del" onclick="deleteFile('${filename}')" title="Delete"></i>
            </div>
        `;
        fileTree.appendChild(div);
    });

    // Render Tabs
    openTabs.forEach(filename => {
        if(!files[filename]) return; // Fallback
        let displayName = filename.includes('/') ? filename.split('/')[1] : filename;
        let tab = document.createElement('div');
        tab.className = `tab ${filename === currentFile ? 'active' : ''}`;
        tab.innerHTML = `
            <i class="codicon ${getIcon(filename)} item-icon" style="font-size:14px"></i> 
            <span onclick="switchFile('${filename}')">${displayName}</span>
            <i class="codicon codicon-close tab-close" onclick="closeTab('${filename}')"></i>
        `;
        fileTabs.appendChild(tab);
    });

    if (currentFile) {
        runBtn.innerHTML = `<i class="codicon codicon-play"></i> Run`;
        statusLang.innerText = getLanguage(currentFile).toUpperCase();
    }
}

function openFile(filename) {
    if(!openTabs.includes(filename)) openTabs.push(filename);
    switchFile(filename);
}

function closeTab(filename) {
    openTabs = openTabs.filter(t => t !== filename);
    if(currentFile === filename) {
        currentFile = openTabs.length > 0 ? openTabs[openTabs.length - 1] : null;
        if(currentFile) switchFile(currentFile);
        else { editor.setModel(null); currentFile = null; renderUI(); }
    } else {
        renderUI();
    }
    saveState();
}

function switchFile(filename) {
    currentFile = filename;
    if(editor && monacoModels[filename]) {
        editor.setModel(monacoModels[filename]);
        monaco.editor.setModelLanguage(monacoModels[filename], getLanguage(filename));
    }
    renderUI();
    saveState();
}

// File Operations
function addNewFile() {
    let name = prompt("Enter file name (e.g., app.py):");
    if (name && !files[name]) {
        files[name] = "";
        monacoModels[name] = monaco.editor.createModel("", getLanguage(name));
        openFile(name);
    }
}

function addNewFolder() {
    let name = prompt("Enter folder name:");
    if (name) { files[`${name}/.keep`] = ""; renderUI(); saveState(); }
}

function deleteFile(filename) {
    if (confirm(`Are you sure you want to delete '${filename}'?`)) {
        delete files[filename];
        if (monacoModels[filename]) monacoModels[filename].dispose();
        closeTab(filename);
    }
}

function renameFile(oldName) {
    let newName = prompt("Enter new name:", oldName);
    if (newName && newName !== oldName && !files[newName]) {
        files[newName] = files[oldName];
        delete files[oldName];
        monacoModels[newName] = monacoModels[oldName]; // Transfer model
        delete monacoModels[oldName];
        
        // Update Tabs
        if(openTabs.includes(oldName)) {
            openTabs[openTabs.indexOf(oldName)] = newName;
        }
        if(currentFile === oldName) currentFile = newName;
        renderUI(); saveState();
    }
}

// --- Terminal Logic ---
function printTerm(msg, type = "") {
    const div = document.createElement("div");
    div.textContent = msg; div.className = type;
    terminal.appendChild(div);
    terminal.scrollTop = terminal.scrollHeight;
}
function clearOutput() { terminal.innerHTML = ''; }
function minimizeTerminal() {
    let termContainer = document.getElementById("terminal-container");
    termContainer.style.height = termContainer.style.height === "30px" ? "30%" : "30px";
}

// --- Monaco Editor Init ---
require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' }});
let editor;

require(['vs/editor/editor.main'], function() {
    monaco.editor.defineTheme('vs-dark-custom', {
        base: 'vs-dark', inherit: true, rules:[],
        colors: { 'editor.background': '#1e1e1e', 'editorLineNumber.foreground': '#858585' }
    });

    Object.keys(files).forEach(filename => {
        monacoModels[filename] = monaco.editor.createModel(files[filename], getLanguage(filename));
    });

    editor = monaco.editor.create(document.getElementById('editor-container'), {
        theme: 'vs-dark-custom', automaticLayout: true, wordWrap: 'on', 
        fontSize: 14, fontFamily: "'JetBrains Mono', monospace", minimap: { enabled: true }
    });

    if(currentFile && monacoModels[currentFile]) editor.setModel(monacoModels[currentFile]);

    // Track changes & save to LocalStorage
    editor.onDidChangeModelContent(() => { 
        if(currentFile) {
            files[currentFile] = editor.getValue();
            saveState();
        }
    });

    // Update Status Bar Cursor Position
    editor.onDidChangeCursorPosition((e) => {
        statusCursor.innerText = `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
    });

    renderUI();
});

// --- Pyodide Init ---
let pyodideReadyPromise;
async function initPyodide() {
    const statusText = document.getElementById("pyodide-status");
    try {
        let pyodide = await loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/",
            stdout: (text) => printTerm(text),
            stderr: (text) => printTerm(text, "text-err")
        });
        statusText.innerHTML = `<i class="codicon codicon-check"></i> Python Ready`;
        printTerm("✔ System Ready.", "text-succ");
        runBtn.disabled = false;
        return pyodide;
    } catch(e) { 
        statusText.innerHTML = `<i class="codicon codicon-error"></i> Engine Failed`;
        printTerm("❌ Engine load failed.", "text-err"); 
    }
}
pyodideReadyPromise = initPyodide();

// --- Smart Code Runner ---
async function runCode() {
    if(!currentFile) return;
    runBtn.innerHTML = `<i class="codicon codicon-sync codicon-modifier-spin"></i> Running...`; 
    runBtn.disabled = true;

    let ext = currentFile.split('.').pop();
    let termTitle = document.getElementById("output-title");

    if (ext === 'py') {
        terminal.classList.remove('hidden'); webPreview.classList.add('hidden');
        termTitle.innerText = "TERMINAL - PYTHON";
        printTerm(`\n> python ${currentFile}`, "text-sys");

        try {
            let pyodide = await pyodideReadyPromise;
            // Write all virtual files to Pyodide File System
            for (const[name, content] of Object.entries(files)) { pyodide.FS.writeFile(name, content); }
            // Run script
            await pyodide.runPythonAsync(files[currentFile]);
        } catch (err) { printTerm(err.toString(), "text-err"); }

    } else if (ext === 'html' || ext === 'css') {
        terminal.classList.add('hidden'); webPreview.classList.remove('hidden');
        termTitle.innerText = "WEB PREVIEW";
        
        let htmlContent = files[currentFile];
        // Smart Inject CSS & JS into HTML
        if(ext === 'html') {
            if(files['style.css']) htmlContent = htmlContent.replace('</head>', `<style>${files['style.css']}</style></head>`);
            if(files['script.js']) htmlContent = htmlContent.replace('</body>', `<script>${files['script.js']}</script></body>`);
        } else if (ext === 'css') {
            // If they run CSS, try to show index.html instead
            if(files['index.html']) {
                htmlContent = files['index.html'].replace('</head>', `<style>${files[currentFile]}</style></head>`);
            }
        }
        webPreview.srcdoc = htmlContent;

    } else if (ext === 'js') {
        terminal.classList.remove('hidden'); webPreview.classList.add('hidden');
        termTitle.innerText = "TERMINAL - NODE.JS";
        printTerm(`\n> node ${currentFile}`, "text-sys");
        
        let oldLog = console.log;
        console.log = function(...args) { printTerm(args.join(' ')); oldLog.apply(console, args); };
        try { eval(files[currentFile]); } catch (err) { printTerm(err.toString(), "text-err"); }
        console.log = oldLog;
    }

    runBtn.innerHTML = `<i class="codicon codicon-play"></i> Run`; 
    runBtn.disabled = false;
}

// --- Shortcuts ---
document.addEventListener('keydown', (e) => {
    // Ctrl + S -> Save & Run
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        runCode();
    }
    // Ctrl + B -> Toggle Sidebar
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
    }
});

function toggleSidebar() {
    let sidebar = document.getElementById('sidebar');
    let resizer = document.getElementById('resizer-v');
    if (sidebar.style.display === 'none') {
        sidebar.style.display = 'flex'; resizer.style.display = 'block';
    } else {
        sidebar.style.display = 'none'; resizer.style.display = 'none';
    }
}

// --- Drag to Resize Panels ---
const resizerV = document.getElementById('resizer-v');
const sidebar = document.getElementById('sidebar');
let isResizingV = false;

resizerV.addEventListener('mousedown', (e) => { isResizingV = true; document.body.style.cursor = 'col-resize'; });
document.addEventListener('mousemove', (e) => {
    if (!isResizingV) return;
    sidebar.style.width = `${Math.max(150, Math.min(e.clientX - 48, 500))}px`; // 48 is activity bar width
});
document.addEventListener('mouseup', () => { isResizingV = false; document.body.style.cursor = 'default'; });

const resizerH = document.getElementById('resizer-h');
const terminalContainer = document.getElementById('terminal-container');
let isResizingH = false;

resizerH.addEventListener('mousedown', (e) => { isResizingH = true; document.body.style.cursor = 'row-resize'; });
document.addEventListener('mousemove', (e) => {
    if (!isResizingH) return;
    let newHeight = window.innerHeight - e.clientY - 22; // 22 is status bar height
    terminalContainer.style.height = `${Math.max(30, Math.min(newHeight, window.innerHeight * 0.8))}px`;
});
document.addEventListener('mouseup', () => { isResizingH = false; document.body.style.cursor = 'default'; });