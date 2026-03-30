// --- Initial Setup & Local Storage (Clean Workspace) ---
const defaultFiles = {};

let files = JSON.parse(localStorage.getItem('ide_files_v2')) || defaultFiles;
let currentFile = localStorage.getItem('ide_currentFile_v2') || null;
let openTabs = JSON.parse(localStorage.getItem('ide_openTabs_v2')) ||[];
let monacoModels = {};

// UI Elements
const terminal = document.getElementById("terminal-output");
const webPreview = document.getElementById("web-preview");
const runBtn = document.getElementById("runBtn");

// --- REAL LOGOS ---
const icons = {
    py: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg",
    html: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg",
    css: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg",
    js: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg",
    json: "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23F5DE19'%3E%3Cpath d='M9.5 3H7.4c-1.2 0-2 .8-2 2v4.1c0 1.2-.8 2-2 2h-.8v1.8h.8c1.2 0 2 .8 2 2V19c0 1.2.8 2 2 2h2.1v-1.8H7.4c-.2 0-.4-.2-.4-.4v-4.1c0-1.8-1.2-3-3-3 1.8 0 3-1.2 3-3V4.6c0-.2.2-.4.4-.4h2.1V3zm5 0v1.8h2.1c.2 0 .4.2.4.4v4.1c0 1.8 1.2 3 3 3-1.8 0-3 1.2-3 3V19c0 .2-.2.4-.4.4h-2.1V21h2.1c1.2 0 2-.8 2-2v-4.1c0-1.2.8-2 2-2h.8v-1.8h-.8c-1.2 0-2-.8-2-2V5c0-1.2-.8-2-2-2h-2.1z'/%3E%3C/svg%3E",
    folder: "https://www.svgrepo.com/show/448222/folder.svg",
    default: "https://www.svgrepo.com/show/448225/file.svg"
};

function getIcon(filename) {
    if(!filename) return icons.default;
    if(filename.endsWith('.py')) return icons.py;
    if(filename.endsWith('.html')) return icons.html;
    if(filename.endsWith('.css')) return icons.css;
    if(filename.endsWith('.js')) return icons.js;
    if(filename.endsWith('.json')) return icons.json;
    if(filename.includes('/')) return icons.folder;
    return icons.default;
}

function getLanguage(filename) {
    if(!filename) return 'plaintext';
    if(filename.endsWith('.py')) return 'python';
    if(filename.endsWith('.html')) return 'html';
    if(filename.endsWith('.css')) return 'css';
    if(filename.endsWith('.js')) return 'javascript';
    if(filename.endsWith('.json')) return 'json';
    return 'plaintext';
}

function saveState() {
    localStorage.setItem('ide_files_v2', JSON.stringify(files));
    localStorage.setItem('ide_currentFile_v2', currentFile);
    localStorage.setItem('ide_openTabs_v2', JSON.stringify(openTabs));
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
        if(files[filename] === undefined) return; 

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

    if (currentFile) {
        document.getElementById('current-language').innerText = getLanguage(currentFile).toUpperCase();
        runBtn.innerHTML = `<i class="codicon codicon-play"></i> Run`;
        runBtn.disabled = false;
    } else {
        document.getElementById('current-language').innerText = "NONE";
        runBtn.innerHTML = `No File`;
        runBtn.disabled = true;
    }
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
    if(editor) {
        if(filename && monacoModels[filename]) {
            editor.setModel(monacoModels[filename]);
            monaco.editor.setModelLanguage(monacoModels[filename], getLanguage(filename));
        } else {
            editor.setModel(null); // Clear editor if no file
        }
    }
    renderUI(); saveState();
}

