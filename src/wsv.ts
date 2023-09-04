/* (C) Stefan John / Stenway / WhitespaceSV.com / 2023 */

import { Base64String, InvalidUtf16StringError, ReliableTxtDocument, ReliableTxtEncoding, ReliableTxtLines, Utf16String } from "@stenway/reliabletxt"

// ----------------------------------------------------------------------

export class WsvParserError extends Error {
	readonly index: number
	readonly lineIndex: number
	readonly linePosition: number
	
	constructor(index: number, lineIndex: number, linePosition: number, message: string) {
		super(`${message} (${lineIndex+1}, ${linePosition+1})`)
		this.index = index
		this.lineIndex = lineIndex
		this.linePosition = linePosition
	}
}

// ----------------------------------------------------------------------

export abstract class WsvStringUtil {
	static validateWhitespaceStrings(values: (string | null)[] | null) {
		if (values !== null) {
			for (let i=0; i<values.length; i++) {
				const wsValue: string | null = values[i]
				if (wsValue === null) { continue }
				WsvStringUtil.validateWhitespaceString(wsValue, i===0)
			}
		}
	}

	static validateWhitespaceString(str: string, isFirst: boolean) {
		if (str.length === 0 && !isFirst) { throw new TypeError("Non-first whitespace string cannot be empty") }
		for (let i=0; i<str.length; i++) {
			const codeUnit: number = str.charCodeAt(i)
			switch (codeUnit) {
			case 0x0009: case 0x000B: case 0x000C: case 0x000D: case 0x0020: case 0x0085: case 0x00A0: case 0x1680: case 0x2000: case 0x2001: case 0x2002: case 0x2003: case 0x2004: case 0x2005: case 0x2006: case 0x2007: case 0x2008: case 0x2009: case 0x200A: case 0x2028: case 0x2029: case 0x202F: case 0x205F: case 0x3000:
				continue
			default:
				throw new TypeError(`Invalid code unit '${codeUnit}' in whitespace string at index ${i}`)
			}
		}
	}

	static validateComment(value: string | null) {
		if (value !== null) {
			for (let i=0; i<value.length; i++) {
				const codeUnit: number = value.charCodeAt(i)
				if (codeUnit === 0x000A) { throw new RangeError("Line feed in comment is not allowed") }
				else if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
					i++
					if (codeUnit >= 0xDC00 || i >= value.length) { throw new InvalidUtf16StringError() }
					const secondCodeUnit: number = value.charCodeAt(i)
					if (!(secondCodeUnit >= 0xDC00 && secondCodeUnit <= 0xDFFF)) { throw new InvalidUtf16StringError() }
				}
			}
		}
	}
}

// ----------------------------------------------------------------------

export class WsvLine {
	values: (string | null)[]
	
	private _whitespaces: (string | null)[] | null = null
	private _comment: string | null = null

	get hasValues(): boolean {
		return this.values.length > 0
	}

	get whitespaces(): (string | null)[] | null {
		if (this._whitespaces === null) { return null }
		return [...this._whitespaces]
	}

	set whitespaces(values: (string | null)[] | null) {
		WsvStringUtil.validateWhitespaceStrings(values)
		if (values !== null) { this._whitespaces = [...values] }
		else { this._whitespaces = null}
	}

	get comment(): string | null {
		return this._comment
	}

	set comment(value: string | null) {
		WsvStringUtil.validateComment(value)
		this._comment = value
	}

	get hasComment(): boolean {
		return this._comment !== null
	}

	constructor(values: (string | null)[], whitespaces: (string | null)[] | null = null, comment: string | null = null) {
		this.values = values
		this.whitespaces = whitespaces
		this.comment = comment
	}

	set(values: (string | null)[], whitespaces: (string | null)[] | null = null, comment: string | null = null) {
		this.values = values
		this.whitespaces = whitespaces
		this.comment = comment
	}
	
	toString(preserveWhitespaceAndComment: boolean = true): string {
		if (preserveWhitespaceAndComment) {
			return WsvSerializer.internalSerializeValuesWhitespacesAndComment(this.values, this._whitespaces, this._comment)
		} else {
			return WsvSerializer.serializeValues(this.values)
		}
	}
	
	static internal(values: (string | null)[], whitespaces: (string | null)[] | null, comment: string | null): WsvLine {
		const line: WsvLine = new WsvLine(values)
		line._whitespaces = whitespaces
		line._comment = comment
		return line
	}

	static internalWhitespaces(line: WsvLine): (string | null)[] | null {
		return line._whitespaces
	}

	static parse(str: string, preserveWhitespacesAndComments: boolean = true) {
		return WsvParser.parseLine(str, preserveWhitespacesAndComments)
	}

	static parseAsArray(str: string): (string | null)[] {
		return WsvParser.parseLine(str, false).values
	}

	static serialize(values: (string | null)[]): string {
		return WsvSerializer.serializeValues(values)
	}
}

// ----------------------------------------------------------------------

export class WsvDocument {
	lines: WsvLine[]
	encoding: ReliableTxtEncoding

	constructor(lines: WsvLine[] = [], encoding: ReliableTxtEncoding = ReliableTxtEncoding.Utf8) {
		this.lines = lines
		this.encoding = encoding
	}

	addLine(values: (string | null)[], whitespaces: (string | null)[] | null = null, comment: string | null = null) {
		const line: WsvLine = new WsvLine(values, whitespaces, comment)
		this.lines.push(line)
	}

