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

        // Handle message from webview (for fetching data based on input)
        panel.webview.onDidReceiveMessage(message => {
            if (message.command === 'fetchData') {
                const { projectId, appName, pipelineName } = message.data;

                // Update API URLs based on input fields
                apiConfig.apis.forEach(api => {
                    api.url = `https://jsonplaceholder.typicode.com/${projectId}/${appName}/${pipelineName}`;
                });

                fetchDataAndUpdate(panel, apiConfig);
            }
        });

        // Fetch initial data
        fetchDataAndUpdate(panel, apiConfig);

        // Periodically update data every 1 hour
        setInterval(() => {
            fetchDataAndUpdate(panel, apiConfig);
        }, 3600000);

        context.subscriptions.push(panel);
    });

    context.subscriptions.push(disposable);
}

async function fetchDataAndUpdate(panel, apiConfig) {
    for (const api of apiConfig.apis) {
        try {
            const response = await axios.get(api.url);
            const data = response.data;
            panel.webview.postMessage({ api: api.name, data: formatDataToHTML(api.name, data) });
        } catch (error) {
            panel.webview.postMessage({ api: api.name, data: `Error: ${error.message}` });
        }
    }
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
                .tablink { background-color: #555; color: white; padding: 10px 12px; cursor: pointer; }
                .tabcontent { display: none; padding: 12px; }
                .tabcontent table { width: 100%; border-collapse: collapse; }
                .tabcontent th, .tabcontent td { border: 1px solid black; padding: 4px; text-align: left; }
                .tabcontent th { background-color: #f2f2f2; }
                .input-container { margin-bottom: 12px; }
                .input-container h2 { font-size: 14px; margin-bottom: 6px; }
                .input-container input[type="text"] { width: calc(100% - 80px); padding: 4px; margin-bottom: 6px; font-size: 12px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
                .input-container button { background-color: #4CAF50; color: white; padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
                .input-container button:hover { background-color: #45a049; }
            </style>
        </head>
        <body>
            <div class="input-container">
                <h2>Enter API Parameters:</h2>
                <input type="text" id="projectId" placeholder="Project ID">
                <input type="text" id="appName" placeholder="App Name">
                <input type="text" id="pipelineName" placeholder="Pipeline Name">
                <button onclick="fetchData()">Fetch Data</button>
            </div>
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

                function fetchData() {
                    const projectId = document.getElementById('projectId').value;
                    const appName = document.getElementById('appName').value;
                    const pipelineName = document.getElementById('pipelineName').value;

                    // Send message to extension with input data
                    const message = { command: 'fetchData', data: { projectId, appName, pipelineName } };
                    vscode.postMessage(message);
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
