/* (C) Stefan John / Stenway / WhitespaceSV.com / 2023 */
import { Base64String, InvalidUtf16StringError, ReliableTxtDocument, ReliableTxtEncoding, ReliableTxtLines, Utf16String } from "@stenway/reliabletxt";
// ----------------------------------------------------------------------
export class WsvParserError extends Error {
    constructor(index, lineIndex, linePosition, message) {
        super(`${message} (${lineIndex + 1}, ${linePosition + 1})`);
        this.index = index;
        this.lineIndex = lineIndex;
        this.linePosition = linePosition;
    }
}
// ----------------------------------------------------------------------
export class WsvStringUtil {
    static validateWhitespaceStrings(values) {
        if (values !== null) {
            for (let i = 0; i < values.length; i++) {
                const wsValue = values[i];
                if (wsValue === null) {
                    continue;
                }
                WsvStringUtil.validateWhitespaceString(wsValue, i === 0);
            }
        }
    }
    static validateWhitespaceString(str, isFirst) {
        if (str.length === 0 && !isFirst) {
            throw new TypeError("Non-first whitespace string cannot be empty");
        }
        for (let i = 0; i < str.length; i++) {
            const codeUnit = str.charCodeAt(i);
            switch (codeUnit) {
                case 0x0009:
                case 0x000B:
                case 0x000C:
                case 0x000D:
                case 0x0020:
                case 0x0085:
                case 0x00A0:
                case 0x1680:
                case 0x2000:
                case 0x2001:
                case 0x2002:
                case 0x2003:
                case 0x2004:
                case 0x2005:
                case 0x2006:
                case 0x2007:
                case 0x2008:
                case 0x2009:
                case 0x200A:
                case 0x2028:
                case 0x2029:
                case 0x202F:
                case 0x205F:
                case 0x3000:
                    continue;
                default:
                    throw new TypeError(`Invalid code unit '${codeUnit}' in whitespace string at index ${i}`);
            }
        }
    }
    static validateComment(value) {
        if (value !== null) {
            for (let i = 0; i < value.length; i++) {
                const codeUnit = value.charCodeAt(i);
                if (codeUnit === 0x000A) {
                    throw new RangeError("Line feed in comment is not allowed");
                }
                else if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
                    i++;
                    if (codeUnit >= 0xDC00 || i >= value.length) {
                        throw new InvalidUtf16StringError();
                    }
                    const secondCodeUnit = value.charCodeAt(i);
                    if (!(secondCodeUnit >= 0xDC00 && secondCodeUnit <= 0xDFFF)) {
                        throw new InvalidUtf16StringError();
                    }
                }
            }
        }
    }
}
// ----------------------------------------------------------------------
export class WsvLine {
    get hasValues() {
        return this.values.length > 0;
    }
    get whitespaces() {
        if (this._whitespaces === null) {
            return null;
        }
        return [...this._whitespaces];
    }
    set whitespaces(values) {
        WsvStringUtil.validateWhitespaceStrings(values);
        if (values !== null) {
            this._whitespaces = [...values];
        }
        else {
            this._whitespaces = null;
        }
    }
    get comment() {
        return this._comment;
    }
    set comment(value) {
        WsvStringUtil.validateComment(value);
        this._comment = value;
    }
    get hasComment() {
        return this._comment !== null;
    }
    constructor(values, whitespaces = null, comment = null) {
        this._whitespaces = null;
        this._comment = null;
        this.values = values;
        this.whitespaces = whitespaces;
        this.comment = comment;
    }
    set(values, whitespaces = null, comment = null) {
        this.values = values;
        this.whitespaces = whitespaces;
        this.comment = comment;
    }
    toString(preserveWhitespaceAndComment = true) {
        if (preserveWhitespaceAndComment) {
            return WsvSerializer.internalSerializeValuesWhitespacesAndComment(this.values, this._whitespaces, this._comment);
        }
        else {
            return WsvSerializer.serializeValues(this.values);
        }
    }
    static internal(values, whitespaces, comment) {
        const line = new WsvLine(values);
        line._whitespaces = whitespaces;
        line._comment = comment;
        return line;
    }
    static internalWhitespaces(line) {
        return line._whitespaces;
    }
    static parse(str, preserveWhitespacesAndComments = true) {
        return WsvParser.parseLine(str, preserveWhitespacesAndComments);
    }
    static parseAsArray(str) {
        return WsvParser.parseLine(str, false).values;
    }
    static serialize(values) {
        return WsvSerializer.serializeValues(values);
    }
}
// ----------------------------------------------------------------------
export class WsvDocument {
    constructor(lines = [], encoding = ReliableTxtEncoding.Utf8) {
        this.lines = lines;
        this.encoding = encoding;
    }
    addLine(values, whitespaces = null, comment = null) {
        const line = new WsvLine(values, whitespaces, comment);
        this.lines.push(line);
    }
    toJaggedArray() {
        const array = [];
        for (const line of this.lines) {
            array.push(line.values);
        }
        return array;
    }
    toString(preserveWhitespaceAndComment = true) {
        return WsvSerializer.serializeLines(this.lines, preserveWhitespaceAndComment);
    }
    getBytes(preserveWhitespacesAndComments = true) {
        const str = this.toString(preserveWhitespacesAndComments);
        return new ReliableTxtDocument(str, this.encoding).getBytes();
    }
    toBase64String(preserveWhitespacesAndComments = true) {
        const str = this.toString(preserveWhitespacesAndComments);
        return Base64String.fromText(str, this.encoding);
    }
    static parse(str, preserveWhitespacesAndComments = true, encoding = ReliableTxtEncoding.Utf8) {
        const lines = WsvParser.parseLines(str, preserveWhitespacesAndComments);
        return new WsvDocument(lines, encoding);
    }
    static parseAsJaggedArray(str) {
        return WsvParser.parseAsJaggedArray(str);
    }
    static fromJaggedArray(jaggedArray, encoding = ReliableTxtEncoding.Utf8) {
        const document = new WsvDocument();
        for (const values of jaggedArray) {
            document.addLine(values);
        }
        document.encoding = encoding;
        return document;
    }
    static fromBytes(bytes, preserveWhitespacesAndComments = true) {
        const txtDocument = ReliableTxtDocument.fromBytes(bytes);
        const document = WsvDocument.parse(txtDocument.text, preserveWhitespacesAndComments, txtDocument.encoding);
        return document;
    }
    static fromLines(lines, preserveWhitespacesAndComments = true, encoding = ReliableTxtEncoding.Utf8) {
        const content = ReliableTxtLines.join(lines);
        const document = WsvDocument.parse(content, preserveWhitespacesAndComments, encoding);
        return document;
    }
    static fromBase64String(base64Str) {
        const bytes = Base64String.toBytes(base64Str);
        return this.fromBytes(bytes);
    }
}
// ----------------------------------------------------------------------
export class WsvValue {
    static containsSpecialChar(value) {
        for (let i = 0; i < value.length; i++) {
            const c = value.charCodeAt(i);
            switch (c) {
                case 0x0022:
                case 0x0023:
                case 0x000A:
                case 0x0009:
                case 0x000B:
                case 0x000C:
                case 0x000D:
                case 0x0020:
                case 0x0085:
                case 0x00A0:
                case 0x1680:
                case 0x2000:
                case 0x2001:
                case 0x2002:
                case 0x2003:
                case 0x2004:
                case 0x2005:
                case 0x2006:
                case 0x2007:
                case 0x2008:
                case 0x2009:
                case 0x200A:
                case 0x2028:
                case 0x2029:
                case 0x202F:
                case 0x205F:
                case 0x3000:
                    return true;
            }
            if (c >= 0xD800 && c <= 0xDFFF) {
                i++;
                if (c >= 0xDC00 || i >= value.length) {
                    throw new InvalidUtf16StringError();
                }
                const secondCodeUnit = value.charCodeAt(i);
                if (!(secondCodeUnit >= 0xDC00 && secondCodeUnit <= 0xDFFF)) {
                    throw new InvalidUtf16StringError();
                }
            }
        }
        return false;
    }
    static isSpecial(value) {
        if (value === null || value.length === 0 || value === "-" || WsvValue.containsSpecialChar(value)) {
            return true;
        }
        else {
            return false;
        }
    }
    static serialize(value) {
        if (value === null) {
            return "-";
        }
        else if (value.length === 0) {
            return "\"\"";
        }
        else if (value === "-") {
            return "\"-\"";
        }
        else if (WsvValue.containsSpecialChar(value)) {
            let size = 2;
            for (let i = 0; i < value.length; i++) {
                const codeUnit = value.charCodeAt(i);
                switch (codeUnit) {
                    case 0x000A:
                        size += 3;
                        break;
                    case 0x0022:
                        size += 2;
                        break;
                    default:
                        size++;
                }
            }
            const bytes = new Uint8Array(size * 2);
            const view = new DataView(bytes.buffer);
            view.setUint16(0, 0x0022, false);
            let index = 2;
            for (let i = 0; i < value.length; i++) {
                const codeUnit = value.charCodeAt(i);
                switch (codeUnit) {
                    case 0x000A:
                        view.setUint16(index, 0x0022, false);
                        index += 2;
                        view.setUint16(index, 0x002F, false);
                        index += 2;
                        view.setUint16(index, 0x0022, false);
                        index += 2;
                        break;
                    case 0x0022:
                        view.setUint16(index, 0x0022, false);
                        index += 2;
                        view.setUint16(index, 0x0022, false);
                        index += 2;
                        break;
                    default:
                        view.setUint16(index, codeUnit, false);
                        index += 2;
                }
            }
            view.setUint16(index, 0x0022, false);
            return Utf16String.fromUtf16Bytes(bytes, false, false);
        }
        else {
            return value;
        }
    }
    static parse(str, allowWhitespaceAndComment = false) {
        // TODO optimize
        const line = WsvParser.parseLine(str, true);
        if (line.values.length === 0) {
            throw new Error("No value");
        }
        else if (line.values.length > 1) {
            throw new Error("Multiple values");
        }
        if (!allowWhitespaceAndComment) {
            if (line.hasComment) {
                throw new Error("Comment not allowed");
            }
            const whitespaces = WsvLine.internalWhitespaces(line);
            if (whitespaces !== null && whitespaces.length > 0 && (whitespaces[0] !== null || whitespaces.length > 1)) {
                throw new Error("Whitespace not allowed");
            }
        }
        return line.values[0];
    }
}
// ----------------------------------------------------------------------
export class WsvSerializer {
    static serializeValues(values) {
        const strings = [];
        for (let i = 0; i < values.length; i++) {
            if (i !== 0) {
                strings.push(" ");
            }
            const serialized = WsvValue.serialize(values[i]);
            strings.push(serialized);
        }
        return strings.join("");
    }
    static serializeJaggedArray(jaggedArray) {
        const lines = [];
        for (const values of jaggedArray) {
            const line = WsvSerializer.serializeValues(values);
            lines.push(line);
        }
        return ReliableTxtLines.join(lines);
    }
    static internalSerializeValuesWhitespacesAndComment(values, whitespaces, comment) {
        var _a;
        const strings = [];
        whitespaces !== null && whitespaces !== void 0 ? whitespaces : (whitespaces = []);
        for (let i = 0; i < values.length; i++) {
            let whitespace = i < whitespaces.length ? whitespaces[i] : null;
            whitespace !== null && whitespace !== void 0 ? whitespace : (whitespace = i !== 0 ? " " : "");
            strings.push(whitespace);
            const serialized = WsvValue.serialize(values[i]);
            strings.push(serialized);
        }
        if (whitespaces.length > values.length) {
            strings.push((_a = whitespaces[values.length]) !== null && _a !== void 0 ? _a : "");
        }
        else if (comment !== null && values.length > 0 && values.length >= whitespaces.length) {
            strings.push(" ");
        }
        if (comment !== null) {
            strings.push("#" + comment);
        }
        return strings.join("");
    }
    static serializeLines(lines, preserveWhitespaceAndComment = true) {
        const lineStrings = [];
        for (const line of lines) {
            lineStrings.push(line.toString(preserveWhitespaceAndComment));
        }
        return ReliableTxtLines.join(lineStrings);
    }
}
// ----------------------------------------------------------------------
class WsvParser {
    static parseLine(str, preserveWhitespacesAndComments, lineIndexOffset = 0) {
        const lines = WsvParser.parseLines(str, preserveWhitespacesAndComments, lineIndexOffset);
        if (lines.length !== 1) {
            throw new Error("Multiple WSV lines not allowed");
        }
        return lines[0];
    }
    static parseLines(str, preserveWhitespacesAndComments, lineIndexOffset = 0) {
        if (preserveWhitespacesAndComments) {
            return WsvParser.parseLinesPreserving(str, lineIndexOffset);
        }
        else {
            return WsvParser.parseLinesNonPreserving(str, lineIndexOffset);
        }
    }
    static getError(message, lineIndex, lineStartIndex, index) {
        return new WsvParserError(index, lineIndex, index - lineStartIndex, message);
    }
    static parseLinesPreserving(str, lineIndexOffset) {
        const lines = [];
        let index = 0;
        let startIndex = 0;
        let values;
        let whitespaces;
        let comment;
        let codeUnit;
        let lineIndex = lineIndexOffset - 1;
        let lineStartIndex;
        lineLoop: for (;;) {
            lineIndex++;
            lineStartIndex = index;
            values = [];
            whitespaces = [];
            comment = null;
            for (;;) {
                if (index >= str.length) {
                    lines.push(WsvLine.internal(values, whitespaces, comment));
                    break lineLoop;
                }
                codeUnit = str.charCodeAt(index);
                startIndex = index;
                wsLoop: for (;;) {
                    switch (codeUnit) {
                        case 0x0009:
                        case 0x000B:
                        case 0x000C:
                        case 0x000D:
                        case 0x0020:
                        case 0x0085:
                        case 0x00A0:
                        case 0x1680:
                        case 0x2000:
                        case 0x2001:
                        case 0x2002:
                        case 0x2003:
                        case 0x2004:
                        case 0x2005:
                        case 0x2006:
                        case 0x2007:
                        case 0x2008:
                        case 0x2009:
                        case 0x200A:
                        case 0x2028:
                        case 0x2029:
                        case 0x202F:
                        case 0x205F:
                        case 0x3000:
                            index++;
                            if (index >= str.length) {
                                break wsLoop;
                            }
                            codeUnit = str.charCodeAt(index);
                            break;
                        default:
                            break wsLoop;
                    }
                }
                if (index > startIndex) {
                    const whitespace = str.substring(startIndex, index);
                    whitespaces.push(whitespace);
                    if (index >= str.length) {
                        lines.push(WsvLine.internal(values, whitespaces, comment));
                        break lineLoop;
                    }
                    startIndex = index;
                }
                else {
                    whitespaces.push(null);
                }
                switch (codeUnit) {
                    case 0x000A:
                        lines.push(WsvLine.internal(values, whitespaces, comment));
                        index++;
                        continue lineLoop;
                    case 0x0023: {
                        index++;
                        startIndex = index;
                        comment = "";
                        let wasLineBreak = false;
                        commentLoop: for (;;) {
                            if (index >= str.length) {
                                break commentLoop;
                            }
                            codeUnit = str.charCodeAt(index);
                            index++;
                            if (codeUnit === 0x000A) {
                                wasLineBreak = true;
                                break commentLoop;
                            }
                            else if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
                                if (codeUnit >= 0xDC00 || index >= str.length) {
                                    throw new InvalidUtf16StringError();
                                }
                                const secondCodeUnit = str.charCodeAt(index);
                                if (!(secondCodeUnit >= 0xDC00 && secondCodeUnit <= 0xDFFF)) {
                                    throw new InvalidUtf16StringError();
                                }
                                index++;
                            }
                        }
                        if (wasLineBreak && index - 1 > startIndex) {
                            comment = str.substring(startIndex, index - 1);
                        }
                        else if (!wasLineBreak && index > startIndex) {
                            comment = str.substring(startIndex, index);
                        }
                        lines.push(WsvLine.internal(values, whitespaces, comment));
                        if (index >= str.length && !wasLineBreak) {
                            break lineLoop;
                        }
                        else {
                            continue lineLoop;
                        }
                    }
                }
                if (codeUnit === 0x0022) {
                    index++;
                    const strCodeUnits = [];
                    stringCharLoop: for (;;) {
                        if (index >= str.length) {
                            throw WsvParser.getError(WsvParser.stringNotClosed, lineIndex, lineStartIndex, index);
                        }
                        codeUnit = str.charCodeAt(index);
                        index++;
                        switch (codeUnit) {
                            case 0x000A:
                                throw WsvParser.getError(WsvParser.stringNotClosed, lineIndex, lineStartIndex, index - 1);
                            case 0x0022:
                                if (index >= str.length) {
                                    break stringCharLoop;
                                }
                                codeUnit = str.charCodeAt(index);
                                switch (codeUnit) {
                                    case 0x0022:
                                        strCodeUnits.push("\"");
                                        index++;
                                        break;
                                    case 0x000A:
                                    case 0x0023:
                                    case 0x0009:
                                    case 0x000B:
                                    case 0x000C:
                                    case 0x000D:
                                    case 0x0020:
                                    case 0x0085:
                                    case 0x00A0:
                                    case 0x1680:
                                    case 0x2000:
                                    case 0x2001:
                                    case 0x2002:
                                    case 0x2003:
                                    case 0x2004:
                                    case 0x2005:
                                    case 0x2006:
                                    case 0x2007:
                                    case 0x2008:
                                    case 0x2009:
                                    case 0x200A:
                                    case 0x2028:
                                    case 0x2029:
                                    case 0x202F:
                                    case 0x205F:
                                    case 0x3000:
                                        break stringCharLoop;
                                    case 0x002F:
                                        index++;
                                        if (index >= str.length) {
                                            throw WsvParser.getError(WsvParser.invalidStringLineBreak, lineIndex, lineStartIndex, index);
                                        }
                                        codeUnit = str.charCodeAt(index);
                                        if (codeUnit !== 0x0022) {
                                            throw WsvParser.getError(WsvParser.invalidStringLineBreak, lineIndex, lineStartIndex, index);
                                        }
                                        strCodeUnits.push("\n");
                                        index++;
                                        break;
                                    default:
                                        throw WsvParser.getError(WsvParser.invalidCharacterAfterString, lineIndex, lineStartIndex, index);
                                }
                                break;
                            default:
                                strCodeUnits.push(String.fromCharCode(codeUnit));
                                if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
                                    if (codeUnit >= 0xDC00 || index >= str.length) {
                                        throw new InvalidUtf16StringError();
                                    }
                                    const secondCodeUnit = str.charCodeAt(index);
                                    if (!(secondCodeUnit >= 0xDC00 && secondCodeUnit <= 0xDFFF)) {
                                        throw new InvalidUtf16StringError();
                                    }
                                    strCodeUnits.push(String.fromCharCode(secondCodeUnit));
                                    index++;
                                }
                                break;
                        }
                    }
                    values.push(strCodeUnits.join(""));
                }
                else {
                    valueCharLoop: for (;;) {
                        switch (codeUnit) {
                            case 0x000A:
                            case 0x0023:
                            case 0x0009:
                            case 0x000B:
                            case 0x000C:
                            case 0x000D:
                            case 0x0020:
                            case 0x0085:
                            case 0x00A0:
                            case 0x1680:
                            case 0x2000:
                            case 0x2001:
                            case 0x2002:
                            case 0x2003:
                            case 0x2004:
                            case 0x2005:
                            case 0x2006:
                            case 0x2007:
                            case 0x2008:
                            case 0x2009:
                            case 0x200A:
                            case 0x2028:
                            case 0x2029:
                            case 0x202F:
                            case 0x205F:
                            case 0x3000:
                                break valueCharLoop;
                            case 0x0022:
                                throw WsvParser.getError(WsvParser.invalidDoubleQuoteInValue, lineIndex, lineStartIndex, index);
                        }
                        if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
                            index++;
                            if (codeUnit >= 0xDC00 || index >= str.length) {
                                throw new InvalidUtf16StringError();
                            }
                            const secondCodeUnit = str.charCodeAt(index);
                            if (!(secondCodeUnit >= 0xDC00 && secondCodeUnit <= 0xDFFF)) {
                                throw new InvalidUtf16StringError();
                            }
                        }
                        index++;
                        if (index >= str.length) {
                            break valueCharLoop;
                        }
                        codeUnit = str.charCodeAt(index);
                    }
                    let value = str.substring(startIndex, index);
                    if (value.length === 1 && value.charCodeAt(0) === 0x002D) {
                        value = null;
                    }
                    values.push(value);
                }
            }
        }
        return lines;
    }
    static parseLinesNonPreserving(str, lineIndexOffset) {
        const lines = [];
        let index = 0;
        let startIndex = 0;
        let values;
        let codeUnit;
        let lineIndex = lineIndexOffset - 1;
        let lineStartIndex;
        lineLoop: for (;;) {
            lineIndex++;
            lineStartIndex = index;
            values = [];
            for (;;) {
                if (index >= str.length) {
                    lines.push(new WsvLine(values));
                    break lineLoop;
                }
                codeUnit = str.charCodeAt(index);
                startIndex = index;
                wsLoop: for (;;) {
                    switch (codeUnit) {
                        case 0x0009:
                        case 0x000B:
                        case 0x000C:
                        case 0x000D:
                        case 0x0020:
                        case 0x0085:
                        case 0x00A0:
                        case 0x1680:
                        case 0x2000:
                        case 0x2001:
                        case 0x2002:
                        case 0x2003:
                        case 0x2004:
                        case 0x2005:
                        case 0x2006:
                        case 0x2007:
                        case 0x2008:
                        case 0x2009:
                        case 0x200A:
                        case 0x2028:
                        case 0x2029:
                        case 0x202F:
                        case 0x205F:
                        case 0x3000:
                            index++;
                            if (index >= str.length) {
                                break wsLoop;
                            }
                            codeUnit = str.charCodeAt(index);
                            break;
                        default:
                            break wsLoop;
                    }
                }
                if (index > startIndex) {
                    if (index >= str.length) {
                        lines.push(new WsvLine(values));
                        break lineLoop;
                    }
                    startIndex = index;
                }
                switch (codeUnit) {
                    case 0x000A:
                        lines.push(new WsvLine(values));
                        index++;
                        continue lineLoop;
                    case 0x0023: {
                        index++;
                        startIndex = index;
                        let wasLineBreak = false;
                        commentLoop: for (;;) {
                            if (index >= str.length) {
                                break commentLoop;
                            }
                            codeUnit = str.charCodeAt(index);
                            index++;
                            if (codeUnit === 0x000A) {
                                wasLineBreak = true;
                                break commentLoop;
                            }
                            else if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
                                if (codeUnit >= 0xDC00 || index >= str.length) {
                                    throw new InvalidUtf16StringError();
                                }
                                const secondCodeUnit = str.charCodeAt(index);
                                if (!(secondCodeUnit >= 0xDC00 && secondCodeUnit <= 0xDFFF)) {
                                    throw new InvalidUtf16StringError();
                                }
                                index++;
                            }
                        }
                        lines.push(new WsvLine(values));
                        if (index >= str.length && !wasLineBreak) {
                            break lineLoop;
                        }
                        else {
                            continue lineLoop;
                        }
                    }
                }
                if (codeUnit === 0x0022) {
                    index++;
                    const strCodeUnits = [];
                    stringCharLoop: for (;;) {
                        if (index >= str.length) {
                            throw WsvParser.getError(WsvParser.stringNotClosed, lineIndex, lineStartIndex, index);
                        }
                        codeUnit = str.charCodeAt(index);
                        index++;
                        switch (codeUnit) {
                            case 0x000A:
                                throw WsvParser.getError(WsvParser.stringNotClosed, lineIndex, lineStartIndex, index - 1);
                            case 0x0022:
                                if (index >= str.length) {
                                    break stringCharLoop;
                                }
                                codeUnit = str.charCodeAt(index);
                                switch (codeUnit) {
                                    case 0x0022:
                                        strCodeUnits.push("\"");
                                        index++;
                                        break;
                                    case 0x000A:
                                    case 0x0023:
                                    case 0x0009:
                                    case 0x000B:
                                    case 0x000C:
                                    case 0x000D:
                                    case 0x0020:
                                    case 0x0085:
                                    case 0x00A0:
                                    case 0x1680:
                                    case 0x2000:
                                    case 0x2001:
                                    case 0x2002:
                                    case 0x2003:
                                    case 0x2004:
                                    case 0x2005:
                                    case 0x2006:
                                    case 0x2007:
                                    case 0x2008:
                                    case 0x2009:
                                    case 0x200A:
                                    case 0x2028:
                                    case 0x2029:
                                    case 0x202F:
                                    case 0x205F:
                                    case 0x3000:
                                        break stringCharLoop;
                                    case 0x002F:
                                        index++;
                                        if (index >= str.length) {
                                            throw WsvParser.getError(WsvParser.invalidStringLineBreak, lineIndex, lineStartIndex, index);
                                        }
                                        codeUnit = str.charCodeAt(index);
                                        if (codeUnit !== 0x0022) {
                                            throw WsvParser.getError(WsvParser.invalidStringLineBreak, lineIndex, lineStartIndex, index);
                                        }
                                        strCodeUnits.push("\n");
                                        index++;
                                        break;
                                    default:
                                        throw WsvParser.getError(WsvParser.invalidCharacterAfterString, lineIndex, lineStartIndex, index);
                                }
                                break;
                            default:
                                strCodeUnits.push(String.fromCharCode(codeUnit));
                                if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
                                    if (codeUnit >= 0xDC00 || index >= str.length) {
                                        throw new InvalidUtf16StringError();
                                    }
                                    const secondCodeUnit = str.charCodeAt(index);
                                    if (!(secondCodeUnit >= 0xDC00 && secondCodeUnit <= 0xDFFF)) {
                                        throw new InvalidUtf16StringError();
                                    }
                                    strCodeUnits.push(String.fromCharCode(secondCodeUnit));
                                    index++;
                                }
                                break;
                        }
                    }
                    values.push(strCodeUnits.join(""));
                }
                else {
                    valueCharLoop: for (;;) {
                        switch (codeUnit) {
                            case 0x000A:
                            case 0x0023:
                            case 0x0009:
                            case 0x000B:
                            case 0x000C:
                            case 0x000D:
                            case 0x0020:
                            case 0x0085:
                            case 0x00A0:
                            case 0x1680:
                            case 0x2000:
                            case 0x2001:
                            case 0x2002:
                            case 0x2003:
                            case 0x2004:
                            case 0x2005:
                            case 0x2006:
                            case 0x2007:
                            case 0x2008:
                            case 0x2009:
                            case 0x200A:
                            case 0x2028:
                            case 0x2029:
                            case 0x202F:
                            case 0x205F:
                            case 0x3000:
                                break valueCharLoop;
                            case 0x0022:
                                throw WsvParser.getError(WsvParser.invalidDoubleQuoteInValue, lineIndex, lineStartIndex, index);
                        }
                        if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
                            index++;
                            if (codeUnit >= 0xDC00 || index >= str.length) {
                                throw new InvalidUtf16StringError();
                            }
                            const secondCodeUnit = str.charCodeAt(index);
                            if (!(secondCodeUnit >= 0xDC00 && secondCodeUnit <= 0xDFFF)) {
                                throw new InvalidUtf16StringError();
                            }
                        }
                        index++;
                        if (index >= str.length) {
                            break valueCharLoop;
                        }
                        codeUnit = str.charCodeAt(index);
                    }
                    let value = str.substring(startIndex, index);
                    if (value.length === 1 && value.charCodeAt(0) === 0x002D) {
                        value = null;
                    }
                    values.push(value);
                }
            }
        }
        return lines;
    }
    static parseAsJaggedArray(str, lineIndexOffset = 0) {
        const lines = [];
        let index = 0;
        let startIndex = 0;
        let values;
        let codeUnit;
        let lineIndex = lineIndexOffset - 1;
        let lineStartIndex;
        lineLoop: for (;;) {
            lineIndex++;
            lineStartIndex = index;
            values = [];
            for (;;) {
                if (index >= str.length) {
                    lines.push(values);
                    break lineLoop;
                }
                codeUnit = str.charCodeAt(index);
                startIndex = index;
                wsLoop: for (;;) {
                    switch (codeUnit) {
                        case 0x0009:
                        case 0x000B:
                        case 0x000C:
                        case 0x000D:
                        case 0x0020:
                        case 0x0085:
                        case 0x00A0:
                        case 0x1680:
                        case 0x2000:
                        case 0x2001:
                        case 0x2002:
                        case 0x2003:
                        case 0x2004:
                        case 0x2005:
                        case 0x2006:
                        case 0x2007:
                        case 0x2008:
                        case 0x2009:
                        case 0x200A:
                        case 0x2028:
                        case 0x2029:
                        case 0x202F:
                        case 0x205F:
                        case 0x3000:
                            index++;
                            if (index >= str.length) {
                                break wsLoop;
                            }
                            codeUnit = str.charCodeAt(index);
                            break;
                        default:
                            break wsLoop;
                    }
                }
                if (index > startIndex) {
                    if (index >= str.length) {
                        lines.push(values);
                        break lineLoop;
                    }
                    startIndex = index;
                }
                switch (codeUnit) {
                    case 0x000A:
                        lines.push(values);
                        index++;
                        continue lineLoop;
                    case 0x0023: {
                        index++;
                        startIndex = index;
                        let wasLineBreak = false;
                        commentLoop: for (;;) {
                            if (index >= str.length) {
                                break commentLoop;
                            }
                            codeUnit = str.charCodeAt(index);
                            index++;
                            if (codeUnit === 0x000A) {
                                wasLineBreak = true;
                                break commentLoop;
                            }
                            else if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
                                if (codeUnit >= 0xDC00 || index >= str.length) {
                                    throw new InvalidUtf16StringError();
                                }
                                const secondCodeUnit = str.charCodeAt(index);
                                if (!(secondCodeUnit >= 0xDC00 && secondCodeUnit <= 0xDFFF)) {
                                    throw new InvalidUtf16StringError();
                                }
                                index++;
                            }
                        }
                        lines.push(values);
                        if (index >= str.length && !wasLineBreak) {
                            break lineLoop;
                        }
                        else {
                            continue lineLoop;
                        }
                    }
                }
                if (codeUnit === 0x0022) {
                    index++;
                    const strCodeUnits = [];
                    stringCharLoop: for (;;) {
                        if (index >= str.length) {
                            throw WsvParser.getError(WsvParser.stringNotClosed, lineIndex, lineStartIndex, index);
                        }
                        codeUnit = str.charCodeAt(index);
                        index++;
                        switch (codeUnit) {
                            case 0x000A:
                                throw WsvParser.getError(WsvParser.stringNotClosed, lineIndex, lineStartIndex, index - 1);
                            case 0x0022:
                                if (index >= str.length) {
                                    break stringCharLoop;
                                }
                                codeUnit = str.charCodeAt(index);
                                switch (codeUnit) {
                                    case 0x0022:
                                        strCodeUnits.push("\"");
                                        index++;
                                        break;
                                    case 0x000A:
                                    case 0x0023:
                                    case 0x0009:
                                    case 0x000B:
                                    case 0x000C:
                                    case 0x000D:
                                    case 0x0020:
                                    case 0x0085:
                                    case 0x00A0:
                                    case 0x1680:
                                    case 0x2000:
                                    case 0x2001:
                                    case 0x2002:
                                    case 0x2003:
                                    case 0x2004:
                                    case 0x2005:
                                    case 0x2006:
                                    case 0x2007:
                                    case 0x2008:
                                    case 0x2009:
                                    case 0x200A:
                                    case 0x2028:
                                    case 0x2029:
                                    case 0x202F:
                                    case 0x205F:
                                    case 0x3000:
                                        break stringCharLoop;
                                    case 0x002F:
                                        index++;
                                        if (index >= str.length) {
                                            throw WsvParser.getError(WsvParser.invalidStringLineBreak, lineIndex, lineStartIndex, index);
                                        }
                                        codeUnit = str.charCodeAt(index);
                                        if (codeUnit !== 0x0022) {
                                            throw WsvParser.getError(WsvParser.invalidStringLineBreak, lineIndex, lineStartIndex, index);
                                        }
                                        strCodeUnits.push("\n");
                                        index++;
                                        break;
                                    default:
                                        throw WsvParser.getError(WsvParser.invalidCharacterAfterString, lineIndex, lineStartIndex, index);
                                }
                                break;
                            default:
                                strCodeUnits.push(String.fromCharCode(codeUnit));
                                if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
                                    if (codeUnit >= 0xDC00 || index >= str.length) {
                                        throw new InvalidUtf16StringError();
                                    }
                                    const secondCodeUnit = str.charCodeAt(index);
                                    if (!(secondCodeUnit >= 0xDC00 && secondCodeUnit <= 0xDFFF)) {
                                        throw new InvalidUtf16StringError();
                                    }
                                    strCodeUnits.push(String.fromCharCode(secondCodeUnit));
                                    index++;
                                }
                                break;
                        }
                    }
                    values.push(strCodeUnits.join(""));
                }
                else {
                    valueCharLoop: for (;;) {
                        switch (codeUnit) {
                            case 0x000A:
                            case 0x0023:
                            case 0x0009:
                            case 0x000B:
                            case 0x000C:
                            case 0x000D:
                            case 0x0020:
                            case 0x0085:
                            case 0x00A0:
                            case 0x1680:
                            case 0x2000:
                            case 0x2001:
                            case 0x2002:
                            case 0x2003:
                            case 0x2004:
                            case 0x2005:
                            case 0x2006:
                            case 0x2007:
                            case 0x2008:
                            case 0x2009:
                            case 0x200A:
                            case 0x2028:
                            case 0x2029:
                            case 0x202F:
                            case 0x205F:
                            case 0x3000:
                                break valueCharLoop;
                            case 0x0022:
                                throw WsvParser.getError(WsvParser.invalidDoubleQuoteInValue, lineIndex, lineStartIndex, index);
                        }
                        if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
                            index++;
                            if (codeUnit >= 0xDC00 || index >= str.length) {
                                throw new InvalidUtf16StringError();
                            }
                            const secondCodeUnit = str.charCodeAt(index);
                            if (!(secondCodeUnit >= 0xDC00 && secondCodeUnit <= 0xDFFF)) {
                                throw new InvalidUtf16StringError();
                            }
                        }
                        index++;
                        if (index >= str.length) {
                            break valueCharLoop;
                        }
                        codeUnit = str.charCodeAt(index);
                    }
                    let value = str.substring(startIndex, index);
                    if (value.length === 1 && value.charCodeAt(0) === 0x002D) {
                        value = null;
                    }
                    values.push(value);
                }
            }
        }
        return lines;
    }
}
WsvParser.stringNotClosed = "String not closed";
WsvParser.invalidStringLineBreak = "Invalid string line break";
WsvParser.invalidCharacterAfterString = "Invalid character after string";
WsvParser.invalidDoubleQuoteInValue = "Invalid double quote in value";
export { WsvParser };
//# sourceMappingURL=wsv.js.map