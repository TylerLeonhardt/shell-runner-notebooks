import { NotebookCellData, NotebookCellKind, NotebookData, NotebookSerializer } from "vscode";


interface IPowerShellNotebookCellMetadata {
    commentType: CommentType;
    openBlockCommentOnOwnLine?: boolean;
    closeBlockCommentOnOwnLine?: boolean;
}

enum CommentType {
    Disabled = "Disabled",
    BlockComment = "BlockComment",
    LineComment = "LineComment",
}

function createCell(cellKind: NotebookCellKind, source: string[], metadata: IPowerShellNotebookCellMetadata): NotebookCellData {
	const cell = new NotebookCellData(
		cellKind,
		source.join('\n'),
		cellKind === NotebookCellKind.Markup ? "markdown" : "powershell");
    cell.metadata = metadata;
    return cell;
}

export class PowerShellNotebookSerializer implements NotebookSerializer {
    static type: string = 'pwshnb';

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
            // Handle block comments
            if (insideBlockComment) {
                if (lines[i].endsWith("#>")) {
                    // Get the content of the current line without #>
                    const currentLine = lines[i]
                        .substring(0, lines[i].length - 2)
                        .trimRight();

                    // This dictates whether the BlockComment cell was read in with content on the same
                    // line as the closing #>. This is so we can preserve the format of the backing file
                    // on save.
                    let closeBlockCommentOnOwnLine: boolean = true;
                    if (currentLine) {
                        closeBlockCommentOnOwnLine = false;
                        currentCellSource.push(currentLine);
                    }

                    // We've reached the end of a block comment,
                    // push a markdown cell.
                    insideBlockComment = false;

                    cells.push(createCell(
                        NotebookCellKind.Markup,
                        currentCellSource,
                        {
                            commentType: CommentType.BlockComment,
                            openBlockCommentOnOwnLine,
                            closeBlockCommentOnOwnLine
                        }
                    ));

                    currentCellSource = [];
                    cellKind = undefined;
                    continue;
                }

                // If we're still in a block comment, push the line and continue.
                currentCellSource.push(lines[i]);
                continue;
            } else if (lines[i].startsWith("<#")) {
                // If we found the start of a block comment,
                // insert what we saw leading up to this.
                // If cellKind is null/undefined, that means we
                // are starting the file with a BlockComment.
                if (cellKind) {
                    cells.push(createCell(
                        cellKind,
                        currentCellSource,
                        {
                            commentType: cellKind === NotebookCellKind.Markup ? CommentType.LineComment : CommentType.Disabled,
                        }
                    ));
                }

                // We're starting a new Markdown cell.
                cellKind = NotebookCellKind.Markup;
                insideBlockComment = true;

                // Get the content of the current line without `<#`
                const currentLine = lines[i]
                    .substring(2, lines[i].length)
                    .trimLeft();

                // If we have additional text on the line with the `<#`
                // We need to keep track of what comes after it.
                if (currentLine) {
                    // If both the `<#` and the `#>` are on the same line
                    // we want to push a markdown cell.
                    if (currentLine.endsWith("#>")) {
                        // Get the content of the current line without `#>`
                        const newCurrentLine = currentLine
                            .substring(0, currentLine.length - 2)
                            .trimRight();

                        cells.push(createCell(
                            NotebookCellKind.Markup,
                            [ newCurrentLine ],
                            {
                                commentType: CommentType.BlockComment,
                                openBlockCommentOnOwnLine: false,
                                closeBlockCommentOnOwnLine: false,
                            }
                        ));

                        // Reset
                        currentCellSource = [];
                        cellKind = undefined;
                        insideBlockComment = false;
                        continue;
                    }

                    openBlockCommentOnOwnLine = false;
                    currentCellSource = [ currentLine ];
                } else {
                    openBlockCommentOnOwnLine = true;
                    currentCellSource = [];
                }

                continue;
            }

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
                        currentCellSource,
                        {
                            commentType: cellKind === NotebookCellKind.Markup ? CommentType.LineComment : CommentType.Disabled,
                        }
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
                currentCellSource,
                {
                    commentType: cellKind === NotebookCellKind.Markup ? CommentType.LineComment : CommentType.Disabled,
                }
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
                // First honor the comment type of the cell if it already has one.
                // If not, use the user setting.
                const commentKind: CommentType = cell.metadata?.custom?.commentType || CommentType.LineComment;

                if (commentKind === CommentType.BlockComment) {
                    const openBlockCommentOnOwnLine: boolean = cell.metadata?.custom?.openBlockCommentOnOwnLine;
                    const closeBlockCommentOnOwnLine: boolean = cell.metadata?.custom?.closeBlockCommentOnOwnLine;
                    const text = cell.value.split(/\r\n|\n/);
                    if (openBlockCommentOnOwnLine) {
                        retArr.push("<#");
                    } else {
                        text[0] = `<# ${text[0]}`;
                    }

                    if (!closeBlockCommentOnOwnLine) {
                        text[text.length - 1] += " #>";
                        retArr.push(...text);
                    } else {
                        retArr.push(...text);
                        retArr.push("#>");
                    }
                } else {
                    retArr.push(...cell.value.split(/\r\n|\n/).map((line) => `# ${line}`));
                }
            }
        }

        const eol: string = data.metadata?.custom.lineEnding;
        return Buffer.from(retArr.join(eol));
    }
}
