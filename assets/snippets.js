// ==========================================
// FILE: snippets.js (Custom Snippet Manager)
// ==========================================

const defaultSnippets = {
    html: [{ trigger: "html5", code: "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n\t<meta charset=\"UTF-8\">\n\t<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n\t<title>RC Document</title>\n\t<link rel=\"stylesheet\" href=\"style.css\">\n</head>\n<body>\n\t$1\n\n\t<script src=\"script.js\"></script>\n</body>\n</html>" }],
    css: [{ trigger: "cssBoilerPlate", code: "* {\n\tmargin: 0;\n\tpadding: 0;\n\tbox-sizing: border-box;\n}\n$1" }],
    javascript: [{ trigger: "log", code: "console.log($1);" }, { trigger: "af", code: "const functionName = () => {\n\t$1\n};" }]
};

let userSnippets = JSON.parse(localStorage.getItem('rc_user_snippets')) || defaultSnippets;

function saveSnippetsToStorage() { localStorage.setItem('rc_user_snippets', JSON.stringify(userSnippets)); }

function openSnippetManager() { document.getElementById('snippet-modal').classList.add('active'); renderSnippetList(); }
function closeSnippetManager() { document.getElementById('snippet-modal').classList.remove('active'); }

function renderSnippetList() {
    const listDiv = document.getElementById('snippet-list'); listDiv.innerHTML = '';
    ['html', 'css', 'python', 'javascript'].forEach(lang => {
        if(userSnippets[lang] && userSnippets[lang].length > 0) {
            userSnippets[lang].forEach((snip, index) => {
                let item = document.createElement('div');
                item.style.cssText = "display: flex; justify-content: space-between; background: #2d2d2d; padding: 6px 10px; margin-bottom: 5px; border-radius: 4px; color: #ddd;";
                item.innerHTML = `<span><span style="color:#569CD6;">[${lang}]</span> <b>${snip.trigger}</b></span> <i class="codicon codicon-trash" style="cursor:pointer; color:#f44336;" onclick="deleteSnippet('${lang}', ${index})"></i>`;
                listDiv.appendChild(item);
            });
        }
    });
}

function saveCustomSnippet() {
    let lang = document.getElementById('snip-lang').value;
    let trigger = document.getElementById('snip-trigger').value.trim();
    let code = document.getElementById('snip-code').value;

    if(trigger === '' || code === '') { alert("Enter both Trigger and Code!"); return; }
    let existsIndex = userSnippets[lang].findIndex(s => s.trigger === trigger);
    
    if(existsIndex !== -1) userSnippets[lang][existsIndex].code = code; 
    else userSnippets[lang].push({ trigger: trigger, code: code }); 

    saveSnippetsToStorage();
    document.getElementById('snip-trigger').value = ''; document.getElementById('snip-code').value = '';
    renderSnippetList();
}

function deleteSnippet(lang, index) { userSnippets[lang].splice(index, 1); saveSnippetsToStorage(); renderSnippetList(); }