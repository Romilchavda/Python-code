// --- Initial Setup & Local Storage ---
const defaultFiles = {
    "main.py": "print('🚀 Welcome to Ultimate Pro IDE!')\n",
    "index.html": "<!DOCTYPE html>\n<html>\n<head>\n  <link rel=\"stylesheet\" href=\"style.css\">\n</head>\n<body>\n  <h1>🌐 HTML/CSS Preview Works!</h1>\n</body>\n</html>",
    "style.css": "body { background: #1e1e1e; color: #58a6ff; text-align: center; font-family: sans-serif; }",
    "script.js": "console.log('JS is running natively!');",
    "package.json": "{\n  \"name\": \"ultimate-ide\",\n  \"version\": \"1.0.0\"\n}"
};

let files = JSON.parse(localStorage.getItem('ide_files')) || defaultFiles;
let currentFile = localStorage.getItem('ide_currentFile') || "main.py";
let openTabs = JSON.parse(localStorage.getItem('ide_openTabs')) ||["main.py", "index.html"];
let monacoModels = {};

// UI Elements
const terminal = document.getElementById("terminal-output");
const webPreview = document.getElementById("web-preview");
const runBtn = document.getElementById("runBtn");

// --- REAL LOGOS (100% Fail-Proof Embedded JSON Logo) ---
const icons = {
    py: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg",
    html: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg",
    css: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg",
    js: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg",
    // JSON icon is now hardcoded directly so it NEVER breaks!
    json: "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23F5DE19'%3E%3Cpath d='M9.5 3H7.4c-1.2 0-2 .8-2 2v4.1c0 1.2-.8 2-2 2h-.8v1.8h.8c1.2 0 2 .8 2 2V19c0 1.2.8 2 2 2h2.1v-1.8H7.4c-.2 0-.4-.2-.4-.4v-4.1c0-1.8-1.2-3-3-3 1.8 0 3-1.2 3-3V4.6c0-.2.2-.4.4-.4h2.1V3zm5 0v1.8h2.1c.2 0 .4.2.4.4v4.1c0 1.8 1.2 3 3 3-1.8 0-3 1.2-3 3V19c0 .2-.2.4-.4.4h-2.1V21h2.1c1.2 0 2-.8 2-2v-4.1c0-1.2.8-2 2-2h.8v-1.8h-.8c-1.2 0-2-.8-2-2V5c0-1.2-.8-2-2-2h-2.1z'/%3E%3C/svg%3E",
    folder: "https://www.svgrepo.com/show/448222/folder.svg",
    default: "https://www.svgrepo.com/show/448225/file.svg"
};

function getIcon(filename) {
    if(filename.endsWith('.py')) return icons.py;
    if(filename.endsWith('.html')) return icons.html;
    if(filename.endsWith('.css')) return icons.css;
    if(filename.endsWith('.js')) return icons.js;
    if(filename.endsWith('.json')) return icons.json;
    if(filename.includes('/')) return icons.folder;
    return icons.default;
}

function getLanguage(filename) {
    if(filename.endsWith('.py')) return 'python';
    if(filename.endsWith('.html')) return 'html';
    if(filename.endsWith('.css')) return 'css';
    if(filename.endsWith('.js')) return 'javascript';
    if(filename.endsWith('.json')) return 'json';
    return 'plaintext';
}

function saveState() {
    localStorage.setItem('ide_files', JSON.stringify(files));
    localStorage.setItem('ide_currentFile', currentFile);
    localStorage.setItem('ide_openTabs', JSON.stringify(openTabs));
}

// --- CUSTOM PREMIUM MODAL ---
function showModal(title, type, defaultValue, callback) {
    const modal = document.getElementById('custom-modal');
    const inputEl = document.getElementById('modal-input');
    const msgEl = document.getElementById('modal-message');
    const confirmBtn = document.getElementById('modal-confirm-btn');

    document.getElementById('modal-title').innerText = title;
    modal.classList.add('active');

    if(type === 'input') {
        inputEl.style.display = 'block'; msgEl.style.display = 'none';
        inputEl.value = defaultValue || ''; inputEl.focus();
    } else {
        inputEl.style.display = 'none'; msgEl.style.display = 'block';
        msgEl.innerText = defaultValue;
    }

    confirmBtn.onclick = null;
    confirmBtn.onclick = () => {
        closeModal();
        if(type === 'input') {
            if(inputEl.value.trim() !== '') callback(inputEl.value.trim());
        } else {
            callback(true);
        }
    };
    
    inputEl.onkeypress = (e) => { if(e.key === 'Enter') confirmBtn.click(); };
}

function closeModal() {
    document.getElementById('custom-modal').classList.remove('active');
}