	toJaggedArray(): (string | null)[][] {
		const array: (string | null)[][] = []
		for (const line of this.lines) {
			array.push(line.values)
		}
		return array
	}

	toString(preserveWhitespaceAndComment: boolean = true): string {
		return WsvSerializer.serializeLines(this.lines, preserveWhitespaceAndComment)
	}

	toBytes(preserveWhitespacesAndComments: boolean = true): Uint8Array {
		const str: string = this.toString(preserveWhitespacesAndComments)
		return new ReliableTxtDocument(str, this.encoding).toBytes()
	}

	toBase64String(preserveWhitespacesAndComments: boolean = true): string {
		const str: string = this.toString(preserveWhitespacesAndComments)
		return Base64String.encodeText(str, this.encoding)
	}

	toBinaryWsv(): Uint8Array {
		return BinaryWsvEncoder.encode(this)
	}

	static parse(str: string, preserveWhitespacesAndComments: boolean = true, encoding: ReliableTxtEncoding = ReliableTxtEncoding.Utf8) {
		const lines = WsvParser.parseLines(str, preserveWhitespacesAndComments)
		return new WsvDocument(lines, encoding)
	}

	static parseAsJaggedArray(str: string): (string | null)[][] {
		return WsvParser.parseAsJaggedArray(str)
	}

	static fromJaggedArray(jaggedArray: (string | null)[][], encoding: ReliableTxtEncoding = ReliableTxtEncoding.Utf8): WsvDocument {
		const document = new WsvDocument()
		for (const values of jaggedArray) {
			document.addLine(values)
		}
		document.encoding = encoding
		return document
	}

	static fromBytes(bytes: Uint8Array, preserveWhitespacesAndComments: boolean = true): WsvDocument {
		const txtDocument = ReliableTxtDocument.fromBytes(bytes)
		const document = WsvDocument.parse(txtDocument.text, preserveWhitespacesAndComments, txtDocument.encoding)
		return document
	}

	static fromLines(lines: string[], preserveWhitespacesAndComments: boolean = true, encoding: ReliableTxtEncoding = ReliableTxtEncoding.Utf8) {
		const content = ReliableTxtLines.join(lines)
		const document = WsvDocument.parse(content, preserveWhitespacesAndComments, encoding)
		return document
	}

	static fromBase64String(base64Str: string): WsvDocument {
		const bytes = Base64String.decodeAsBytes(base64Str)
		return this.fromBytes(bytes)
	}
	
	static fromBinaryWsv(bytes: Uint8Array): WsvDocument {
		return BinaryWsvDecoder.decode(bytes)
	}
}

// ----------------------------------------------------------------------

export abstract class WsvValue {
	private static containsSpecialChar(value: string): boolean {
		for (let i=0; i<value.length; i++) {
			const c: number = value.charCodeAt(i)
			switch (c) {
			case 0x0022:
			case 0x0023:
			case 0x000A:
			case 0x0009: case 0x000B: case 0x000C: case 0x000D: case 0x0020: case 0x0085: case 0x00A0: case 0x1680: case 0x2000: case 0x2001: case 0x2002: case 0x2003: case 0x2004: case 0x2005: case 0x2006: case 0x2007: case 0x2008: case 0x2009: case 0x200A: case 0x2028: case 0x2029: case 0x202F: case 0x205F: case 0x3000:
				return true
			}
			if (c >= 0xD800 && c <= 0xDFFF) {
				i++
				if (c >= 0xDC00 || i >= value.length) { throw new InvalidUtf16StringError() }
				const secondCodeUnit: number = value.charCodeAt(i)
				if (!(secondCodeUnit >= 0xDC00 && secondCodeUnit <= 0xDFFF)) { throw new InvalidUtf16StringError() }
			}
		}
		return false
	}

	static isSpecial(value: string | null): boolean {
		if (value === null || value.length === 0 || value === "-" || WsvValue.containsSpecialChar(value)) { return true }
		else { return false }
	}
	
	static serialize(value: string | null): string {
		if (value === null) {
			return "-"
		} else if (value.length === 0) {
			return "\"\""
		} else if (value === "-") {
			return "\"-\""
		} else if (WsvValue.containsSpecialChar(value)) {
			let size: number = 2
			for (let i=0; i<value.length; i++) {
				const codeUnit: number = value.charCodeAt(i)
				switch (codeUnit) {
				case 0x000A:
					size += 3
					break
				case 0x0022:
					size += 2
					break
				default:
					size++
				}
			}
			const bytes: Uint8Array = new Uint8Array(size*2)
			const view: DataView = new DataView(bytes.buffer)
			view.setUint16(0, 0x0022, false)
			let index: number = 2
			for (let i=0; i<value.length; i++) {
				const codeUnit: number = value.charCodeAt(i)
				switch (codeUnit) {
				case 0x000A:
					view.setUint16(index, 0x0022, false)
					index += 2
					view.setUint16(index, 0x002F, false)
					index += 2
					view.setUint16(index, 0x0022, false)
					index += 2
					break
				case 0x0022:
					view.setUint16(index, 0x0022, false)
					index += 2
					view.setUint16(index, 0x0022, false)
					index += 2
					break
				default:
					view.setUint16(index, codeUnit, false)
					index += 2
				}
			}
			view.setUint16(index, 0x0022, false)
			return Utf16String.fromUtf16Bytes(bytes, false, false)
		} else {
			return value
		}
	}

