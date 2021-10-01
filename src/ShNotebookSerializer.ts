import { NotebookCellData, NotebookCellKind, NotebookData, NotebookSerializer } from "vscode";

function createCell(cellKind: NotebookCellKind, source: string[]): NotebookCellData {
	return new NotebookCellData(
		cellKind,
		source.join('\n'),
		cellKind === NotebookCellKind.Markup ? "markdown" : "shellscript");
}

export class ShNotebookSerializer implements NotebookSerializer {
    static type: string = 'shnb';

    deserializeNotebook(data: Uint8Array): NotebookData {
        const cells: NotebookCellData[] = [];
        const str = Buffer.from(data).toString();

        let lines: string[];
        // store the line ending in the metadata of the document
        // so that we honor the line ending of the original file
        // on save.
        let lineEnding: string;
        if (str.indexOf('\r\n') !== -1) {
            lines = str.split(/\r\n/g);
            lineEnding = '\r\n';
        } else {
            lines = str.split(/\n/g);
            lineEnding = '\n';
        }

        let currentCellSource: string[] = [];
        let cellKind: NotebookCellKind | undefined;
        let insideBlockComment: boolean = false;


        // This dictates whether the BlockComment cell was read in with content on the same
        // line as the opening <#. This is so we can preserve the format of the backing file on save.
        let openBlockCommentOnOwnLine: boolean = false;

        // Iterate through all lines in a document (aka ps1 file) and group the lines
        // into cells (markdown or code) that will be rendered in Notebook mode.
        // tslint:disable-next-line: prefer-for-of
        for (let i = 0; i < lines.length; i++) {
            // Handle everything else (regular comments and code)
            // If a line starts with # it's a comment
            const kind: NotebookCellKind = lines[i].startsWith("#") ? NotebookCellKind.Markup : NotebookCellKind.Code;

            // If this line is a continuation of the previous cell type, then add this line to the current cell source.
            if (kind === cellKind) {
                currentCellSource.push(kind === NotebookCellKind.Markup && !insideBlockComment ? lines[i].replace(/^\#\s*/, "") : lines[i]);
            } else {
                // If cellKind has a value, then we can add the cell we've just computed.
                if (cellKind) {
                    cells.push(createCell(
                        cellKind,
                        currentCellSource
                    ));
                }

                // set initial new cell state
                currentCellSource = [];
                cellKind = kind;
                currentCellSource.push(kind === NotebookCellKind.Markup ? lines[i].replace(/^\#\s*/, "") : lines[i]);
            }
        }

        // If we have some leftover lines that have not been added (for example,
        // when there is only the _start_ of a block comment but not an _end_.)
        // add the appropriate cell.
        if (currentCellSource.length) {
            cells.push(createCell(
                cellKind!,
                currentCellSource
            ));
        }

        const notebookData = new NotebookData(cells);
        notebookData.metadata = {
            custom: {
                lineEnding
            }
        };
        return notebookData;
    }

    serializeNotebook(data: NotebookData): Uint8Array {
        const retArr: string[] = [];
        for (const cell of data.cells) {
            if (cell.kind === NotebookCellKind.Code) {
                retArr.push(...cell.value.split(/\r\n|\n/));
            } else {
                retArr.push(...cell.value.split(/\r\n|\n/).map((line) => `# ${line}`));
            }
        }

        const eol: string = data.metadata?.custom.lineEnding;
        return Buffer.from(retArr.join(eol));
    }
}