// --- File Explorer ---
function renderUI() {
    const fileTree = document.getElementById('fileTree');
    const fileTabs = document.getElementById('fileTabs');
    fileTree.innerHTML = ''; fileTabs.innerHTML = '';

    Object.keys(files).sort().forEach(filename => {
        if(filename.endsWith('.keep')) return;
        let displayName = filename.includes('/') ? filename.split('/')[1] : filename;
        let isFolderStr = filename.includes('/') ? `<span style="color:#8b949e;font-size:11px;">${filename.split('/')[0]}/</span> ` : '';

        let div = document.createElement('div');
        div.className = `tree-item ${filename === currentFile ? 'active' : ''}`;
        div.innerHTML = `
            <div class="item-left" onclick="openFile('${filename}')">
                <img src="${getIcon(filename)}" class="item-icon">
                <span>${isFolderStr}${displayName}</span>
            </div>
            <div class="tree-actions">
                <i class="codicon codicon-edit" onclick="renameFile('${filename}')" title="Rename"></i>
                <i class="codicon codicon-trash del" onclick="deleteFile('${filename}')" title="Delete"></i>
            </div>
        `;
        fileTree.appendChild(div);
    });

    openTabs.forEach(filename => {
        if(!files[filename]) return; 
        let displayName = filename.includes('/') ? filename.split('/')[1] : filename;
        let tab = document.createElement('div');
        tab.className = `tab ${filename === currentFile ? 'active' : ''}`;
        tab.innerHTML = `
            <img src="${getIcon(filename)}" class="item-icon" style="width:14px;height:14px;"> 
            <span onclick="switchFile('${filename}')">${displayName}</span>
            <i class="codicon codicon-close tab-close" onclick="closeTab('${filename}')"></i>
        `;
        fileTabs.appendChild(tab);
    });

    if (currentFile) document.getElementById('current-language').innerText = getLanguage(currentFile).toUpperCase();
}

function openFile(filename) {
    if(!openTabs.includes(filename)) openTabs.push(filename);
    switchFile(filename);
    if(window.innerWidth <= 768) toggleSidebar(); 
}

function closeTab(filename) {
    openTabs = openTabs.filter(t => t !== filename);
    if(currentFile === filename) {
        currentFile = openTabs.length > 0 ? openTabs[openTabs.length - 1] : null;
        if(currentFile) switchFile(currentFile); else { editor.setModel(null); currentFile = null; renderUI(); }
    } else { renderUI(); }
    saveState();
}

function switchFile(filename) {
    currentFile = filename;
    if(editor && monacoModels[filename]) {
        editor.setModel(monacoModels[filename]);
        monaco.editor.setModelLanguage(monacoModels[filename], getLanguage(filename));
    }
    renderUI(); saveState();
}

// --- FILE OPERATIONS ---
function addNewFile() {
    showModal("Create New File", "input", "", (name) => {
        if (!files[name]) {
            files[name] = "";
            monacoModels[name] = monaco.editor.createModel("", getLanguage(name));
            openFile(name);
        } else {
            showModal("Error", "confirm", "File already exists!", ()=>{});
        }
    });
}

function addNewFolder() {
    showModal("Create New Folder", "input", "", (name) => {
        files[`${name}/.keep`] = ""; renderUI(); saveState();
    });
}

function deleteFile(filename) {
    showModal("Delete File", "confirm", `Are you sure you want to delete '${filename}'?`, (confirmed) => {
        if(confirmed) {
            delete files[filename];
            if (monacoModels[filename]) monacoModels[filename].dispose();
            closeTab(filename);
        }
    });
}

function renameFile(oldName) {
    showModal("Rename File", "input", oldName, (newName) => {
        if (newName !== oldName && !files[newName]) {
            files[newName] = files[oldName];
            delete files[oldName];
            monacoModels[newName] = monacoModels[oldName];
            delete monacoModels[oldName];
            if(openTabs.includes(oldName)) openTabs[openTabs.indexOf(oldName)] = newName;
            if(currentFile === oldName) currentFile = newName;
            renderUI(); saveState();
        }
    });
}

// --- Monaco Init ---
require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' }});
let editor;

