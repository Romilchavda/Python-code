// ==========================================
// FILE: system.js (Variables, File Explorer, Upload/Download)
// ==========================================

const defaultFiles = {};
let files = JSON.parse(localStorage.getItem('ide_files_v2')) || defaultFiles;
let currentFile = localStorage.getItem('ide_currentFile_v2') || null;
let openTabs = JSON.parse(localStorage.getItem('ide_openTabs_v2')) || [];
let monacoModels = {};
let editor;

const terminal = document.getElementById("terminal-output");
const webPreview = document.getElementById("web-preview");
const runBtn = document.getElementById("runBtn");
const btnExternal = document.getElementById("btn-external");

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
    if (!filename) return icons.default;
    if (filename.endsWith('.py')) return icons.py;
    if (filename.endsWith('.html')) return icons.html;
    if (filename.endsWith('.css')) return icons.css;
    if (filename.endsWith('.js')) return icons.js;
    if (filename.endsWith('.json')) return icons.json;
    if (filename.includes('/')) return icons.folder;
    return icons.default;
}

function getLanguage(filename) {
    if (!filename) return 'plaintext';
    if (filename.endsWith('.py')) return 'python';
    if (filename.endsWith('.html')) return 'html';
    if (filename.endsWith('.css')) return 'css';
    if (filename.endsWith('.js')) return 'javascript';
    if (filename.endsWith('.json')) return 'json';
    return 'plaintext';
}

function saveState() {
    localStorage.setItem('ide_files_v2', JSON.stringify(files));
    localStorage.setItem('ide_currentFile_v2', currentFile);
    localStorage.setItem('ide_openTabs_v2', JSON.stringify(openTabs));
}

function showModal(title, type, defaultValue, callback) {
    const modal = document.getElementById('custom-modal');
    const inputEl = document.getElementById('modal-input');
    const msgEl = document.getElementById('modal-message');
    const confirmBtn = document.getElementById('modal-confirm-btn');
    
    document.getElementById('modal-title').innerText = title;
    modal.classList.add('active');
    
    if (type === 'input') { inputEl.style.display = 'block'; msgEl.style.display = 'none'; inputEl.value = defaultValue || ''; inputEl.focus(); } 
    else { inputEl.style.display = 'none'; msgEl.style.display = 'block'; msgEl.innerText = defaultValue; }
    
    confirmBtn.onclick = () => { closeModal(); if (type === 'input') { if (inputEl.value.trim() !== '') callback(inputEl.value.trim()); } else { callback(true); } };
    inputEl.onkeypress = (e) => { if (e.key === 'Enter') confirmBtn.click(); };
}

function closeModal() { document.getElementById('custom-modal').classList.remove('active'); }

function renderUI() {
    const fileTree = document.getElementById('fileTree');
    const fileTabs = document.getElementById('fileTabs');
    fileTree.innerHTML = ''; fileTabs.innerHTML = '';
    
    Object.keys(files).sort().forEach(filename => {
        if (filename.endsWith('.keep')) return;
        let displayName = filename.includes('/') ? filename.split('/')[1] : filename;
        let isFolderStr = filename.includes('/') ? `<span style="color:#8b949e;font-size:11px;">${filename.split('/')[0]}/</span> ` : '';
        
        let div = document.createElement('div');
        div.className = `tree-item ${filename === currentFile ? 'active' : ''}`;
        div.innerHTML = `<div class="item-left" onclick="openFile('${filename}')"><img src="${getIcon(filename)}" class="item-icon"><span>${isFolderStr}${displayName}</span></div>
                         <div class="tree-actions"><i class="codicon codicon-edit" onclick="renameFile('${filename}')" title="Rename"></i><i class="codicon codicon-trash del" onclick="deleteFile('${filename}')" title="Delete"></i></div>`;
        fileTree.appendChild(div);
    });
    
    openTabs.forEach(filename => {
        if (files[filename] === undefined) return;
        let displayName = filename.includes('/') ? filename.split('/')[1] : filename;
        let tab = document.createElement('div');
        tab.className = `tab ${filename === currentFile ? 'active' : ''}`;
        tab.innerHTML = `<img src="${getIcon(filename)}" class="item-icon" style="width:14px;height:14px;"><span onclick="switchFile('${filename}')">${displayName}</span><i class="codicon codicon-close tab-close" onclick="closeTab('${filename}')"></i>`;
        fileTabs.appendChild(tab);
    });
    
    if (currentFile) {
        document.getElementById('current-language').innerText = getLanguage(currentFile).toUpperCase();
        runBtn.innerHTML = `<i class="codicon codicon-play"></i> Run`; runBtn.disabled = false;
    } else {
        document.getElementById('current-language').innerText = "NONE";
        runBtn.innerHTML = `No File`; runBtn.disabled = true;
    }
}

