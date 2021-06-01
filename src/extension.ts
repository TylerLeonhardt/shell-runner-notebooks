// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { PowerShellNotebookSerializer } from './PowerShellNotebookSerializer';
import { ShNotebookSerializer } from './ShNotebookSerializer';

function getExecuteHandler(controller: vscode.NotebookController) {
	return async (cells: vscode.NotebookCell[]) => {
		if (!vscode.window.activeTerminal) {
			await vscode.commands.executeCommand('workbench.action.terminal.focus');
		}

		for (const cell of cells) {
			const execution = controller.createNotebookCellExecution(cell);
			execution.start();
			const cellContent = execution.cell.document.getText();
			vscode.window.activeTerminal!.sendText(cellContent);
			execution.end();
		}
	}
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.notebooks.registerNotebookSerializer(
		PowerShellNotebookSerializer.type,
		new PowerShellNotebookSerializer(),
		{ transientOutputs: true }));

	context.subscriptions.push(vscode.notebooks.registerNotebookSerializer(
		ShNotebookSerializer.type,
		new ShNotebookSerializer(),
		{ transientOutputs: true }));

	// "execute" a PowerShell cell
	const pwshController = vscode.notebooks.createNotebookController('powershellfile-kernel', 'pwshnb', 'PowerSell');
	pwshController.supportedLanguages = ['powershell'];
	pwshController.executeHandler = getExecuteHandler(pwshController);
	context.subscriptions.push(pwshController);

	// "execute" a shell cell
	const shController = vscode.notebooks.createNotebookController('shellfile-kernel', 'shnb', 'Shell');
	shController.supportedLanguages = ['shellscript'];
	shController.executeHandler = getExecuteHandler(shController);
	context.subscriptions.push(shController);
}

// this method is called when your extension is deactivated
export function deactivate() {}