require(['vs/editor/editor.main'], function() {
    monaco.editor.defineTheme('vs-dark-custom', { base: 'vs-dark', inherit: true, rules:[], colors: { 'editor.background': '#1e1e1e' }});
    
    Object.keys(files).forEach(f => { monacoModels[f] = monaco.editor.createModel(files[f], getLanguage(f)); });

    editor = monaco.editor.create(document.getElementById('editor-container'), {
        theme: 'vs-dark-custom', 
        automaticLayout: true, 
        wordWrap: 'on', 
        fontSize: 14, 
        fontFamily: "'JetBrains Mono', monospace", 
        minimap: { enabled: false },
        suggestSelection: 'first',
        acceptSuggestionOnEnter: 'on',
        quickSuggestions: true
    });

    if(currentFile && monacoModels[currentFile]) editor.setModel(monacoModels[currentFile]);

    editor.onDidChangeModelContent(() => { 
        if(currentFile) { files[currentFile] = editor.getValue(); saveState(); }
    });

    editor.onDidChangeCursorPosition((e) => {
        document.getElementById("cursor-position").innerText = `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
    });

    // 🔥 MOBILE TOUCH FIX FOR SUGGESTIONS (The Magic Bullet) 🔥
    document.addEventListener('touchend', (e) => {
        let suggestItem = e.target.closest('.monaco-list-row');
        if (suggestItem) {
            e.preventDefault(); // Roks editor from blurring/closing keyboard
            suggestItem.click(); // Zabardasti tap (click) trigger karta hai
        }
    }, { passive: false });
    
    runBtn.disabled = false;
    runBtn.innerHTML = `<i class="codicon codicon-play"></i> Run`;
    renderUI();
});

// --- Pyodide & Terminal ---
function printTerm(msg, type = "") {
    const div = document.createElement("div"); div.textContent = msg; div.className = type;
    terminal.appendChild(div); terminal.scrollTop = terminal.scrollHeight;
}
function clearOutput() { terminal.innerHTML = ''; }
function minimizeTerminal() {
    let term = document.getElementById("terminal-container");
    term.style.height = term.style.height === "30px" ? "30%" : "30px";
    setTimeout(() => editor.layout(), 300);
}

let pyodideReadyPromise;
async function initPyodide() {
    try {
        let pyodide = await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/", stdout: printTerm, stderr: (t)=>printTerm(t, "text-err") });
        document.getElementById("pyodide-status").innerHTML = `<i class="codicon codicon-check"></i> Python Ready`;
        return pyodide;
    } catch(e) { document.getElementById("pyodide-status").innerHTML = `<i class="codicon codicon-error"></i> Engine Failed`; }
}
pyodideReadyPromise = initPyodide();

// --- SMART RUNNER ---
async function runCode() {
    if(!currentFile) return;
    runBtn.innerHTML = `<i class="codicon codicon-sync codicon-modifier-spin"></i>`; runBtn.disabled = true;
    let ext = currentFile.split('.').pop();
    let title = document.getElementById("output-title");

    if (ext === 'py') {
        terminal.classList.remove('hidden'); webPreview.classList.add('hidden'); title.innerText = "TERMINAL - PYTHON";
        printTerm(`\n> python ${currentFile}`, "text-sys");
        try {
            let pyodide = await pyodideReadyPromise;
            if(!pyodide) throw new Error("Python Engine is still loading. Please wait a second and try again.");
            for (const[n, c] of Object.entries(files)) { pyodide.FS.writeFile(n, c); }
            await pyodide.runPythonAsync(files[currentFile]);
        } catch (err) { printTerm(err.toString(), "text-err"); }
        
    } else if (ext === 'html' || ext === 'css') {
        terminal.classList.add('hidden'); webPreview.classList.remove('hidden'); title.innerText = "WEB PREVIEW";
        let htmlContent = files[currentFile];
        if(ext === 'html') {
            if(files['style.css']) htmlContent = htmlContent.replace('</head>', `<style>${files['style.css']}</style></head>`);
            if(files['script.js']) htmlContent = htmlContent.replace('</body>', `<script>${files['script.js']}</script></body>`);
        } else { if(files['index.html']) htmlContent = files['index.html'].replace('</head>', `<style>${files[currentFile]}</style></head>`); }
        webPreview.srcdoc = htmlContent;

    } else if (ext === 'js') {
        terminal.classList.remove('hidden'); webPreview.classList.add('hidden'); title.innerText = "TERMINAL - NODE";
        printTerm(`\n> node ${currentFile}`, "text-sys");
        let oldLog = console.log; console.log = function(...a) { printTerm(a.join(' ')); oldLog.apply(console, a); };
        try { eval(files[currentFile]); } catch (err) { printTerm(err.toString(), "text-err"); }
        console.log = oldLog;

    } else if (ext === 'json') {
        terminal.classList.remove('hidden'); webPreview.classList.add('hidden'); title.innerText = "TERMINAL - JSON";
        printTerm(`\n> Validating ${currentFile}...`, "text-sys");
        try {
            let parsed = JSON.parse(files[currentFile]);
            printTerm("✔ JSON is Valid!\n", "text-succ");
            printTerm(JSON.stringify(parsed, null, 2));
        } catch (err) { printTerm("❌ Invalid JSON Format!\n" + err.toString(), "text-err"); }
    }
    
    runBtn.innerHTML = `<i class="codicon codicon-play"></i> Run`; runBtn.disabled = false;
}

// --- MOBILE TOGGLE LOGIC ---
function toggleSidebar() {
    let sidebar = document.getElementById('sidebar');
    let overlay = document.getElementById('mobile-overlay');
    let resizer = document.getElementById('resizer-v');
    
    if(window.innerWidth <= 768) {
        sidebar.classList.toggle('mobile-active');
        overlay.classList.toggle('active');
    } else {
        if (sidebar.style.display === 'none') { sidebar.style.display = 'flex'; resizer.style.display = 'block'; }
        else { sidebar.style.display = 'none'; resizer.style.display = 'none'; }
    }
    setTimeout(() => { if(editor) editor.layout(); }, 300);
}

document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); runCode(); } });