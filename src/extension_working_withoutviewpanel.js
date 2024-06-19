const vscode = require('vscode');
const path = require('path');
const axios = require('axios');
const fs = require('fs');

function activate(context) {
    let disposable = vscode.commands.registerCommand('extension.showApiData', function () {
        const panel = vscode.window.createWebviewPanel(
            'apiData',
            'API Data',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
            }
        );

        const apiConfigPath = path.join(context.extensionPath, 'src', 'apiConfig.json');
        const apiConfig = JSON.parse(fs.readFileSync(apiConfigPath, 'utf8'));

        let tabs = '';
        let contents = '';

        apiConfig.apis.forEach(api => {
            tabs += `<button class="tablink" onclick="openPage('${api.name}', this)">${api.name}</button>`;
            contents += `<div id="${api.name}" class="tabcontent"></div>`;
        });

        panel.webview.html = getWebviewContent(tabs, contents);

        apiConfig.apis.forEach(api => {
            axios.get(api.url)
                .then(response => {
                    const data = response.data;
                    panel.webview.postMessage({ api: api.name, data: formatDataToHTML(api.name, data) });
                })
                .catch(error => {
                    panel.webview.postMessage({ api: api.name, data: `Error: ${error.message}` });
                });
        });

        setInterval(() => {
            apiConfig.apis.forEach(api => {
                axios.get(api.url)
                    .then(response => {
                        const data = response.data;
                        panel.webview.postMessage({ api: api.name, data: formatDataToHTML(api.name, data) });
                    })
                    .catch(error => {
                        panel.webview.postMessage({ api: api.name, data: `Error: ${error.message}` });
                    });
            });
        }, 3600000); // 1 hour interval
    });

    context.subscriptions.push(disposable);
}

function formatDataToHTML(apiName, data) {
    let html = '<table border="1" style="width: 100%; border-collapse: collapse;">';

    if (Array.isArray(data)) {
        // Table headers
        html += '<tr>';
        for (let key in data[0]) {
            html += `<th>${key}</th>`;
        }
        html += '</tr>';

        // Table rows
        data.forEach(item => {
            html += '<tr>';
            for (let key in item) {
                html += `<td>${item[key]}</td>`;
            }
            html += '</tr>';
        });
    } else if (typeof data === 'object') {
        for (let key in data) {
            html += `<tr><th>${key}</th><td>${data[key]}</td></tr>`;
        }
    } else {
        html += `<tr><td>${data}</td></tr>`;
    }

    html += '</table>';
    return html;
}

function getWebviewContent(tabs, contents) {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>API Data</title>
            <style>
                body { font-family: Arial, sans-serif; }
                .tablink { background-color: #555; color: white; padding: 14px 16px; cursor: pointer; }
                .tabcontent { display: none; padding: 20px; }
                .tabcontent table { width: 100%; border-collapse: collapse; }
                .tabcontent th, .tabcontent td { border: 1px solid black; padding: 8px; text-align: left; }
                .tabcontent th { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
            ${tabs}
            ${contents}
            <script>
                function openPage(pageName, elmnt) {
                    var i, tabcontent, tablinks;
                    tabcontent = document.getElementsByClassName("tabcontent");
                    for (i = 0; i < tabcontent.length; i++) {
                        tabcontent[i].style.display = "none";
                    }
                    tablinks = document.getElementsByClassName("tablink");
                    for (i = 0; i < tablinks.length; i++) {
                        tablinks[i].style.backgroundColor = "";
                    }
                    document.getElementById(pageName).style.display = "block";
                    elmnt.style.backgroundColor = "#111";
                }

                window.addEventListener('message', event => {
                    const message = event.data;
                    document.getElementById(message.api).innerHTML = message.data;
                });

                document.querySelector('.tablink').click(); // Open the first tab by default
            </script>
        </body>
        </html>
    `;
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
