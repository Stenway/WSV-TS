/* (C) Stefan John / Stenway / WhitespaceSV.com / 2022 */

import { InvalidUtf16StringError, ReliableTxtDocument, ReliableTxtEncoding, ReliableTxtLines, Utf16String } from "./reliabletxt.js"

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
				let wsValue: string | null = values[i]
				if (wsValue === null) { continue }
				WsvStringUtil.validateWhitespaceString(wsValue, i===0)
			}
		}
	}

	static validateWhitespaceString(str: string, isFirst: boolean) {
		if (str.length === 0 && !isFirst) { throw new TypeError("Non-first whitespace string cannot be empty") }
		for (let i=0; i<str.length; i++) {
			let codeUnit: number = str.charCodeAt(i)
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
				let codeUnit: number = value.charCodeAt(i)
				if (codeUnit === 0x000A) { throw new RangeError("Line feed in comment is not allowed") }
				else if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
					i++
					if (codeUnit >= 0xDC00 || i >= value.length) { throw new InvalidUtf16StringError() }
					let secondCodeUnit: number = value.charCodeAt(i)
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
			return this.serialize()
		} else {
			return WsvSerializer.serializeValues(this.values)
		}
	}

	serialize(): string {
		return WsvSerializer.serializeValuesWhitespacesAndComment(this.values, this._whitespaces, this._comment)
	}
	
	static internal(values: (string | null)[], whitespaces: (string | null)[] | null = null, comment: string | null = null): WsvLine {
		let line: WsvLine = new WsvLine(values)
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

	addLine(values: (string | null)[], whitespaces: string[] | null = null, comment: string | null = null) {
		let line: WsvLine = new WsvLine(values, whitespaces, comment)
		this.lines.push(line)
	}

	toJaggedArray(): (string | null)[][] {
		let array: (string | null)[][] = []
		for (let line of this.lines) {
			array.push(line.values)
		}
		return array
	}

	toString(preserveWhitespaceAndComment: boolean = true): string {
		return WsvSerializer.serializeLines(this.lines, preserveWhitespaceAndComment)
	}

	getBytes(preserveWhitespacesAndComments: boolean = true): Uint8Array {
		let str: string = this.toString(preserveWhitespacesAndComments)
		return new ReliableTxtDocument(str, this.encoding).getBytes()
	}

	static parse(str: string, preserveWhitespacesAndComments: boolean = true) {
		let document: WsvDocument = new WsvDocument()
		document.lines = WsvParser.parseLines(str, preserveWhitespacesAndComments)
		return document
	}

	static parseAsJaggedArray(str: string): (string | null)[][] {
		return WsvParser.parseAsJaggedArray(str)
	}
}

// ----------------------------------------------------------------------

export abstract class WsvSerializer {
	private static readonly stringNotClosed: string			= "String not closed"

