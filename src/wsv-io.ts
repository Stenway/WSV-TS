/* (C) Stefan John / Stenway / WhitespaceSV.com / 2022 */

import { ReliableTxtDocument, ReliableTxtLines, ReliableTxtEncoding } from "./reliabletxt.js"
import { ReliableTxtFile, SyncReliableTxtStreamReader, SyncReliableTxtStreamWriter } from "./reliabletxt-io.js"
import { WsvDocument, WsvLine } from "./wsv.js"

// ----------------------------------------------------------------------

export abstract class WsvFile {
	static loadSync(filePath: string, preserveWhitespacesAndComments: boolean = true): WsvDocument {
		let reliableTxtDocument: ReliableTxtDocument = ReliableTxtFile.loadSync(filePath)
		let wsvDocument: WsvDocument = WsvDocument.parse(reliableTxtDocument.text, preserveWhitespacesAndComments)
		wsvDocument.encoding = reliableTxtDocument.encoding
		return wsvDocument
	}

	static saveSync(document: WsvDocument, filePath: string, preserveWhitespacesAndComments: boolean = true) {
		let text: string = document.toString(preserveWhitespacesAndComments)
		ReliableTxtFile.writeAllTextSync(text, filePath, document.encoding)
	}

	static appendSync(document: WsvDocument, filePath: string, preserveWhitespacesAndComments: boolean = true) {
		let text: string = document.toString(preserveWhitespacesAndComments)
		let lines: string[] = ReliableTxtLines.split(text)
		ReliableTxtFile.appendAllLinesSync(lines, filePath, document.encoding)
	}
}

// ----------------------------------------------------------------------

export class SyncWsvStreamReader {
	private reader: SyncReliableTxtStreamReader
	private preserveWhitespacesAndComments: boolean

	get encoding(): ReliableTxtEncoding {
		return this.reader.encoding
	}

	get isClosed(): boolean {
		return this.reader.isClosed
	}

	constructor(filePath: string, preserveWhitespacesAndComments: boolean = true, chunkSize: number = 4096) {
		this.preserveWhitespacesAndComments = preserveWhitespacesAndComments
		this.reader = new SyncReliableTxtStreamReader(filePath, chunkSize)
	}

	readLine(): WsvLine | null {
		let lineStr: string | null = this.reader.readLine()
		if (lineStr === null) { return null }
		return WsvLine.parse(lineStr, this.preserveWhitespacesAndComments)
	}

	close() {
		this.reader.close()
	}
}

// ----------------------------------------------------------------------

export class SyncWsvStreamWriter {
	private writer: SyncReliableTxtStreamWriter
	private preserveWhitespacesAndComments: boolean

	constructor(filePath: string, createWithEncoding: ReliableTxtEncoding = ReliableTxtEncoding.Utf8, append: boolean = false, preserveWhitespacesAndComments: boolean = true) {
		this.preserveWhitespacesAndComments = preserveWhitespacesAndComments
		this.writer = new SyncReliableTxtStreamWriter(filePath, createWithEncoding, append)
	}

	writeLine(line: WsvLine) {
		let lineStr: string = line.toString(this.preserveWhitespacesAndComments)
		this.writer.writeLine(lineStr)
	}

	writeDocument(document: WsvDocument) {
		let content: string = document.toString(this.preserveWhitespacesAndComments)
		this.writer.writeLine(content)
	}

	close() {
		this.writer.close()
	}
}