	static parse(str: string, allowWhitespaceAndComment: boolean = false): string | null {
		// TODO optimize
		const line = WsvParser.parseLine(str, true)
		if (line.values.length === 0) { throw new Error("No value")}
		else if (line.values.length > 1) { throw new Error("Multiple values")}
		if (!allowWhitespaceAndComment) {
			if (line.hasComment) {
				throw new Error("Comment not allowed")
			}
			const whitespaces = WsvLine.internalWhitespaces(line)
			if (whitespaces !== null && whitespaces.length > 0 && (whitespaces[0] !== null || whitespaces.length > 1)) {
				throw new Error("Whitespace not allowed")
			}
		}
		return line.values[0]
	}
}

// ----------------------------------------------------------------------

export abstract class WsvSerializer {
	static serializeValues(values: (string | null)[]): string {
		const strings: string[] = []
		for (let i=0; i<values.length; i++) {
			if (i !== 0) { strings.push(" ") }
			const serialized: string = WsvValue.serialize(values[i])
			strings.push(serialized)
		}
		return strings.join("")
	}

	static serializeJaggedArray(jaggedArray: (string | null)[][]): string {
		const lines: string[] = []
		for (const values of jaggedArray) {
			const line: string = WsvSerializer.serializeValues(values)
			lines.push(line)
		}
		return ReliableTxtLines.join(lines)
	}

	static internalSerializeValuesWhitespacesAndComment(values: (string | null)[], whitespaces: (string | null)[] | null, comment: string | null): string {
		const strings: string[] = []
		whitespaces ??= []
		for (let i=0; i<values.length; i++) {
			let whitespace: string | null = i < whitespaces.length ? whitespaces[i] : null
			whitespace ??= i !== 0 ? " " : ""
			strings.push(whitespace)
			const serialized: string = WsvValue.serialize(values[i])
			strings.push(serialized)
		}
		if (whitespaces.length > values.length) { strings.push(whitespaces[values.length] ?? "") }
		else if (comment !== null && values.length > 0 && values.length >= whitespaces.length) { strings.push(" ") }

		if (comment !== null) { strings.push("#"+comment) }
		return strings.join("")
	}

	static serializeLines(lines: WsvLine[], preserveWhitespaceAndComment: boolean = true): string {
		const lineStrings: string[] = []
		for (const line of lines) {
			lineStrings.push(line.toString(preserveWhitespaceAndComment))
		}
		return ReliableTxtLines.join(lineStrings)
	}
}

// ----------------------------------------------------------------------

export abstract class WsvParser {
	private static readonly stringNotClosed: string					= "String not closed"
	private static readonly invalidStringLineBreak: string			= "Invalid string line break"
	private static readonly invalidCharacterAfterString: string		= "Invalid character after string"
	private static readonly invalidDoubleQuoteInValue: string		= "Invalid double quote in value"

	static parseLine(str: string, preserveWhitespacesAndComments: boolean, lineIndexOffset: number = 0): WsvLine {
		const lines: WsvLine[] = WsvParser.parseLines(str, preserveWhitespacesAndComments, lineIndexOffset)
		if (lines.length !== 1) { throw new Error("Multiple WSV lines not allowed")}
		return lines[0]
	}
	
	static parseLines(str: string, preserveWhitespacesAndComments: boolean, lineIndexOffset: number = 0): WsvLine[] {
		if (preserveWhitespacesAndComments) { return WsvParser.parseLinesPreserving(str, lineIndexOffset) }
		else { return WsvParser.parseLinesNonPreserving(str, lineIndexOffset) }
	}

	private static getError(message: string, lineIndex: number, lineStartIndex: number, index: number): Error {
		return new WsvParserError(index, lineIndex, index-lineStartIndex, message)
	}