	private static containsSpecialChar(value: string): boolean {
		for (let i=0; i<value.length; i++) {
			let c: number = value.charCodeAt(i)
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
				let secondCodeUnit: number = value.charCodeAt(i)
				if (!(secondCodeUnit >= 0xDC00 && secondCodeUnit <= 0xDFFF)) { throw new InvalidUtf16StringError() }
			}
		}
		return false
	}
	
	static serializeValue(value: string | null): string {
		if (value === null) {
			return "-"
		} else if (value.length === 0) {
			return "\"\""
		} else if (value === "-") {
			return "\"-\""
		} else if (WsvSerializer.containsSpecialChar(value)) {
			let size: number = 2
			for (let i=0; i<value.length; i++) {
				let codeUnit: number = value.charCodeAt(i)
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
			let bytes: Uint8Array = new Uint8Array(size*2)
			let view: DataView = new DataView(bytes.buffer)
			view.setUint16(0, 0x0022, false)
			let index: number = 2
			for (let i=0; i<value.length; i++) {
				let codeUnit: number = value.charCodeAt(i)
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

	static serializeValues(values: (string | null)[]): string {
		let strings: string[] = []
		for (let i=0; i<values.length; i++) {
			if (i !== 0) { strings.push(" ") }
			let serialized: string = WsvSerializer.serializeValue(values[i])
			strings.push(serialized)
		}
		return strings.join("")
	}

	static serializeJaggedArray(jaggedArray: (string | null)[][]): string {
		let lines: string[] = []
		for (let values of jaggedArray) {
			let line: string = WsvSerializer.serializeValues(values)
			lines.push(line)
		}
		return ReliableTxtLines.join(lines)
	}

	static serializeValuesWhitespacesAndComment(values: (string | null)[], whitespaces: (string | null)[] | null = null, comment: string | null = null): string {
		let strings: string[] = []
		whitespaces ??= []
		for (let i=0; i<values.length; i++) {
			let whitespace: string | null = i < whitespaces.length ? whitespaces[i] : null
			whitespace ??= i !== 0 ? " " : ""
			strings.push(whitespace)
			let serialized: string = WsvSerializer.serializeValue(values[i])
			strings.push(serialized)
		}
		if (whitespaces.length > values.length) { strings.push(whitespaces[values.length] ?? "") }
		else if (comment !== null && values.length > 0 && whitespaces.length === 0) { strings.push(" ") }

		if (comment !== null) { strings.push("#"+comment) }
		return strings.join("")
	}

	static serializeLines(lines: WsvLine[], preserveWhitespaceAndComment: boolean = true): string {
		let lineStrings: string[] = []
		for (let line of lines) {
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
		let lines: WsvLine[]
		lines = WsvParser.parseLines(str, preserveWhitespacesAndComments, lineIndexOffset)
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

	private static parseLinesPreserving(str: string, lineIndexOffset: number = 0): WsvLine[] {
		let lines: WsvLine[] = []
		let index: number = 0
		let startIndex: number = 0
		
		let values: (string | null)[]
		let whitespaces: (string | null)[]
		let comment: string | null

		let codeUnit: number
		let lineIndex: number = lineIndexOffset - 1
		let lineStartIndex: number
		lineLoop: while (true) {
			lineIndex++
			lineStartIndex = index

			values = []
			whitespaces = []
			comment = null
			valueLoop: while (true) {
				if (index >= str.length) {
					lines.push(WsvLine.internal(values, whitespaces, comment))
					break lineLoop
				}
				codeUnit = str.charCodeAt(index)
				startIndex = index
				wsLoop: while (true) {
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
					let whitespace: string = str.substring(startIndex, index)
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
					case 0x0023:
						index++
						startIndex = index
						comment = ""
						let wasLineBreak: boolean = false
						commentLoop: while (true) {
							if (index >= str.length) { break commentLoop }
							codeUnit = str.charCodeAt(index)
							index++
							if (codeUnit === 0x000A) {
								wasLineBreak = true
								break commentLoop
							} else if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
								if (codeUnit >= 0xDC00 || index >= str.length) { throw new InvalidUtf16StringError() }
								let secondCodeUnit: number = str.charCodeAt(index)
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
				}

				if (codeUnit === 0x0022) {
					index++
					let strCodeUnits: string[] = []
					stringCharLoop: while (true) {
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
									index++
									if (codeUnit >= 0xDC00 || index >= str.length) { throw new InvalidUtf16StringError() }
									let secondCodeUnit: number = str.charCodeAt(index)
									if (!(secondCodeUnit >= 0xDC00 && secondCodeUnit <= 0xDFFF)) { throw new InvalidUtf16StringError() }
									strCodeUnits.push(String.fromCharCode(secondCodeUnit))
									index++
								}
								break
						}
					}
					values.push(strCodeUnits.join(""))
				} else {
					valueCharLoop: while (true) {
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
							let secondCodeUnit: number = str.charCodeAt(index)
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

	private static parseLinesNonPreserving(str: string, lineIndexOffset: number = 0): WsvLine[] {
		let lines: WsvLine[] = []
		let index: number = 0
		let startIndex: number = 0
		
		let values: (string | null)[]
		
		let codeUnit: number
		let lineIndex: number = lineIndexOffset - 1
		let lineStartIndex: number
		lineLoop: while (true) {
			lineIndex++
			lineStartIndex = index

			values = []
			valueLoop: while (true) {
				if (index >= str.length) {
					lines.push(WsvLine.internal(values))
					break lineLoop
				}
				codeUnit = str.charCodeAt(index)
				startIndex = index
				wsLoop: while (true) {
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
						lines.push(WsvLine.internal(values))
						break lineLoop
					}
					startIndex = index
				}
				switch (codeUnit) {
					case 0x000A:
						lines.push(WsvLine.internal(values))
						index++
						continue lineLoop
					case 0x0023:
						index++
						startIndex = index
						let wasLineBreak: boolean = false
						commentLoop: while (true) {
							if (index >= str.length) { break commentLoop }
							codeUnit = str.charCodeAt(index)
							index++
							if (codeUnit === 0x000A) {
								wasLineBreak = true
								break commentLoop
							} else if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
								if (codeUnit >= 0xDC00 || index >= str.length) { throw new InvalidUtf16StringError() }
								let secondCodeUnit: number = str.charCodeAt(index)
								if (!(secondCodeUnit >= 0xDC00 && secondCodeUnit <= 0xDFFF)) { throw new InvalidUtf16StringError() }
								index++
							}
						}
						lines.push(WsvLine.internal(values))
						if (index >= str.length && !wasLineBreak) { break lineLoop }
						else { continue lineLoop }
				}

				if (codeUnit === 0x0022) {
					index++
					let strCodeUnits: string[] = []
					stringCharLoop: while (true) {
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
									index++
									if (codeUnit >= 0xDC00 || index >= str.length) { throw new InvalidUtf16StringError() }
									let secondCodeUnit: number = str.charCodeAt(index)
									if (!(secondCodeUnit >= 0xDC00 && secondCodeUnit <= 0xDFFF)) { throw new InvalidUtf16StringError() }
									strCodeUnits.push(String.fromCharCode(secondCodeUnit))
									index++
								}
								break
						}
					}
					values.push(strCodeUnits.join(""))
				} else {
					valueCharLoop: while (true) {
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
							let secondCodeUnit: number = str.charCodeAt(index)
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
		let lines: (string | null)[][] = []
		let index: number = 0
		let startIndex: number = 0
		
		let values: (string | null)[]
		
		let codeUnit: number
		let lineIndex: number = lineIndexOffset - 1
		let lineStartIndex: number
		lineLoop: while (true) {
			lineIndex++
			lineStartIndex = index

			values = []
			valueLoop: while (true) {
				if (index >= str.length) {
					lines.push(values)
					break lineLoop
				}
				codeUnit = str.charCodeAt(index)
				startIndex = index
				wsLoop: while (true) {
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
					case 0x0023:
						index++
						startIndex = index
						let wasLineBreak: boolean = false
						commentLoop: while (true) {
							if (index >= str.length) { break commentLoop }
							codeUnit = str.charCodeAt(index)
							index++
							if (codeUnit === 0x000A) {
								wasLineBreak = true
								break commentLoop
							} else if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
								if (codeUnit >= 0xDC00 || index >= str.length) { throw new InvalidUtf16StringError() }
								let secondCodeUnit: number = str.charCodeAt(index)
								if (!(secondCodeUnit >= 0xDC00 && secondCodeUnit <= 0xDFFF)) { throw new InvalidUtf16StringError() }
								index++
							}
						}
						lines.push(values)
						if (index >= str.length && !wasLineBreak) { break lineLoop }
						else { continue lineLoop }
				}

				if (codeUnit === 0x0022) {
					index++
					let strCodeUnits: string[] = []
					stringCharLoop: while (true) {
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
									index++
									if (codeUnit >= 0xDC00 || index >= str.length) { throw new InvalidUtf16StringError() }
									let secondCodeUnit: number = str.charCodeAt(index)
									if (!(secondCodeUnit >= 0xDC00 && secondCodeUnit <= 0xDFFF)) { throw new InvalidUtf16StringError() }
									strCodeUnits.push(String.fromCharCode(secondCodeUnit))
									index++
								}
								break
						}
					}
					values.push(strCodeUnits.join(""))
				} else {
					valueCharLoop: while (true) {
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
							let secondCodeUnit: number = str.charCodeAt(index)
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