# WSV

## About WSV

The textual data format WSV - the Whitespace Separated Values format - is a modern
and robust alternative to CSV. It has only a minimal set of rules and solves
the main problems of CSV (watch [this video](https://www.youtube.com/watch?v=mGUlW6YgHjE) for more details on that). It's human friendly and can produce documents that are beautifully formatted
and readable, even without specific tools, just opened in a text editor. Here is an example WSV document:

```
FirstName LastName Age PlaceOfBirth
Lucas     Brown
William   Smith    30  Boston
Lucy      Reynolds 27
Olivia    Jones    -   "San Francisco"
```

In terms of data structure, it represents an array of arrays of string or null values.
In the textual representation, values are separated by a single or consecutive whitespace.
Values can contain whitespace as well and then must be escaped.
Learn more about the escaping rules on the official website [www.whitespacesv.com](https://www.whitespacesv.com) where you can find the complete specification and can try out WSV in an online editor.

WSV builds the **foundation for text file formats** like [SML](https://www.simpleml.com) and [TBL](https://www.youtube.com/watch?v=mGUlW6YgHjE) (see also the [Stenway Text File Format Stack](https://www.youtube.com/watch?v=m7Z0mrcFeCg)).
All of these formats **don't need to bother about encoding and decoding** anymore, because they rely on [ReliableTXT](https://www.reliabletxt.com), which takes care of that aspect (see also the NPM packages [reliabletxt](https://www.npmjs.com/package/@stenway/reliabletxt), [reliabletxt-io](https://www.npmjs.com/package/@stenway/reliabletxt-io), and [reliabletxt-browser](https://www.npmjs.com/package/@stenway/reliabletxt-browser)).

Find out what can be done with WSV on the official [YouTube channel from Stenway](https://www.youtube.com/@stenway).

## About this package

This package provides functionality to handle the **parsing and serialization** of WSV documents. It also provides functionality to encode and decode the binary version of WSV, which is called [**BinaryWSV**](https://www.youtube.com/watch?v=vR1bj6sArLU).
The package **works both in the browser and Node.js**, because it does not require environment specific functionality.
If you want to **read and write WSV files** using Node.js's file system module, you can use the **[wsv-io](https://www.npmjs.com/package/@stenway/wsv-io)** package.
The **[wsv-browser](https://www.npmjs.com/package/@stenway/wsv-browser)** package on the other hand
offers functionality to easily provide WSV documents as downloadable files.

If you want to get a first impression on how to use this package, you can watch [this video](https://www.youtube.com/watch?v=RZB0EMhk8hc). But always check the changelog of the presented packages for possible changes, that are
not reflected in the video.

## Getting started

We first have to install the Stenway WSV package with the npm install command.

```
npm install @stenway/wsv
```

We begin with creating a new WsvLine object, by passing an array of string
values to the constructor. We call the toString method to serialize this WsvLine as a string.

```ts
import { WsvLine } from "@stenway/wsv"
const line = new WsvLine(["Value1", "Value2"])
const lineStr = line.toString()
```

Both values are simply separated with a single space character:

```
Value1 Value2
```

We can change the formatting of the line, by providing
an array of whitespace strings as argument to the
WsvLine class constructor. In this example we indent
the line with a tab character, expressed by the backslash t
escape sequence and put two spaces between the first and
the second value. We also add a comment by providing a string
as a third argument.

```ts
const lineWithComment = new WsvLine(["Value1", "Value2"], ["\t", "  ", " "], "My comment")
const lineWithCommentStr = lineWithComment.toString()
```

These arguments are kept in the WsvLine object and the serialized line string looks like this:

```
	Value1  Value2 #My comment
```

The tab character is the first character and the comment string
starts with a hash character.

We can access the values, whitespaces and the comment with
their respective properties.
And can of course change them, like here, where we change the
first value and the comment.
```ts
const values = lineWithComment.values
const whitespaces = lineWithComment.whitespaces
const comment = lineWithComment.comment

lineWithComment.values[0] = "ChangedValue1"
lineWithComment.comment = "Changed comment"
const changedLineStr = lineWithComment.toString()
```
Which gives us:
```
	ChangedValue1  Value2 #Changed comment
```

Let's have a look at some of the special cases of values.
Here we have a value with a space character,
a value with a line feed character,
a null value
and a string containing doublequotes.
There is also a single minus character.

```ts
const normalValue = "Value"
const valueWithSpace = "With space"
const valueWithLineBreak = "With\nline break"
const nullValue = null
const valueWithDoublequotes = `With "Doublequotes"`
const minusCharValue = "-"

const specialValuesLine = new WsvLine([normalValue, valueWithSpace, valueWithLineBreak, nullValue, valueWithDoublequotes, minusCharValue])
const specialValuesLineStr = specialValuesLine.toString()
```

Let's serialize these values and see how the resulting string
will look like:

```
Value "With space" "With"/"line break" - "With ""Doublequotes""" "-"
```

The value containing the space character is put inside of doublequotes.
The line feed character is replaced with this special
escape sequence ``"/"`` consisting of a doublequote followed by a slash
and another doublequote.
The null value will result in a simple minus character.
The doublequote character will be represented with two doublequotes.
And the simple minus character will be enclosed by doublequotes.

### Parsing

Of course the most import part is the parsing.
With the static method parse of the WsvLine class, we can
construct a WsvLine object from a serialized line string.

```ts
const parsedLine = WsvLine.parse(lineStr)
const parsedLineStr = parsedLine.toString()
```
The values will be correctly parsed and the
serialized line string will look identical to the input of the
parse method.

Now we try the same with the serialized line string, that
contained whitespace formatting and a comment.

```ts
const parsedLineWithComment = WsvLine.parse(lineWithCommentStr)
const parsedLineWithCommentStr = parsedLineWithComment.toString()
```

The comment will be correctly parsed, as well as the whitespace strings.
And again we will get an identical serialized string.

If you don't need to retain the formatting and comments, you
can specifiy to not preserve them as a second argument to
the parse method.

```ts
const parsedLineWithoutWsAndComment = WsvLine.parse(lineWithCommentStr, false)
const parsedLineWithoutWsAndCommentStr = parsedLineWithoutWsAndComment.toString()
```

And we can see, that the formatting and the comment will be stripped away.

There are case where we don't need a WsvLine class object
and instead only need an array. That's where we can use
the static method parseAsArray of the WsvLine class, which
will return an array of string or null values.
```ts
const emptyArray = WsvLine.parseAsArray("")
const alsoEmpty = WsvLine.parseAsArray("     ")
const valueArray = WsvLine.parseAsArray("Value1 Value2 - \"Value 4\"")
```

The first two serialized strings will lead to empty arrays
and the third example will lead to an array of four values.

We can also use the static method serialize of the WsvLine
class to get a serialized string from an array of values.

```ts
const emptyArrayStr = WsvLine.serialize(emptyArray)
const valueArrayStr = WsvLine.serialize(valueArray)
```

If the string we want to parse has an invalid WSV syntax,
the parse method will throw a WsvParserError. In this example
we will catch it and will have a look at it:

```ts
try {
	WsvLine.parse(`Value1 "Val`)
} catch(error) {
	const parserError = error as WsvParserError
	console.log(`Parser error: ${parserError.message}`)
}
```
The provided line string has a value that starts with a doublequote, but
there is no closing doublequote. The parser error will therefor
tell us, that the string is not closed and will give us
information about the position where the error occured.

### The WsvDocument class

So far we have only worked with single lines. Now we want
to create a whole WSV document. For that we first create
a new WsvDocument object and add two lines with the addLine
method. We can either only provide values, or additionally
provide formatting and comment strings. The toString method
serializes the complete document as a single string.

```ts
const document = new WsvDocument()
document.addLine(["Value1_1", "Value1_2"])
document.addLine(["Value2_1", null], ["\t", "  ", " "], "My comment")
const documentStr = document.toString()
```

Because a WSV document is a ReliableTXT document, two lines
are joined and separated by a line feed character as you can
see here:

```
Value1_1 Value1_2
	Value2_1  - #My comment
```

We can also directly provide an array of lines to the
WsvDocument constructor and additionally define the used
ReliableTxtEncoding type. For that we also need to install
and import the [ReliableTXT package](https://www.npmjs.com/package/@stenway/reliabletxt).

```ts
const line1 = WsvLine.parse("a b")
const line2 = WsvLine.parse("c d")
const anotherDocument = new WsvDocument([line1, line2], ReliableTxtEncoding.Utf16)
const anotherDocumentStr = anotherDocument.toString()
```

We can access the lines and encoding with their respective
properties. With the toBytes method, we can convert the
document into it's binary representation using the specified
ReliableTXT encoding.

```ts
const lines = anotherDocument.lines
const encoding = anotherDocument.encoding
const bytes = anotherDocument.toBytes()
```

Here we have specified, that the document will use the UTF-16
encoding and therefor we will see that the document is encoded as several
16-bit values with the first two bytes being the preamble bytes
also called [byte order mark](https://www.youtube.com/watch?v=VgVkod9HQTo). 

To parse a complete document, we can use the static method parse
of the WsvDocument class. And here we will see that the serialized
string is identical to the input string of the parse method.

```ts
const content = `a b # My first line
                 c d`

const parsedDocument = WsvDocument.parse(content)
const parsedDocumentStr = parsedDocument.toString()
```

If we don't need whitespace and comments preserved, we can
specify that with the second argument.

```ts
const parsedDocumentWithoutWsAndComment = WsvDocument.parse(content, false)
const parsedDocumentWithoutWsAndCommentStr = parsedDocumentWithoutWsAndComment.toString()
```

And finally if we only want an array of value arrays, we can
simply use the static method parseAsJaggedArray of the 
WsvDocument class.

```ts
const jaggedArray = WsvDocument.parseAsJaggedArray(`a b c d\ne\nf g - i j k`)
```

## BinaryWSV

BinaryWSV is the binary representation of WSV documents. It starts with the magic code 'BW1'.
BinaryWSV is made for scenarios, where parsing speed of the textual representation might be a limitation.
It doesn't need to escape special string values, because it uses invalid UTF-8 bytes to signal line breaks,
value separators, empty strings or null values, and thus non-empty string values can simply be encoded using UTF-8. The following bytes are used:

```
11111111  FF  255  =  Line Break Byte
11111110  FE  254  =  Value Separator Byte
11111101  FD  253  =  Null Value Byte
11111100  FC  252  =  Empty String Byte
```

Learn more about the BinaryWSV format in [this video](https://www.youtube.com/watch?v=vR1bj6sArLU).

The package contains functionality to encode and decode BinaryWSV documents. The WsvDocument class
offers the method toBinaryWsv which returns the WSV document encoded as BinaryWSV bytes.
```ts
const document = WsvDocument.parse(`a b\nc - ""`)
const bytes = document.toBinaryWsv()
const decodedDocument = WsvDocument.fromBinaryWsv(bytes)
```

The static method fromBinaryWsv on the other hand returns a WsvDocument object which was decoded from
the provided BinaryWSV bytes.

If you don't need a WsvDocument and instead want to encode a jagged array, you can use the
the static BinaryWsvEncoder class and its static method encodeJaggedArray.

```ts
const bytes = BinaryWsvEncoder.encodeJaggedArray([["a", "b"], ["c", null, ""]])
const decodedJaggedArray = BinaryWsvDecoder.decodeAsJaggedArray(bytes)
```

The static method decodeAsJaggedArray of the static BinaryWsvDecoder class will then turn the
BinaryWSV bytes into a jagged array.