	private static parseLinesPreserving(str: string, lineIndexOffset: number): WsvLine[] {
		const lines: WsvLine[] = []
		let index: number = 0
		let startIndex: number = 0
		
		let values: (string | null)[]
		let whitespaces: (string | null)[]
		let comment: string | null

		let codeUnit: number
		let lineIndex: number = lineIndexOffset - 1
		let lineStartIndex: number
		lineLoop: for (;;) {
			lineIndex++
			lineStartIndex = index

			values = []
			whitespaces = []
			comment = null
			for (;;) {
				if (index >= str.length) {
					lines.push(WsvLine.internal(values, whitespaces, comment))
					break lineLoop
				}
				codeUnit = str.charCodeAt(index)
				startIndex = index
				wsLoop: for (;;) {
					switch (codeUnit) {
					case 0x0009: case 0x000B: case 0x000C: case 0x000D: case 0x0020: case 0x0085: case 0x00A0: case 0x1680: case 0x2000: case 0x2001: case 0x2002: case 0x2003: case 0x2004: case 0x2005: case 0x2006: case 0x2007: case 0x2008: case 0x2009: case 0x200A: case 0x2028: case 0x2029: case 0x202F: case 0x205F: case 0x3000:
						index++
						if (index >= str.length) { break wsLoop }
						codeUnit = str.charCodeAt(index)
						break
					default:
						break wsLoop
					}
				}
				if (index > startIndex) {
					const whitespace: string = str.substring(startIndex, index)
					whitespaces.push(whitespace)
					if (index >= str.length) {
						lines.push(WsvLine.internal(values, whitespaces, comment))
						break lineLoop
					}
					startIndex = index
				} else { whitespaces.push(null) }
				switch (codeUnit) {
				case 0x000A:
					lines.push(WsvLine.internal(values, whitespaces, comment))
					index++
					continue lineLoop
				case 0x0023: {
					index++
					startIndex = index
					comment = ""
					let wasLineBreak: boolean = false
					commentLoop: for (;;) {
						if (index >= str.length) { break commentLoop }
						codeUnit = str.charCodeAt(index)
						index++
						if (codeUnit === 0x000A) {
							wasLineBreak = true
							break commentLoop
						} else if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
							if (codeUnit >= 0xDC00 || index >= str.length) { throw new InvalidUtf16StringError() }
							const secondCodeUnit: number = str.charCodeAt(index)
							if (!(secondCodeUnit >= 0xDC00 && secondCodeUnit <= 0xDFFF)) { throw new InvalidUtf16StringError() }
							index++
						}
					}
					if (wasLineBreak && index-1 > startIndex) {
						comment = str.substring(startIndex, index-1)
					} else if (!wasLineBreak && index > startIndex) {
						comment = str.substring(startIndex, index)
					}
					lines.push(WsvLine.internal(values, whitespaces, comment))
					if (index >= str.length && !wasLineBreak) { break lineLoop }
					else { continue lineLoop }
				}}

				if (codeUnit === 0x0022) {
					index++
					const strCodeUnits: string[] = []
					stringCharLoop: for (;;) {
						if (index >= str.length) { throw WsvParser.getError(WsvParser.stringNotClosed, lineIndex, lineStartIndex, index) }
						codeUnit = str.charCodeAt(index)
						index++
						switch (codeUnit) {
						case 0x000A:
							throw WsvParser.getError(WsvParser.stringNotClosed, lineIndex, lineStartIndex, index-1)
						case 0x0022:
							if (index >= str.length) { break stringCharLoop }
							codeUnit = str.charCodeAt(index)
							switch (codeUnit) {
							case 0x0022:
								strCodeUnits.push("\"")
								index++
								break
							case 0x000A:
							case 0x0023:
							case 0x0009: case 0x000B: case 0x000C: case 0x000D: case 0x0020: case 0x0085: case 0x00A0: case 0x1680: case 0x2000: case 0x2001: case 0x2002: case 0x2003: case 0x2004: case 0x2005: case 0x2006: case 0x2007: case 0x2008: case 0x2009: case 0x200A: case 0x2028: case 0x2029: case 0x202F: case 0x205F: case 0x3000:
								break stringCharLoop
							case 0x002F:
								index++
								if (index >= str.length) { throw WsvParser.getError(WsvParser.invalidStringLineBreak, lineIndex, lineStartIndex, index) }
								codeUnit = str.charCodeAt(index)
								if (codeUnit !== 0x0022) { throw WsvParser.getError(WsvParser.invalidStringLineBreak, lineIndex, lineStartIndex, index) }
								strCodeUnits.push("\n")
								index++
								break
							default:
								throw WsvParser.getError(WsvParser.invalidCharacterAfterString, lineIndex, lineStartIndex, index)
							}
							break
						default:
							strCodeUnits.push(String.fromCharCode(codeUnit))
							if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
								if (codeUnit >= 0xDC00 || index >= str.length) { throw new InvalidUtf16StringError() }
								const secondCodeUnit: number = str.charCodeAt(index)
								if (!(secondCodeUnit >= 0xDC00 && secondCodeUnit <= 0xDFFF)) { throw new InvalidUtf16StringError() }
								strCodeUnits.push(String.fromCharCode(secondCodeUnit))
								index++
							}
							break
						}
					}
					values.push(strCodeUnits.join(""))
				} else {
					valueCharLoop: for (;;) {
						switch (codeUnit) {
						case 0x000A:
						case 0x0023:
						case 0x0009: case 0x000B: case 0x000C: case 0x000D: case 0x0020: case 0x0085: case 0x00A0: case 0x1680: case 0x2000: case 0x2001: case 0x2002: case 0x2003: case 0x2004: case 0x2005: case 0x2006: case 0x2007: case 0x2008: case 0x2009: case 0x200A: case 0x2028: case 0x2029: case 0x202F: case 0x205F: case 0x3000:
							break valueCharLoop
						case 0x0022:
							throw WsvParser.getError(WsvParser.invalidDoubleQuoteInValue, lineIndex, lineStartIndex, index)
						}
						if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
							index++
							if (codeUnit >= 0xDC00 || index >= str.length) { throw new InvalidUtf16StringError() }
							const secondCodeUnit: number = str.charCodeAt(index)
							if (!(secondCodeUnit >= 0xDC00 && secondCodeUnit <= 0xDFFF)) { throw new InvalidUtf16StringError() }
						}
						index++
						if (index >= str.length) { break valueCharLoop }
						codeUnit = str.charCodeAt(index)
					}
					let value: string | null = str.substring(startIndex, index)
					if (value.length === 1 && value.charCodeAt(0) === 0x002D) { value = null }
					values.push(value)
				}
			}
		}
		return lines
	}

	private static parseLinesNonPreserving(str: string, lineIndexOffset: number): WsvLine[] {
		const lines: WsvLine[] = []
		let index: number = 0
		let startIndex: number = 0
		
		let values: (string | null)[]
		
		let codeUnit: number
		let lineIndex: number = lineIndexOffset - 1
		let lineStartIndex: number
		lineLoop: for (;;) {
			lineIndex++
			lineStartIndex = index

			values = []
			for (;;) {
				if (index >= str.length) {
					lines.push(new WsvLine(values))
					break lineLoop
				}
				codeUnit = str.charCodeAt(index)
				startIndex = index
				wsLoop: for (;;) {
					switch (codeUnit) {
					case 0x0009: case 0x000B: case 0x000C: case 0x000D: case 0x0020: case 0x0085: case 0x00A0: case 0x1680: case 0x2000: case 0x2001: case 0x2002: case 0x2003: case 0x2004: case 0x2005: case 0x2006: case 0x2007: case 0x2008: case 0x2009: case 0x200A: case 0x2028: case 0x2029: case 0x202F: case 0x205F: case 0x3000:
						index++
						if (index >= str.length) { break wsLoop }
						codeUnit = str.charCodeAt(index)
						break
					default:
						break wsLoop
					}
				}
				if (index > startIndex) {
					if (index >= str.length) {
						lines.push(new WsvLine(values))
						break lineLoop
					}
					startIndex = index
				}
				switch (codeUnit) {
				case 0x000A:
					lines.push(new WsvLine(values))
					index++
					continue lineLoop
				case 0x0023: {
					index++
					startIndex = index
					let wasLineBreak: boolean = false
					commentLoop: for (;;) {
						if (index >= str.length) { break commentLoop }
						codeUnit = str.charCodeAt(index)
						index++
						if (codeUnit === 0x000A) {
							wasLineBreak = true
							break commentLoop
						} else if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
							if (codeUnit >= 0xDC00 || index >= str.length) { throw new InvalidUtf16StringError() }
							const secondCodeUnit: number = str.charCodeAt(index)
							if (!(secondCodeUnit >= 0xDC00 && secondCodeUnit <= 0xDFFF)) { throw new InvalidUtf16StringError() }
							index++
						}
					}
					lines.push(new WsvLine(values))
					if (index >= str.length && !wasLineBreak) { break lineLoop }
					else { continue lineLoop }
				}}

				if (codeUnit === 0x0022) {
					index++
					const strCodeUnits: string[] = []
					stringCharLoop: for (;;) {
						if (index >= str.length) { throw WsvParser.getError(WsvParser.stringNotClosed, lineIndex, lineStartIndex, index) }
						codeUnit = str.charCodeAt(index)
						index++
						switch (codeUnit) {
						case 0x000A:
							throw WsvParser.getError(WsvParser.stringNotClosed, lineIndex, lineStartIndex, index-1)
						case 0x0022:
							if (index >= str.length) { break stringCharLoop }
							codeUnit = str.charCodeAt(index)
							switch (codeUnit) {
							case 0x0022:
								strCodeUnits.push("\"")
								index++
								break
							case 0x000A:
							case 0x0023:
							case 0x0009: case 0x000B: case 0x000C: case 0x000D: case 0x0020: case 0x0085: case 0x00A0: case 0x1680: case 0x2000: case 0x2001: case 0x2002: case 0x2003: case 0x2004: case 0x2005: case 0x2006: case 0x2007: case 0x2008: case 0x2009: case 0x200A: case 0x2028: case 0x2029: case 0x202F: case 0x205F: case 0x3000:
								break stringCharLoop
							case 0x002F:
								index++
								if (index >= str.length) { throw WsvParser.getError(WsvParser.invalidStringLineBreak, lineIndex, lineStartIndex, index) }
								codeUnit = str.charCodeAt(index)
								if (codeUnit !== 0x0022) { throw WsvParser.getError(WsvParser.invalidStringLineBreak, lineIndex, lineStartIndex, index) }
								strCodeUnits.push("\n")
								index++
								break
							default:
								throw WsvParser.getError(WsvParser.invalidCharacterAfterString, lineIndex, lineStartIndex, index)
							}
							break
						default:
							strCodeUnits.push(String.fromCharCode(codeUnit))
							if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
								if (codeUnit >= 0xDC00 || index >= str.length) { throw new InvalidUtf16StringError() }
								const secondCodeUnit: number = str.charCodeAt(index)
								if (!(secondCodeUnit >= 0xDC00 && secondCodeUnit <= 0xDFFF)) { throw new InvalidUtf16StringError() }
								strCodeUnits.push(String.fromCharCode(secondCodeUnit))
								index++
							}
							break
						}
					}
					values.push(strCodeUnits.join(""))
				} else {
					valueCharLoop: for (;;) {
						switch (codeUnit) {
						case 0x000A:
						case 0x0023:
						case 0x0009: case 0x000B: case 0x000C: case 0x000D: case 0x0020: case 0x0085: case 0x00A0: case 0x1680: case 0x2000: case 0x2001: case 0x2002: case 0x2003: case 0x2004: case 0x2005: case 0x2006: case 0x2007: case 0x2008: case 0x2009: case 0x200A: case 0x2028: case 0x2029: case 0x202F: case 0x205F: case 0x3000:
							break valueCharLoop
						case 0x0022:
							throw WsvParser.getError(WsvParser.invalidDoubleQuoteInValue, lineIndex, lineStartIndex, index)
						}
						if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
							index++
							if (codeUnit >= 0xDC00 || index >= str.length) { throw new InvalidUtf16StringError() }
							const secondCodeUnit: number = str.charCodeAt(index)
							if (!(secondCodeUnit >= 0xDC00 && secondCodeUnit <= 0xDFFF)) { throw new InvalidUtf16StringError() }
						}
						index++
						if (index >= str.length) { break valueCharLoop }
						codeUnit = str.charCodeAt(index)
					}
					let value: string | null = str.substring(startIndex, index)
					if (value.length === 1 && value.charCodeAt(0) === 0x002D) { value = null }
					values.push(value)
				}
			}
		}
		return lines
	}

	static parseAsJaggedArray(str: string, lineIndexOffset: number = 0): (string | null)[][] {
		const lines: (string | null)[][] = []
		let index: number = 0
		let startIndex: number = 0
		
		let values: (string | null)[]
		
		let codeUnit: number
		let lineIndex: number = lineIndexOffset - 1
		let lineStartIndex: number
		lineLoop: for (;;) {
			lineIndex++
			lineStartIndex = index

			values = []
			for (;;) {
				if (index >= str.length) {
					lines.push(values)
					break lineLoop
				}
				codeUnit = str.charCodeAt(index)
				startIndex = index
				wsLoop: for (;;) {
					switch (codeUnit) {
					case 0x0009: case 0x000B: case 0x000C: case 0x000D: case 0x0020: case 0x0085: case 0x00A0: case 0x1680: case 0x2000: case 0x2001: case 0x2002: case 0x2003: case 0x2004: case 0x2005: case 0x2006: case 0x2007: case 0x2008: case 0x2009: case 0x200A: case 0x2028: case 0x2029: case 0x202F: case 0x205F: case 0x3000:
						index++
						if (index >= str.length) { break wsLoop }
						codeUnit = str.charCodeAt(index)
						break
					default:
						break wsLoop
					}
				}
				if (index > startIndex) {
					if (index >= str.length) {
						lines.push(values)
						break lineLoop
					}
					startIndex = index
				}
				switch (codeUnit) {
				case 0x000A:
					lines.push(values)
					index++
					continue lineLoop
				case 0x0023: {
					index++
					startIndex = index
					let wasLineBreak: boolean = false
					commentLoop: for (;;) {
						if (index >= str.length) { break commentLoop }
						codeUnit = str.charCodeAt(index)
						index++
						if (codeUnit === 0x000A) {
							wasLineBreak = true
							break commentLoop
						} else if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
							if (codeUnit >= 0xDC00 || index >= str.length) { throw new InvalidUtf16StringError() }
							const secondCodeUnit: number = str.charCodeAt(index)
							if (!(secondCodeUnit >= 0xDC00 && secondCodeUnit <= 0xDFFF)) { throw new InvalidUtf16StringError() }
							index++
						}
					}
					lines.push(values)
					if (index >= str.length && !wasLineBreak) { break lineLoop }
					else { continue lineLoop }
				}}

				if (codeUnit === 0x0022) {
					index++
					const strCodeUnits: string[] = []
					stringCharLoop: for (;;) {
						if (index >= str.length) { throw WsvParser.getError(WsvParser.stringNotClosed, lineIndex, lineStartIndex, index) }
						codeUnit = str.charCodeAt(index)
						index++
						switch (codeUnit) {
						case 0x000A:
							throw WsvParser.getError(WsvParser.stringNotClosed, lineIndex, lineStartIndex, index-1)
						case 0x0022:
							if (index >= str.length) { break stringCharLoop }
							codeUnit = str.charCodeAt(index)
							switch (codeUnit) {
							case 0x0022:
								strCodeUnits.push("\"")
								index++
								break
							case 0x000A:
							case 0x0023:
							case 0x0009: case 0x000B: case 0x000C: case 0x000D: case 0x0020: case 0x0085: case 0x00A0: case 0x1680: case 0x2000: case 0x2001: case 0x2002: case 0x2003: case 0x2004: case 0x2005: case 0x2006: case 0x2007: case 0x2008: case 0x2009: case 0x200A: case 0x2028: case 0x2029: case 0x202F: case 0x205F: case 0x3000:
								break stringCharLoop
							case 0x002F:
								index++
								if (index >= str.length) { throw WsvParser.getError(WsvParser.invalidStringLineBreak, lineIndex, lineStartIndex, index) }
								codeUnit = str.charCodeAt(index)
								if (codeUnit !== 0x0022) { throw WsvParser.getError(WsvParser.invalidStringLineBreak, lineIndex, lineStartIndex, index) }
								strCodeUnits.push("\n")
								index++
								break
							default:
								throw WsvParser.getError(WsvParser.invalidCharacterAfterString, lineIndex, lineStartIndex, index)
							}
							break
						default:
							strCodeUnits.push(String.fromCharCode(codeUnit))
							if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
								if (codeUnit >= 0xDC00 || index >= str.length) { throw new InvalidUtf16StringError() }
								const secondCodeUnit: number = str.charCodeAt(index)
								if (!(secondCodeUnit >= 0xDC00 && secondCodeUnit <= 0xDFFF)) { throw new InvalidUtf16StringError() }
								strCodeUnits.push(String.fromCharCode(secondCodeUnit))
								index++
							}
							break
						}
					}
					values.push(strCodeUnits.join(""))
				} else {
					valueCharLoop: for (;;) {
						switch (codeUnit) {
						case 0x000A:
						case 0x0023:
						case 0x0009: case 0x000B: case 0x000C: case 0x000D: case 0x0020: case 0x0085: case 0x00A0: case 0x1680: case 0x2000: case 0x2001: case 0x2002: case 0x2003: case 0x2004: case 0x2005: case 0x2006: case 0x2007: case 0x2008: case 0x2009: case 0x200A: case 0x2028: case 0x2029: case 0x202F: case 0x205F: case 0x3000:
							break valueCharLoop
						case 0x0022:
							throw WsvParser.getError(WsvParser.invalidDoubleQuoteInValue, lineIndex, lineStartIndex, index)
						}
						if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
							index++
							if (codeUnit >= 0xDC00 || index >= str.length) { throw new InvalidUtf16StringError() }
							const secondCodeUnit: number = str.charCodeAt(index)
							if (!(secondCodeUnit >= 0xDC00 && secondCodeUnit <= 0xDFFF)) { throw new InvalidUtf16StringError() }
						}
						index++
						if (index >= str.length) { break valueCharLoop }
						codeUnit = str.charCodeAt(index)
					}
					let value: string | null = str.substring(startIndex, index)
					if (value.length === 1 && value.charCodeAt(0) === 0x002D) { value = null }
					values.push(value)
				}
			}
		}
		return lines
	}
}