// --- FILE OPERATIONS ---
function addNewFile() {
    showModal("Create New File", "input", "", (name) => {
        if (files[name] === undefined) {
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
        if (newName !== oldName && files[newName] === undefined) {
            files[newName] = files[oldName];
            delete files[oldName];
            monacoModels[newName] = monacoModels[oldName];
            delete monacoModels[oldName];
            if(openTabs.includes(oldName)) openTabs[openTabs.indexOf(oldName)] = newName;
            if(currentFile === oldName) currentFile = newName;
            renderUI(); saveState();
        } else if (files[newName] !== undefined) {
            showModal("Error", "confirm", "File name already exists!", ()=>{});
        }
    });
}

// --- Monaco Init ---
require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' }});
let editor;

require(['vs/editor/editor.main'], function() {
    monaco.editor.defineTheme('vs-dark-custom', { base: 'vs-dark', inherit: true, rules:[], colors: { 'editor.background': '#1e1e1e' }});
    
    // Snippets
    monaco.languages.registerCompletionItemProvider('python', {
        provideCompletionItems: function(model, position) {
            const word = model.getWordUntilPosition(position);
            const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn };
            return { suggestions:[
                { label: 'def', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'def ${1:function_name}(${2:args}):\n\t${3:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Create a function', range: range },
                { label: 'class', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'class ${1:ClassName}:\n\tdef __init__(self):\n\t\t${2:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Create a class', range: range },
                { label: 'for', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'for ${1:item} in ${2:iterable}:\n\t${3:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'For loop', range: range },
                { label: 'print', kind: monaco.languages.CompletionItemKind.Function, insertText: 'print(${1:value})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Print output', range: range }
            ]};
        }
    });

    monaco.languages.registerCompletionItemProvider('html', {
        provideCompletionItems: function(model, position) {
            const word = model.getWordUntilPosition(position);
            const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn };
            return { suggestions:[
                { label: '!', kind: monaco.languages.CompletionItemKind.Snippet, insertText: '<!DOCTYPE html>\n<html lang="en">\n<head>\n\t<meta charset="UTF-8">\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\t<title>${1:Document}</title>\n</head>\n<body>\n\t${2}\n</body>\n</html>', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'HTML5 Boilerplate', range: range }
            ]};
        }
    });

    monaco.languages.registerCompletionItemProvider('css', {
        provideCompletionItems: function(model, position) {
            const word = model.getWordUntilPosition(position);
            const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn };
            return { suggestions:[
                { label: 'reset', kind: monaco.languages.CompletionItemKind.Snippet, insertText: '* {\n\tmargin: 0;\n\tpadding: 0;\n\tbox-sizing: border-box;\n}\n\nbody {\n\tfont-family: sans-serif;\n\t${1}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Basic CSS Reset', range: range }
            ]};
        }
    });

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
        quickSuggestions: { other: true, comments: false, strings: true },
        mouseWheelZoom: true
    });

    if(currentFile && monacoModels[currentFile]) {
        editor.setModel(monacoModels[currentFile]);
    } else {
        editor.setModel(null);
    }

    editor.onDidChangeModelContent(() => { 
        if(currentFile) { files[currentFile] = editor.getValue(); saveState(); }
    });

    editor.onDidChangeCursorPosition((e) => {
        document.getElementById("cursor-position").innerText = `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
    });

    // MOBILE TOUCH FIX FOR SUGGESTIONS
    document.addEventListener('touchend', (e) => {
        let suggestItem = e.target.closest('.monaco-list-row');
        if (suggestItem) {
            e.preventDefault(); 
            suggestItem.click(); 
        }
    }, { passive: false });
    
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
    setTimeout(() => { if(editor) editor.layout(); }, 300);
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

// --- NEW FIX: MOBILE TOGGLE LOGIC ---
function toggleSidebar() {
    let sidebar = document.getElementById('sidebar');
    let overlay = document.getElementById('mobile-overlay');
    
    if(window.innerWidth <= 768) {
        sidebar.classList.toggle('mobile-active');
        overlay.classList.toggle('active');
    } else {
        // Desktop par agar sidebar band karna ho tabhi
        sidebar.style.display = sidebar.style.display === 'none' ? 'flex' : 'none';
        document.getElementById('resizer-v').style.display = sidebar.style.display === 'none' ? 'none' : 'block';
    }
    setTimeout(() => { if(editor) editor.layout(); }, 300);
}

// --- NEW FIX: WINDOW RESIZE HANDLER ---
// Ye code device rotate karne par ya window size change karne par bugs fix karega
window.addEventListener('resize', () => {
    let sidebar = document.getElementById('sidebar');
    let overlay = document.getElementById('mobile-overlay');

    if (window.innerWidth > 768) {
        sidebar.classList.remove('mobile-active');
        overlay.classList.remove('active');
        sidebar.style.display = 'flex'; // Reset for desktop
        document.getElementById('resizer-v').style.display = 'block';
    } else {
        sidebar.style.display = ''; // Clear inline styles for mobile
        document.getElementById('resizer-v').style.display = '';
    }
    
    if (editor) {
        setTimeout(() => editor.layout(), 100);
    }
});

// --- NEW FEATURE: DRAG TO RESIZE (PC) ---
const resizerV = document.getElementById('resizer-v');
let isResizingV = false;

resizerV.addEventListener('mousedown', () => { isResizingV = true; document.body.style.cursor = 'col-resize'; });
document.addEventListener('mousemove', (e) => {
    if (!isResizingV) return;
    let newWidth = e.clientX - 48; // 48 is activity bar width
    if (newWidth > 150 && newWidth < 500) { document.getElementById('sidebar').style.width = newWidth + 'px'; }
});
document.addEventListener('mouseup', () => {
    if (isResizingV) { isResizingV = false; document.body.style.cursor = 'default'; if(editor) editor.layout(); }
});

const resizerH = document.getElementById('resizer-h');
let isResizingH = false;

resizerH.addEventListener('mousedown', () => { isResizingH = true; document.body.style.cursor = 'row-resize'; });
document.addEventListener('mousemove', (e) => {
    if (!isResizingH) return;
    let newHeight = window.innerHeight - e.clientY - 22; // 22 is status bar height
    if (newHeight > 100 && newHeight < window.innerHeight * 0.8) { document.getElementById('terminal-container').style.height = newHeight + 'px'; }
});
document.addEventListener('mouseup', () => {
    if (isResizingH) { isResizingH = false; document.body.style.cursor = 'default'; if(editor) editor.layout(); }
});

// Save shortcut mapping
document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); runCode(); } });