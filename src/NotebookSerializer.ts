import { TextDecoder, TextEncoder } from 'util';
import * as vscode from 'vscode';

interface RawNotebookCell {
	language: string;
	value: string;
	kind: vscode.NotebookCellKind;
    editable?: boolean;
}

export class NotebookSerializer implements vscode.NotebookSerializer {
    static type: string = 'shell-notebook';

    async deserializeNotebook(content: Uint8Array, _token: vscode.CancellationToken): Promise<vscode.NotebookData> {
        var contents = new TextDecoder().decode(content);    // convert to String to make JSON object

        // Read file contents
		let raw: RawNotebookCell[];
		try {
			raw = <RawNotebookCell[]>JSON.parse(contents);
		} catch {
			raw = [];
		}

        // Create array of Notebook cells for the VS Code API from file contents
		const cells = raw.map(item => new vscode.NotebookCellData(
			item.kind,
			item.value,
			item.language
		));

        // Pass read and formatted Notebook Data to VS Code to display Notebook with saved cells
		return new vscode.NotebookData(
			cells
		);
    }

    async serializeNotebook(data: vscode.NotebookData, _token: vscode.CancellationToken): Promise<Uint8Array> {
        // Map the Notebook data into the format we want to save the Notebook data as

		let contents: RawNotebookCell[] = [];

		for (const cell of data.cells) {
			contents.push({
				kind: cell.kind,
				language: cell.languageId,
				value: cell.value
			});
		}

        // Give a string of all the data to save and VS Code will handle the rest 
		return new TextEncoder().encode(JSON.stringify(contents));
    }    
}