// ----------------------------------------------------------------------

export abstract class BinaryWsvUtil {
	static getPreambleVersion1(): Uint8Array {
		return new Uint8Array([0x42, 0x57, 0x31])
	}

	static readonly lineBreakByte = 0b11111111
	static readonly valueSeparatorByte = 0b11111110
	static readonly nullValueByte = 0b11111101
	static readonly emptyStringByte = 0b11111100
}

// ----------------------------------------------------------------------

export class Uint8ArrayBuilder {
	private _buffer: Uint8Array
	private _numBytes: number = 0
	private _utf8Encoder = new TextEncoder()

	constructor(initialSize: number = 4096) {
		this._buffer = new Uint8Array(initialSize)
	}

	private prepare(appendLength: number) {
		if (this._numBytes + appendLength > this._buffer.length) {
			let newSize = this._buffer.length * 2
			while (this._numBytes + appendLength > newSize) {
				newSize *= 2
			}
			const newBuffer = new Uint8Array(newSize)
			newBuffer.set(this._buffer, 0)
			this._buffer = newBuffer
		}
	}

	reset() {
		this._numBytes = 0
	}

	push(part: Uint8Array) {
		this.prepare(part.length)
		this._buffer.set(part, this._numBytes)
		this._numBytes += part.length
	}

