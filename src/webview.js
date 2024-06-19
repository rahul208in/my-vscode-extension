(function () {
    const vscode = acquireVsCodeApi();

    // Function to handle button click event and send input values to extension
    document.querySelector('button').addEventListener('click', () => {
        const projectId = document.getElementById('projectId').value;
        const appName = document.getElementById('appName').value;
        const pipelineName = document.getElementById('pipelineName').value;

        vscode.postMessage({
            command: 'fetchData',
            data: {
                projectId,
                appName,
                pipelineName
            }
        });
    });
})();