function openFile(filename) { if (!openTabs.includes(filename)) openTabs.push(filename); switchFile(filename); if (window.innerWidth <= 768) toggleSidebar(); }
function closeTab(filename) {
    openTabs = openTabs.filter(t => t !== filename);
    if (currentFile === filename) {
        currentFile = openTabs.length > 0 ? openTabs[openTabs.length - 1] : null;
        if (currentFile) switchFile(currentFile); else { editor.setModel(null); currentFile = null; renderUI(); }
    } else { renderUI(); } saveState();
}
function switchFile(filename) {
    currentFile = filename;
    if (editor) { if (filename && monacoModels[filename]) { editor.setModel(monacoModels[filename]); monaco.editor.setModelLanguage(monacoModels[filename], getLanguage(filename)); } else { editor.setModel(null); } }
    renderUI(); saveState();
}

function addNewFile() { showModal("Create New File", "input", "", (name) => { if (files[name] === undefined) { files[name] = ""; monacoModels[name] = monaco.editor.createModel("", getLanguage(name)); openFile(name); } else { showModal("Error", "confirm", "File already exists!", () => {}); } }); }
function addNewFolder() { showModal("Create New Folder", "input", "", (name) => { files[`${name}/.keep`] = ""; renderUI(); saveState(); }); }
function deleteFile(filename) { showModal("Delete File", "confirm", `Are sure to delete '${filename}'?`, (c) => { if (c) { delete files[filename]; if (monacoModels[filename]) monacoModels[filename].dispose(); closeTab(filename); } }); }
function renameFile(oldName) { showModal("Rename File", "input", oldName, (newName) => { if (newName !== oldName && files[newName] === undefined) { files[newName] = files[oldName]; delete files[oldName]; monacoModels[newName] = monacoModels[oldName]; delete monacoModels[oldName]; if (openTabs.includes(oldName)) openTabs[openTabs.indexOf(oldName)] = newName; if (currentFile === oldName) currentFile = newName; renderUI(); saveState(); } }); }

async function downloadProject() {
    try {
        if (Object.keys(files).length === 0) return showModal("Error", "confirm", "No files!", () => {});
        const dlBtn = document.querySelector('.codicon-archive'); if (dlBtn) dlBtn.className = "codicon codicon-sync codicon-modifier-spin icon-btn";
        const zip = new JSZip(); for (const [path, content] of Object.entries(files)) { if (!path.endsWith('.keep')) zip.file(path, content); }
        const blob = await zip.generateAsync({ type: "blob" });
        const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "RC_Code_Project.zip";
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        if (dlBtn) dlBtn.className = "codicon codicon-archive icon-btn";
    } catch (err) { showModal("Error", "confirm", err.message, () => {}); }
}

function uploadFiles(event) {
    const uFiles = event.target.files; if (uFiles.length === 0) return;
    for (let file of uFiles) { const reader = new FileReader(); reader.onload = function(e) { files[file.name] = e.target.result; if (monacoModels[file.name]) monacoModels[file.name].dispose(); monacoModels[file.name] = monaco.editor.createModel(e.target.result, getLanguage(file.name)); renderUI(); saveState(); }; reader.readAsText(file); }
    event.target.value = ""; showModal("Success", "confirm", `${uFiles.length} file(s) uploaded!`, () => {});
}