	pushUtf8String(str: string) {
		Utf16String.validate(str)
		const bytes = this._utf8Encoder.encode(str)
		this.push(bytes)
	}

	pushByte(byte: number) {
		this.prepare(1)
		this._buffer[this._numBytes] = byte
		this._numBytes++
	}

	toArray(): Uint8Array {
		return this._buffer.subarray(0, this._numBytes)
	}
}

// ----------------------------------------------------------------------

export abstract class BinaryWsvEncoder {
	static internalEncodeValues(values: (string | null)[], builder: Uint8ArrayBuilder) {
		for (let i=0; i<values.length; i++) {
			if (i !== 0) {
				builder.pushByte(BinaryWsvUtil.valueSeparatorByte)
			}
			const value = values[i]
			if (value === null) {
				builder.pushByte(BinaryWsvUtil.nullValueByte)
			} else if (value.length === 0) {
				builder.pushByte(BinaryWsvUtil.emptyStringByte)
			} else {
				builder.pushUtf8String(value)
			}
		}
	}

	static internalEncodeJaggedArray(jaggedArray: (string | null)[][], builder: Uint8ArrayBuilder) {
		let wasFirst = true
		for (const line of jaggedArray) {
			if (wasFirst === false) {
				builder.pushByte(BinaryWsvUtil.lineBreakByte)
			}
			wasFirst = false
			this.internalEncodeValues(line, builder)
		}
	}
	
