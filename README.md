# WSV

## About

[WSV Documentation/Specification](https://www.whitespacesv.com)

## Installation

Using NPM:
```
npm install @stenway/wsv
```

## Getting started

```ts
import { WsvLine } from '@stenway/wsv'
console.log(WsvLine.parse("Value1 Value2 #Comment"))
```

For file reading and writing functionality see the [wsv-io package](https://www.npmjs.com/package/@stenway/wsv-io).

## Videos
* [Package Usage](https://www.youtube.com/watch?v=RZB0EMhk8hc)
* [Why I like the UTF-8 Byte Order Mark (BOM)](https://www.youtube.com/watch?v=VgVkod9HQTo)
* [Stop Using Windows Line Breaks (CRLF)](https://www.youtube.com/watch?v=YPtMCiHj7F8)

## Examples

```ts
import { ReliableTxtEncoding } from "@stenway/reliabletxt"
import { WsvDocument, WsvLine, WsvParser, WsvParserError, WsvSerializer, WsvStringUtil } from "@stenway/wsv"

// WSV line creation

let line = new WsvLine(["Value1", "Value2"])
let lineStr = line.toString()

let lineWithComment = new WsvLine(["Value1", "Value2"], ["\t", "  ", " "], "My comment")
let lineWithCommentStr = lineWithComment.toString()

// WSV line modification

let values = lineWithComment.values
let whitespaces = lineWithComment.whitespaces
let comment = lineWithComment.comment

lineWithComment.values[0] = "ChangedValue1"
lineWithComment.comment = "Changed comment"
let changedLineStr = lineWithComment.toString()

// special values

let normalValue = "Value"
let valueWithSpace = "With space"
let valueWithLineBreak = "With\nline break"
let nullValue = null
let valueWithDoublequotes = `With "Doublequotes"`
let minusCharValue = "-"
let specialValuesLine = new WsvLine([normalValue, valueWithSpace, valueWithLineBreak, nullValue, valueWithDoublequotes, minusCharValue])
let specialValuesLineStr = specialValuesLine.toString()

// WSV line parsing

let parsedLine = WsvLine.parse(lineStr)
let parsedLineStr = parsedLine.toString()

let parsedLineWithComment = WsvLine.parse(lineWithCommentStr)
let parsedLineWithCommentStr = parsedLineWithComment.toString()

let parsedLineWithoutWsAndComment = WsvLine.parse(lineWithCommentStr, false)
let parsedLineWithoutWsAndCommentStr = parsedLineWithoutWsAndComment.toString()

// WSV line values

let emptyArray = WsvLine.parseAsArray("")
let alsoEmpty = WsvLine.parseAsArray("     ")
let valueArray = WsvLine.parseAsArray("Value1 Value2 - \"Value 4\"")

let emptyArrayStr = WsvLine.serialize(emptyArray)
let valueArrayStr = WsvLine.serialize(valueArray)

// parser error

try {
	WsvLine.parse(`Value1 "Val`)
} catch(error) {
	let parserError = error as WsvParserError
	console.log(`Parser error: ${parserError.message}`)
}

// WSV document

let document = new WsvDocument()
document.addLine(["Value1_1", "Value1_2"])
document.addLine(["Value2_1", null], ["\t", "  ", " "], "My comment")
let documentStr = document.toString()

let line1 = WsvLine.parse("a b")
let line2 = WsvLine.parse("c d")
let anotherDocument = new WsvDocument([line1, line2], ReliableTxtEncoding.Utf16)
let anotherDocumentStr = anotherDocument.toString()

let lines = anotherDocument.lines
let encoding = anotherDocument.encoding
let bytes = anotherDocument.getBytes()

// WSV document parsing

let content = `a b # My first line
               c d`

let parsedDocument = WsvDocument.parse(content)
let parsedDocumentStr = parsedDocument.toString()

let parsedDocumentWithoutWsAndComment = WsvDocument.parse(content, false)
let parsedDocumentWithoutWsAndCommentStr = parsedDocumentWithoutWsAndComment.toString()

// jagged array

let jaggedArray = WsvDocument.parseAsJaggedArray(`a b c d\ne\nf g - i j k`)

console.log("WSV usage")
```