// Resizers & Sidebar Logic
function toggleSidebar() { let s = document.getElementById('sidebar'), o = document.getElementById('mobile-overlay'); if (window.innerWidth <= 768) { s.classList.toggle('mobile-active'); o.classList.toggle('active'); } else { s.style.display = s.style.display === 'none' ? 'flex' : 'none'; document.getElementById('resizer-v').style.display = s.style.display === 'none' ? 'none' : 'block'; } setTimeout(() => { if (editor) editor.layout(); }, 300); }
window.addEventListener('resize', () => { let s = document.getElementById('sidebar'), o = document.getElementById('mobile-overlay'); if (window.innerWidth > 768) { s.classList.remove('mobile-active'); o.classList.remove('active'); s.style.display = 'flex'; document.getElementById('resizer-v').style.display = 'block'; } else { s.style.display = ''; document.getElementById('resizer-v').style.display = ''; } if (editor) setTimeout(() => editor.layout(), 100); });
let isResizingV = false; document.getElementById('resizer-v').addEventListener('mousedown', () => { isResizingV = true; document.body.style.cursor = 'col-resize'; }); document.addEventListener('mousemove', (e) => { if (isResizingV) { let w = e.clientX - 48; if (w > 150 && w < 500) document.getElementById('sidebar').style.width = w + 'px'; } }); document.addEventListener('mouseup', () => { if (isResizingV) { isResizingV = false; document.body.style.cursor = 'default'; if (editor) editor.layout(); } });
let isResizingH = false; document.getElementById('resizer-h').addEventListener('mousedown', () => { isResizingH = true; document.body.style.cursor = 'row-resize'; }); document.addEventListener('mousemove', (e) => { if (isResizingH) { let h = window.innerHeight - e.clientY - 22; if (h > 100 && h < window.innerHeight * 0.8) document.getElementById('terminal-container').style.height = h + 'px'; } }); document.addEventListener('mouseup', () => { if (isResizingH) { isResizingH = false; document.body.style.cursor = 'default'; if (editor) editor.layout(); } });

// ==========================================
// ⚙️ EDITOR SETTINGS LOGIC
// ==========================================

// Default Settings
const defaultSettings = {
    theme: "vs-dark",
    fontSize: 14,
    wordWrap: "off",
    minimap: false // Mobile/Web ke liye minimap default off rakhna better hai
};

// Load settings from LocalStorage
let userSettings = JSON.parse(localStorage.getItem('rc_editor_settings')) || defaultSettings;

// Modal Open/Close Functions
function openSettings() {
    // Current settings ko Modal inputs me set karo
    document.getElementById('set-theme').value = userSettings.theme;
    document.getElementById('set-fontsize').value = userSettings.fontSize;
    document.getElementById('set-wordwrap').value = userSettings.wordWrap;
    document.getElementById('set-minimap').value = userSettings.minimap.toString();
    
    document.getElementById('settings-modal').classList.add('active');
}

function closeSettings() {
    document.getElementById('settings-modal').classList.remove('active');
}

// Save & Apply Settings
function saveSettings() {
    // Modal se nayi values lo
    userSettings.theme = document.getElementById('set-theme').value;
    userSettings.fontSize = parseInt(document.getElementById('set-fontsize').value);
    userSettings.wordWrap = document.getElementById('set-wordwrap').value;
    userSettings.minimap = document.getElementById('set-minimap').value === "true";

    // LocalStorage me save karo
    localStorage.setItem('rc_editor_settings', JSON.stringify(userSettings));
    
    // Monaco editor me apply karo
    applySettingsToEditor();
    
    closeSettings();
}

// Ye function actual Monaco Editor ka roop badalta hai
function applySettingsToEditor() {
    if (typeof monaco !== 'undefined') {
        // Theme Update
        monaco.editor.setTheme(userSettings.theme);
        
        // Agar aapke paas global 'editor' variable hai (jo Monaco init ke baad banta hai)
        // Ye sabhi khule hue editors (tabs) ki settings update kar dega
        const allEditors = monaco.editor.getEditors();
        allEditors.forEach(ed => {
            ed.updateOptions({
                fontSize: userSettings.fontSize,
                wordWrap: userSettings.wordWrap,
                minimap: { enabled: userSettings.minimap }
            });
        });
    }
}

// Jab page load ho, toh 2 second baad Monaco check karke apply kar do
setTimeout(() => {
    applySettingsToEditor();
}, 2000);