	static internalEncode(document: WsvDocument, builder: Uint8ArrayBuilder) {
		let wasFirst = true
		for (const line of document.lines) {
			if (wasFirst === false) {
				builder.pushByte(BinaryWsvUtil.lineBreakByte)
			}
			wasFirst = false
			this.internalEncodeValues(line.values, builder)
		}
	}

	static encodeValues(values: (string | null)[]): Uint8Array {
		const builder: Uint8ArrayBuilder = new Uint8ArrayBuilder()
		this.internalEncodeValues(values, builder)
		return builder.toArray()
	}

	static encodeJaggedArray(jaggedArray: (string | null)[][], withPreamble: boolean = true): Uint8Array {
		const builder: Uint8ArrayBuilder = new Uint8ArrayBuilder()
		if (withPreamble === true) {
			const preamble = BinaryWsvUtil.getPreambleVersion1()
			builder.push(preamble)
		}
		this.internalEncodeJaggedArray(jaggedArray, builder)
		return builder.toArray()
	}

	static encode(document: WsvDocument, withPreamble: boolean = true): Uint8Array {
		const builder: Uint8ArrayBuilder = new Uint8ArrayBuilder()
		if (withPreamble === true) {
			const preamble = BinaryWsvUtil.getPreambleVersion1()
			builder.push(preamble)
		}
		this.internalEncode(document, builder)
		return builder.toArray()
	}
}

// ----------------------------------------------------------------------

export class NoBinaryWsvPreambleError extends Error {
	constructor() {
		super("Document does not have a BinaryWSV preamble")
	}
}

// ----------------------------------------------------------------------

export class InvalidBinaryWsvError extends Error {
	constructor() {
		super("Document is not a valid BinaryWSV document")
	}
}

// ----------------------------------------------------------------------

export class Uint8ArrayReader {
	buffer: Uint8Array
	offset: number
	private utf8Decoder: TextDecoder
	
	constructor(buffer: Uint8Array, offset: number) {
		this.buffer = buffer
		this.offset = offset
		this.utf8Decoder = new TextDecoder("utf-8", {fatal: true, ignoreBOM: true})
	}

	reset(buffer: Uint8Array, offset: number) {
		this.buffer = buffer
		this.offset = offset
	}

	private readNonEmptyUtf8String(values: (string | null)[]): boolean {
		const startOffset = this.offset
		this.offset++
		let wasLineBreak: boolean = false
		let wasSeparator: boolean = false
		while (this.offset < this.buffer.length) {
			const currentByte = this.buffer[this.offset]
			if (currentByte === BinaryWsvUtil.lineBreakByte) {
				wasLineBreak = true
				wasSeparator = true
				break
			} else if (currentByte === BinaryWsvUtil.valueSeparatorByte) {
				wasSeparator = true
				break
			}
			this.offset++
		}
		const bytes = this.buffer.subarray(startOffset, this.offset)
		try {
			const value = this.utf8Decoder.decode(bytes)
			values.push(value)
		} catch (error) {
			throw new InvalidBinaryWsvError()
		}
		if (wasSeparator === true) {
			this.offset++
		}
		return wasLineBreak
	}

	read(values: (string | null)[]): boolean | undefined {
		if (this.offset >= this.buffer.length) { return undefined }
		const peekByte = this.buffer[this.offset]

		if (peekByte === BinaryWsvUtil.lineBreakByte) {
			this.offset++
			return true
		}
		
		if (peekByte === BinaryWsvUtil.nullValueByte) {
			values.push(null)
			this.offset++
		} else if (peekByte === BinaryWsvUtil.emptyStringByte) {
			values.push("")
			this.offset++
		} else {
			return this.readNonEmptyUtf8String(values)
		}

		if (this.offset < this.buffer.length) {
			const peekFollowingByte = this.buffer[this.offset]
			this.offset++
			if (peekFollowingByte === BinaryWsvUtil.lineBreakByte) {
				return true
			} else if (peekFollowingByte !== BinaryWsvUtil.valueSeparatorByte) {
				throw new InvalidBinaryWsvError()
			}
		}
		return false
	}
}

// ----------------------------------------------------------------------

export abstract class BinaryWsvDecoder {
	static getVersion(bytes: Uint8Array): string {
		const version = this.getVersionOrNull(bytes)
		if (version === null) {
			throw new NoBinaryWsvPreambleError()
		}
		return version
	}

	static getVersionOrNull(bytes: Uint8Array): string | null {
		if (bytes.length < 3 ||
			bytes[0] !== 0x42 ||
			bytes[1] !== 0x57) {
			return null
		}
		return String.fromCharCode(bytes[2])
	}

	static internalDecodeLineValues(reader: Uint8ArrayReader): (string | null)[] {
		const currentLine: (string | null)[] = []
		for (;;) {
			const wasLineBreak = reader.read(currentLine)
			if (wasLineBreak === undefined) {
				break
			}
			if (wasLineBreak === true) {
				throw new Error("Invalid line bytes")
			}
		}
		return currentLine
	}

	static decodeAsJaggedArray(bytes: Uint8Array, withPreamble: boolean = true): (string | null)[][] {
		if (withPreamble === true) {	
			const version = this.getVersion(bytes)
			if (version !== "1") {
				throw new Error(`Not supported BinaryWSV version '${version}'`)
			}
		}
		const result: (string | null)[][] = []
		const reader = new Uint8ArrayReader(bytes, withPreamble ? 3 : 0)
		let currentLine: (string | null)[] = []
		for (;;) {
			const wasLineBreak = reader.read(currentLine)
			if (wasLineBreak === undefined) {
				break
			}
			if (wasLineBreak === true) {
				result.push(currentLine)
				currentLine = []
			}
		}
		result.push(currentLine)
		return result
	}

	static decode(bytes: Uint8Array, withPreamble: boolean = true): WsvDocument {
		if (withPreamble === true) {	
			const version = this.getVersion(bytes)
			if (version !== "1") {
				throw new Error(`Not supported BinaryWSV version '${version}'`)
			}
		}
		const document: WsvDocument = new WsvDocument()
		const reader = new Uint8ArrayReader(bytes, withPreamble ? 3 : 0)
		let currentLine: (string | null)[] = []
		for (;;) {
			const wasLineBreak = reader.read(currentLine)
			if (wasLineBreak === undefined) {
				break
			}
			if (wasLineBreak === true) {
				document.addLine(currentLine)
				currentLine = []
			}
		}
		document.addLine(currentLine)
		return document
	}
}