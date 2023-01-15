"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const reliabletxt_1 = require("@stenway/reliabletxt");
const src_1 = require("../src");
test("WsvParserError.constructor", () => {
    const error = new src_1.WsvParserError(10, 2, 3, "Test");
    expect(error.message).toEqual("Test (3, 4)");
    expect(error.index).toEqual(10);
});
// ----------------------------------------------------------------------
describe("WsvStringUtil.validateWhitespaceString", () => {
    test.each([
        ["", true],
        [" ", true],
        ["\t", true],
        ["  \t  ", true],
        ["\u0009\u000B\u000C\u000D\u0020\u0085\u00A0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u2028\u2029\u202F\u205F\u3000", true],
        [" ", false],
        ["\t", false],
        ["  \t  ", false],
        ["\u0009\u000B\u000C\u000D\u0020\u0085\u00A0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u2028\u2029\u202F\u205F\u3000", false],
    ])("Given %p and %p", (str, isFirst) => {
        src_1.WsvStringUtil.validateWhitespaceString(str, isFirst);
    });
    test.each([
        ["", false],
        ["a", true],
        ["a", false],
    ])("Given %p and %p throws", (str, isFirst) => {
        expect(() => src_1.WsvStringUtil.validateWhitespaceString(str, isFirst)).toThrowError();
    });
});
describe("WsvStringUtil.validateWhitespaceStrings", () => {
    test.each([
        [null],
        [[]],
        [[" "]],
        [[" ", " "]],
        [[null, " "]],
        [[" ", null]],
        [[""]],
        [["", " "]],
        [["", null]],
        [["", " ", "   \t  "]],
    ])("Given %p", (input) => {
        src_1.WsvStringUtil.validateWhitespaceStrings(input);
    });
    test.each([
        [["", ""]],
        [[" ", "  a"]],
    ])("Given %p throws", (input) => {
        expect(() => src_1.WsvStringUtil.validateWhitespaceStrings(input)).toThrowError();
    });
});
describe("WsvStringUtil.validateComment", () => {
    test.each([
        [null],
        [""],
        [" "],
        ["a"],
        ["comment"],
        ["#"],
        ["######"],
        ["\uD834\uDD1E"],
    ])("Given %p", (input) => {
        src_1.WsvStringUtil.validateComment(input);
    });
    test.each([
        ["\n"],
        ["\uD834"],
        ["\uD834\uD834"],
        ["\uDD1E"],
        ["\uDD1E\uDD1E"],
    ])("Given %p throws", (input) => {
        expect(() => src_1.WsvStringUtil.validateComment(input)).toThrowError();
    });
});
// ----------------------------------------------------------------------
describe("WsvLine.constructor + set", () => {
    test.each([
        [[], null, null, "", ""],
        [["a"], null, null, "a", "a"],
        [["a", "b"], null, null, "a b", "a b"],
        [["a", "b", "c"], null, null, "a b c", "a b c"],
        [[], [], null, "", ""],
        [[], [""], null, "", ""],
        [[], ["\t\t"], null, "\t\t", ""],
        [[], ["\t\t", "  "], null, "\t\t", ""],
        [["a"], [], null, "a", "a"],
        [["a"], [""], null, "a", "a"],
        [["a"], ["\t\t"], null, "\t\ta", "a"],
        [["a"], ["\t\t", "  "], null, "\t\ta  ", "a"],
        [[], [], "c", "#c", ""],
        [[], [""], "c", "#c", ""],
        [[], ["\t\t"], "c", "\t\t#c", ""],
        [[], ["\t\t", "  "], "c", "\t\t#c", ""],
        [["a"], null, "c", "a #c", "a"],
        [["a"], [], "c", "a #c", "a"],
        [["a"], [""], "c", "a #c", "a"],
        [["a"], ["\t\t"], "c", "\t\ta #c", "a"],
        [["a"], ["\t\t", null], "c", "\t\ta#c", "a"],
        [["a"], ["\t\t", "  "], "c", "\t\ta  #c", "a"],
        [["a"], [null], "c", "a #c", "a"],
        [["a"], [null, null], "c", "a#c", "a"],
        [["a", "b"], [null, null, null], "c", "a b#c", "a b"],
        [[null], null, null, "-", "-"],
        [["a", null], null, null, "a -", "a -"],
    ])("Given %p, %p and %p returns %p", (values, whitespaces, comment, output, output2) => {
        let line = new src_1.WsvLine(values, whitespaces, comment);
        expect(line.values).toEqual(values);
        expect(line.whitespaces).toEqual(whitespaces);
        expect(line.comment).toEqual(comment);
        expect(line.toString()).toEqual(output);
        expect(line.toString(false)).toEqual(output2);
        line = new src_1.WsvLine([]);
        line.set(values, whitespaces, comment);
        expect(line.values).toEqual(values);
        expect(line.whitespaces).toEqual(whitespaces);
        expect(line.comment).toEqual(comment);
        expect(line.toString()).toEqual(output);
        expect(line.toString(false)).toEqual(output2);
    });
    test.each([
        [[], ""],
        [["a"], "a"],
        [["a", "b"], "a b"],
        [["a", "b", "c"], "a b c"],
    ])("Given %p returns %p", (values, output) => {
        let line = new src_1.WsvLine(values);
        expect(line.values).toEqual(values);
        expect(line.whitespaces).toEqual(null);
        expect(line.comment).toEqual(null);
        expect(line.toString()).toEqual(output);
        line = new src_1.WsvLine([]);
        line.set(values);
        expect(line.values).toEqual(values);
        expect(line.whitespaces).toEqual(null);
        expect(line.comment).toEqual(null);
        expect(line.toString()).toEqual(output);
    });
    test.each([
        [[], null, "\n"],
        [[], ["a"], null],
        [["a"], ["", ""], null],
    ])("Given %p, %p and %p throws", (values, whitespaces, comment) => {
        expect(() => new src_1.WsvLine(values, whitespaces, comment)).toThrow();
        const line = new src_1.WsvLine([]);
        expect(() => line.set(values, whitespaces, comment)).toThrow();
    });
});
describe("WsvLine.hasValues", () => {
    test.each([
        [[], false],
        [["a"], true],
    ])("Given %p returns %p", (input, output) => {
        expect(new src_1.WsvLine(input).hasValues).toEqual(output);
    });
});
describe("WsvLine.hasComment", () => {
    test.each([
        [null, false],
        ["", true],
        ["c", true],
    ])("Given %p returns %p", (input, output) => {
        expect(new src_1.WsvLine([], null, input).hasComment).toEqual(output);
    });
});
describe("WsvLine.whitespaces", () => {
    test("Change array", () => {
        const line = new src_1.WsvLine([]);
        const whitespaces = [" ", " "];
        line.whitespaces = whitespaces;
        whitespaces[0] = "a";
        expect(line.whitespaces).toEqual([" ", " "]);
    });
});
test("WsvLine.internal", () => {
    const line = src_1.WsvLine.internal([], ["a"], "\n");
    expect(line.whitespaces).toEqual(["a"]);
    expect(line.comment).toEqual("\n");
});
test("WsvLine.internalWhitespaces", () => {
    var _a;
    const line = new src_1.WsvLine([], []);
    const whitespaces = (_a = src_1.WsvLine.internalWhitespaces(line)) !== null && _a !== void 0 ? _a : [];
    whitespaces[0] = "a";
    expect(line.whitespaces).toEqual(["a"]);
});
describe("WsvLine.parse", () => {
    test.each([
        ["", "", ""],
        [" ", " ", ""],
        ["  ", "  ", ""],
        ["a", "a", "a"],
        ["a ", "a ", "a"],
        ["a  ", "a  ", "a"],
        [" a", " a", "a"],
        ["  a", "  a", "a"],
        ["  a  ", "  a  ", "a"],
        ["a b", "a b", "a b"],
        ["a  b", "a  b", "a b"],
        [" a b", " a b", "a b"],
        ["  a b", "  a b", "a b"],
        ["  a  b", "  a  b", "a b"],
        ["a b ", "a b ", "a b"],
        ["a  b  ", "a  b  ", "a b"],
        [" a b ", " a b ", "a b"],
        ["  a b ", "  a b ", "a b"],
        ["  a  b  ", "  a  b  ", "a b"],
        ["#", "#", ""],
        [" #", " #", ""],
        ["  #", "  #", ""],
        ["a#", "a#", "a"],
        ["a #", "a #", "a"],
        ["a  #", "a  #", "a"],
        [" a#", " a#", "a"],
        ["  a#", "  a#", "a"],
        ["  a  #", "  a  #", "a"],
        ["a b#", "a b#", "a b"],
        ["a  b#", "a  b#", "a b"],
        [" a b#", " a b#", "a b"],
        ["  a b#", "  a b#", "a b"],
        ["  a  b#", "  a  b#", "a b"],
        ["a b #", "a b #", "a b"],
        ["a  b  #", "a  b  #", "a b"],
        [" a b #", " a b #", "a b"],
        ["  a b #", "  a b #", "a b"],
        ["  a  b  #", "  a  b  #", "a b"],
        ["#c", "#c", ""],
        [" #c", " #c", ""],
        ["  #c", "  #c", ""],
        ["a#c", "a#c", "a"],
        ["a #c", "a #c", "a"],
        ["a  #c", "a  #c", "a"],
        [" a#c", " a#c", "a"],
        ["  a#c", "  a#c", "a"],
        ["  a  #c", "  a  #c", "a"],
        ["a b#c", "a b#c", "a b"],
        ["a  b#c", "a  b#c", "a b"],
        [" a b#c", " a b#c", "a b"],
        ["  a b#c", "  a b#c", "a b"],
        ["  a  b#c", "  a  b#c", "a b"],
        ["a b #c", "a b #c", "a b"],
        ["a  b  #c", "a  b  #c", "a b"],
        [" a b #c", " a b #c", "a b"],
        ["  a b #c", "  a b #c", "a b"],
        ["  a  b  #c", "  a  b  #c", "a b"],
        ["\uD834\uDD1E", "\uD834\uDD1E", "\uD834\uDD1E"],
        ["#\uD834\uDD1E", "#\uD834\uDD1E", ""],
        [`""`, `""`, `""`],
        [`"" `, `"" `, `""`],
        [`"\uD834\uDD1E"`, `\uD834\uDD1E`, `\uD834\uDD1E`],
        ["-", "-", "-"],
        ["-a", "-a", "-a"],
    ])("Given %p returns %p and %p", (input, output, output2) => {
        expect(src_1.WsvLine.parse(input).toString()).toEqual(output);
        expect(src_1.WsvLine.parse(input, false).toString()).toEqual(output2);
    });
});
describe("WsvLine.parse + parseAsArray", () => {
    test.each([
        [`"`],
        [`"""`],
        [`""/`],
        [`""/"`],
        [`"\n`],
        [`"""\n`],
        [`""/\n`],
        [`""/"\n`],
        [`""a`],
        [`#\uD834`],
        [`#\uD834\uD834`],
        [`a"`],
        ["\uD834"],
        ["\uD834\uD834"],
        ["\uDD1E\uDD1E"],
        ["\uDD1E"],
        ["\"\uD834"],
        ["\"\uD834\uD834"],
        ["\"\uDD1E\uDD1E"],
        ["\"\uDD1E"],
        ["a\n"],
        ["a#c\n"],
    ])("Given %p throws", (input) => {
        expect(() => src_1.WsvLine.parse(input, true)).toThrowError();
        expect(() => src_1.WsvLine.parse(input, false)).toThrowError();
        expect(() => src_1.WsvLine.parseAsArray(input)).toThrowError();
    });
});
describe("WsvLine.parse + whitespaces", () => {
    test.each([
        ["", []],
        ["  ", ["  "]],
        ["a", [null]],
        ["  a", ["  "]],
        ["a  ", [null, "  "]],
        ["  a  ", ["  ", "  "]],
        ["#", [null]],
        ["  #", ["  "]],
        ["a#", [null, null]],
        ["  a#", ["  ", null]],
        ["a  #", [null, "  "]],
        ["  a  #", ["  ", "  "]],
    ])("Given %p returns %p", (input, output) => {
        expect(src_1.WsvLine.parse(input).whitespaces).toEqual(output);
    });
});
describe("WsvLine.parseAsArray", () => {
    test.each([
        ["", []],
        ["a", ["a"]],
        ["a b", ["a", "b"]],
        ["a b c", ["a", "b", "c"]],
        ["  a  b  c   ", ["a", "b", "c"]],
        ["a#", ["a"]],
        ["a#c", ["a"]],
        ["a #c", ["a"]],
    ])("Given %p returns %p", (input, output) => {
        expect(src_1.WsvLine.parseAsArray(input)).toEqual(output);
    });
});
describe("WsvLine.serialize", () => {
    test.each([
        [[], ""],
        [["a"], "a"],
        [["a", "b"], "a b"],
        [["a", "b", "c"], "a b c"],
    ])("Given %p returns %p", (input, output) => {
        expect(src_1.WsvLine.serialize(input)).toEqual(output);
    });
});
// ----------------------------------------------------------------------
describe("WsvValue.isSpecial", () => {
    test.each([
        [null, true],
        ["", true],
        ["-", true],
        ["#", true],
        ["\"", true],
        ["\n", true],
        ["\u0009", true],
        ["\u000B", true],
        ["\u000C", true],
        ["\u000D", true],
        ["\u0020", true],
        ["\u0085", true],
        ["\u00A0", true],
        ["\u1680", true],
        ["\u2000", true],
        ["\u2001", true],
        ["\u2002", true],
        ["\u2003", true],
        ["\u2004", true],
        ["\u2005", true],
        ["\u2006", true],
        ["\u2007", true],
        ["\u2008", true],
        ["\u2009", true],
        ["\u200A", true],
        ["\u2028", true],
        ["\u2029", true],
        ["\u202F", true],
        ["\u205F", true],
        ["\u3000", true],
        ["a", false],
        ["\uD834\uDD1E", false],
        ["--", false],
    ])("Given %p returns %p", (input, output) => {
        expect(src_1.WsvValue.isSpecial(input)).toEqual(output);
    });
    test.each([
        ["\uD834"],
        ["\uD834\uD834"],
        ["\uDD1E"],
        ["\uDD1E\uDD1E"],
    ])("Given %p throws", (input) => {
        expect(() => src_1.WsvValue.isSpecial(input)).toThrowError();
    });
});
describe("WsvValue.serialize", () => {
    test.each([
        [null, `-`],
        ["", `""`],
        ["-", `"-"`],
        ["#", `"#"`],
        ["\"", `""""`],
        ["\n", `""/""`],
        ["\u0009", `"\u0009"`],
        ["\u000B", `"\u000B"`],
        ["\u000C", `"\u000C"`],
        ["\u000D", `"\u000D"`],
        ["\u0020", `"\u0020"`],
        ["\u0085", `"\u0085"`],
        ["\u00A0", `"\u00A0"`],
        ["\u1680", `"\u1680"`],
        ["\u2000", `"\u2000"`],
        ["\u2001", `"\u2001"`],
        ["\u2002", `"\u2002"`],
        ["\u2003", `"\u2003"`],
        ["\u2004", `"\u2004"`],
        ["\u2005", `"\u2005"`],
        ["\u2006", `"\u2006"`],
        ["\u2007", `"\u2007"`],
        ["\u2008", `"\u2008"`],
        ["\u2009", `"\u2009"`],
        ["\u200A", `"\u200A"`],
        ["\u2028", `"\u2028"`],
        ["\u2029", `"\u2029"`],
        ["\u202F", `"\u202F"`],
        ["\u205F", `"\u205F"`],
        ["\u3000", `"\u3000"`],
        ["a", "a"],
        ["\uD834\uDD1E", "\uD834\uDD1E"],
        ["--", "--"],
    ])("Given %p returns %p", (input, output) => {
        expect(src_1.WsvValue.serialize(input)).toEqual(output);
    });
    test.each([
        ["\uD834"],
        ["\uD834\uD834"],
        ["\uDD1E"],
        ["\uDD1E\uDD1E"],
    ])("Given %p throws", (input) => {
        expect(() => src_1.WsvValue.serialize(input)).toThrowError();
    });
});
describe("WsvValue.parse", () => {
    test.each([
        [`-`, null],
        [`""`, ""],
        [`"-"`, "-"],
        [`"#"`, "#"],
        [`""""`, "\""],
        [`""/""`, "\n"],
        [`" \t"`, " \t"],
        [`"\u0009"`, "\u0009"],
        [`"\u000B"`, "\u000B"],
        [`"\u000C"`, "\u000C"],
        [`"\u000D"`, "\u000D"],
        [`"\u0020"`, "\u0020"],
        [`"\u0085"`, "\u0085"],
        [`"\u00A0"`, "\u00A0"],
        [`"\u1680"`, "\u1680"],
        [`"\u2000"`, "\u2000"],
        [`"\u2001"`, "\u2001"],
        [`"\u2002"`, "\u2002"],
        [`"\u2003"`, "\u2003"],
        [`"\u2004"`, "\u2004"],
        [`"\u2005"`, "\u2005"],
        [`"\u2006"`, "\u2006"],
        [`"\u2007"`, "\u2007"],
        [`"\u2008"`, "\u2008"],
        [`"\u2009"`, "\u2009"],
        [`"\u200A"`, "\u200A"],
        [`"\u2028"`, "\u2028"],
        [`"\u2029"`, "\u2029"],
        [`"\u202F"`, "\u202F"],
        [`"\u205F"`, "\u205F"],
        [`"\u3000"`, "\u3000"],
        [`"\uD834\uDD1E"`, "\uD834\uDD1E"],
        ["a", "a"],
        ["ab", "ab"],
        ["\uD834\uDD1E", "\uD834\uDD1E"],
        ["--", "--"],
    ])("Given %p returns %p", (input, output) => {
        expect(src_1.WsvValue.parse(input)).toEqual(output);
    });
    test.each([
        ["a", "a"],
        [" a", "a"],
        ["a ", "a"],
        [" a ", "a"],
        ["a#", "a"],
        [" a#", "a"],
        ["a #", "a"],
        [" a #", "a"],
        ["\ta\t#", "a"],
        [" a #\uD834\uDD1E", "a"],
        [`" a#"`, " a#"],
        [`" a#"#`, " a#"],
        [`" a#" #`, " a#"],
        [`\u0009"a"`, "a"],
        [`\u000B"a"`, "a"],
        [`\u000C"a"`, "a"],
        [`\u000D"a"`, "a"],
        [`\u0020"a"`, "a"],
        [`\u0085"a"`, "a"],
        [`\u00A0"a"`, "a"],
        [`\u1680"a"`, "a"],
        [`\u2000"a"`, "a"],
        [`\u2001"a"`, "a"],
        [`\u2002"a"`, "a"],
        [`\u2003"a"`, "a"],
        [`\u2004"a"`, "a"],
        [`\u2005"a"`, "a"],
        [`\u2006"a"`, "a"],
        [`\u2007"a"`, "a"],
        [`\u2008"a"`, "a"],
        [`\u2009"a"`, "a"],
        [`\u200A"a"`, "a"],
        [`\u2028"a"`, "a"],
        [`\u2029"a"`, "a"],
        [`\u202F"a"`, "a"],
        [`\u205F"a"`, "a"],
        [`\u3000"a"`, "a"],
        [`"a"\u0009`, "a"],
        [`"a"\u000B`, "a"],
        [`"a"\u000C`, "a"],
        [`"a"\u000D`, "a"],
        [`"a"\u0020`, "a"],
        [`"a"\u0085`, "a"],
        [`"a"\u00A0`, "a"],
        [`"a"\u1680`, "a"],
        [`"a"\u2000`, "a"],
        [`"a"\u2001`, "a"],
        [`"a"\u2002`, "a"],
        [`"a"\u2003`, "a"],
        [`"a"\u2004`, "a"],
        [`"a"\u2005`, "a"],
        [`"a"\u2006`, "a"],
        [`"a"\u2007`, "a"],
        [`"a"\u2008`, "a"],
        [`"a"\u2009`, "a"],
        [`"a"\u200A`, "a"],
        [`"a"\u2028`, "a"],
        [`"a"\u2029`, "a"],
        [`"a"\u202F`, "a"],
        [`"a"\u205F`, "a"],
        [`"a"\u3000`, "a"],
    ])("Given %p returns %p", (input, output) => {
        expect(src_1.WsvValue.parse(input, true)).toEqual(output);
        expect(src_1.WsvDocument.parse(input, true).lines[0].values[0]).toEqual(output);
        expect(src_1.WsvDocument.parse(input, false).lines[0].values[0]).toEqual(output);
        expect(src_1.WsvDocument.parseAsJaggedArray(input)[0][0]).toEqual(output);
    });
    test.each([
        [" a"],
        ["a "],
        [" a "],
        ["a#"],
        [" a#"],
        ["a #"],
        [" a #"],
        [""],
        ["\n"],
        ["#\n"],
        ["#c\n"],
        [" "],
        ["  "],
        ["#"],
        [" #"],
        ["  #"],
        ["a b"],
        [`"`],
        [`"""`],
        [`""/`],
        [`""/"`],
        [`"\n`],
        [`"""\n`],
        [`""/\n`],
        [`""/"\n`],
        [`""a`],
        [`#\uD834`],
        [`#\uD834\uD834`],
        [`a"`],
        ["\uD834"],
        ["\uD834\uD834"],
        ["\uDD1E\uDD1E"],
        ["\uDD1E"],
    ])("Given %p throws", (input) => {
        expect(() => src_1.WsvValue.parse(input)).toThrowError();
    });
});
// ----------------------------------------------------------------------
describe("WsvDocument.constructor", () => {
    test.each([
        [[], ""],
        [[new src_1.WsvLine(["a"])], "a"],
        [[new src_1.WsvLine(["a", "b"])], "a b"],
        [[new src_1.WsvLine(["a", "b"]), new src_1.WsvLine(["c"])], "a b\nc"],
    ])("Given %p returns %p", (input, output) => {
        const document = new src_1.WsvDocument(input);
        expect(document.toString()).toEqual(output);
        expect(document.lines).toEqual(input);
    });
    test.each([
        [reliabletxt_1.ReliableTxtEncoding.Utf8],
        [reliabletxt_1.ReliableTxtEncoding.Utf16],
        [reliabletxt_1.ReliableTxtEncoding.Utf16Reverse],
        [reliabletxt_1.ReliableTxtEncoding.Utf32],
    ])("Given %p", (input) => {
        const document = new src_1.WsvDocument([], input);
        expect(document.encoding).toEqual(input);
    });
    test("Empty", () => {
        const document = new src_1.WsvDocument();
        expect(document.lines).toEqual([]);
        expect(document.encoding).toEqual(reliabletxt_1.ReliableTxtEncoding.Utf8);
    });
});
describe("WsvDocument.addLine", () => {
    test.each([
        [[], null, null],
        [["a"], null, null],
        [["a", "b"], null, null],
        [["a", "b"], [null], null],
        [["a", "b"], [" "], null],
        [["a", "b"], [" "], "c"],
    ])("Given %p, %p and %p", (values, whitespaces, comment) => {
        const document = new src_1.WsvDocument();
        document.addLine(values, whitespaces, comment);
        expect(document.lines[0].values).toEqual(values);
        expect(document.lines[0].whitespaces).toEqual(whitespaces);
        expect(document.lines[0].comment).toEqual(comment);
    });
    test.each([
        [[]],
        [["a"]],
        [["a", "b"]],
    ])("Given %p", (values) => {
        const document = new src_1.WsvDocument();
        document.addLine(values);
        expect(document.lines[0].values).toEqual(values);
        expect(document.lines[0].whitespaces).toEqual(null);
        expect(document.lines[0].comment).toEqual(null);
    });
    test.each([
        [["a"], null],
        [[" "], "\n"],
    ])("Given %p and %p throws", (whitespaces, comment) => {
        const document = new src_1.WsvDocument();
        expect(() => document.addLine([], whitespaces, comment)).toThrowError();
    });
});
test("WsvDocument.toJaggedArray()", () => {
    const document = new src_1.WsvDocument();
    document.addLine(["a", "b"]);
    document.addLine([]);
    document.addLine(["c"]);
    document.addLine([null]);
    expect(document.toJaggedArray()).toEqual([["a", "b"], [], ["c"], [null]]);
});
describe("WsvDocument.getBytes", () => {
    test.each([
        [reliabletxt_1.ReliableTxtEncoding.Utf8, [0xEF, 0xBB, 0xBF]],
        [reliabletxt_1.ReliableTxtEncoding.Utf16, [0xFE, 0xFF]],
        [reliabletxt_1.ReliableTxtEncoding.Utf16Reverse, [0xFF, 0xFE]],
        [reliabletxt_1.ReliableTxtEncoding.Utf32, [0x0, 0x0, 0xFE, 0xFF]],
    ])("Given %p returns %p", (encoding, output) => {
        const document = new src_1.WsvDocument([], encoding);
        expect(document.getBytes()).toEqual(new Uint8Array(output));
    });
    test.each([
        [reliabletxt_1.ReliableTxtEncoding.Utf8, [0xEF, 0xBB, 0xBF, 0x61, 0x0A, 0x62]],
        [reliabletxt_1.ReliableTxtEncoding.Utf16, [0xFE, 0xFF, 0x0, 0x61, 0x0, 0x0A, 0x0, 0x62]],
        [reliabletxt_1.ReliableTxtEncoding.Utf16Reverse, [0xFF, 0xFE, 0x61, 0x0, 0x0A, 0x0, 0x62, 0x0]],
        [reliabletxt_1.ReliableTxtEncoding.Utf32, [0x0, 0x0, 0xFE, 0xFF, 0x0, 0x0, 0x0, 0x61, 0x0, 0x0, 0x0, 0x0A, 0x0, 0x0, 0x0, 0x62]],
    ])("Given %p returns %p", (encoding, output) => {
        const document = new src_1.WsvDocument([new src_1.WsvLine(["a"]), new src_1.WsvLine(["b"])], encoding);
        expect(document.getBytes()).toEqual(new Uint8Array(output));
    });
});
describe("WsvDocument.parse", () => {
    test.each([
        ["", true, "", ""],
        ["a", true, "a", "a"],
        [" a ", true, " a ", "a"],
        [" a   b #c\n  d", true, " a   b #c\n  d", "a b\nd"],
        ["\"a\"", true, "a", "a"],
        ["", false, "", ""],
        ["a", false, "a", "a"],
        [" a ", false, "a", "a"],
        [" a   b #c\n  d", false, "a b\nd", "a b\nd"],
        ["\"a\"", false, "a", "a"],
        [`""""\n`, true, `""""\n`, `""""\n`],
        [`""/""\n`, true, `""/""\n`, `""/""\n`],
        [`" \t"\n`, true, `" \t"\n`, `" \t"\n`],
        [`""""\n`, false, `""""\n`, `""""\n`],
        [`""/""\n`, false, `""/""\n`, `""/""\n`],
        [`" \t"\n`, false, `" \t"\n`, `" \t"\n`],
        [" a \n\n \n b ", true, " a \n\n \n b ", "a\n\n\nb"],
    ])("Given %p and %p returns %p and %p", (input, preserve, output1, output2) => {
        const document = src_1.WsvDocument.parse(input, preserve);
        expect(document.toString(true)).toEqual(output1);
        expect(document.toString(false)).toEqual(output2);
    });
    test("Without preserving argument", () => {
        const document = src_1.WsvDocument.parse(" a   b #c\n  d");
        expect(document.toString()).toEqual(" a   b #c\n  d");
    });
});
describe("WsvDocument.parseAsJaggedArray + fromJaggedArray + WsvSerializer.serializeJaggedArray", () => {
    test.each([
        ["", ""],
        ["a", "a"],
        ["a b", "a b"],
        ["a b\nc", "a b\nc"],
        [" a   b #c\n  d", "a b\nd"],
        ["\"a\"", "a"],
        [`-`, `-`],
        [`""`, `""`],
        [`"a"`, `a`],
        [`"a" `, `a`],
        [`"-"`, `"-"`],
        [`"#"`, `"#"`],
        [`""""`, `""""`],
        [`""/""`, `""/""`],
        [`" \t"`, `" \t"`],
        [`""""\n`, `""""\n`],
        [`""/""\n`, `""/""\n`],
        [`" \t"\n`, `" \t"\n`],
        [`"\u0009"`, `"\u0009"`],
        [`"\uD834\uDD1E"`, "\uD834\uDD1E"],
        ["a", "a"],
        ["ab", "ab"],
        ["\uD834\uDD1E", "\uD834\uDD1E"],
        ["--", "--"],
        ["#", ""],
        ["#\uD834\uDD1E", ""],
    ])("Given %p returns %p", (input, output) => {
        const jaggedArray = src_1.WsvDocument.parseAsJaggedArray(input);
        const document = src_1.WsvDocument.fromJaggedArray(jaggedArray);
        expect(document.toString()).toEqual(output);
        expect(src_1.WsvSerializer.serializeJaggedArray(jaggedArray)).toEqual(output);
    });
    test.each([
        [`"`],
        [`"""`],
        [`""/`],
        [`""/"`],
        [`"\n`],
        [`"""\n`],
        [`""/\n`],
        [`""/"\n`],
        [`""a`],
        [`#\uD834`],
        [`#\uD834\uD834`],
        [`a"`],
        ["\uD834"],
        ["\uD834\uD834"],
        ["\uDD1E\uDD1E"],
        ["\uDD1E"],
        ["\"\uD834"],
        ["\"\uD834\uD834"],
        ["\"\uDD1E\uDD1E"],
        ["\"\uDD1E"],
    ])("Given %p throws", (input) => {
        expect(() => src_1.WsvDocument.parseAsJaggedArray(input)).toThrowError();
    });
});
describe("WsvDocument.fromBytes", () => {
    test.each([
        [reliabletxt_1.ReliableTxtEncoding.Utf8],
        [reliabletxt_1.ReliableTxtEncoding.Utf16],
        [reliabletxt_1.ReliableTxtEncoding.Utf16Reverse],
        [reliabletxt_1.ReliableTxtEncoding.Utf32],
    ])("Given %p", (encoding) => {
        const document = src_1.WsvDocument.parse("a b\nc");
        document.encoding = encoding;
        const document2 = src_1.WsvDocument.fromBytes(document.getBytes());
        expect(document2.toString()).toEqual(document.toString());
        expect(document2.encoding).toEqual(document.encoding);
    });
    test("Throws", () => {
        expect(() => src_1.WsvDocument.fromBytes(new Uint8Array([]))).toThrowError(reliabletxt_1.NoReliableTxtPreambleError);
    });
});
test("WsvDocument.fromLines", () => {
    const document = src_1.WsvDocument.fromLines(["a b", "c d #comment"]);
    expect(document.toString()).toEqual("a b\nc d #comment");
});
describe("WsvDocument.toBase64String", () => {
    test.each([
        ["", reliabletxt_1.ReliableTxtEncoding.Utf8, "Base64|77u/|"],
        ["a b #c\n d", reliabletxt_1.ReliableTxtEncoding.Utf8, "Base64|77u/YSBiICNjCiBk|"],
        ["a b #c\n d", reliabletxt_1.ReliableTxtEncoding.Utf16, "Base64|/v8AYQAgAGIAIAAjAGMACgAgAGQ=|"],
    ])("Given %j and %p returns %p", (input1, input2, output) => {
        const document = src_1.WsvDocument.parse(input1, true, input2);
        expect(document.toBase64String()).toEqual(output);
    });
});
describe("WsvDocument.fromBase64String", () => {
    test.each([
        ["Base64|77u/|", "", reliabletxt_1.ReliableTxtEncoding.Utf8],
        ["Base64|77u/YSBiICNjCiBk|", "a b #c\n d", reliabletxt_1.ReliableTxtEncoding.Utf8],
        ["Base64|/v8AYQAgAGIAIAAjAGMACgAgAGQ=|", "a b #c\n d", reliabletxt_1.ReliableTxtEncoding.Utf16],
    ])("Given %p returns %j and %p", (input, output1, output2) => {
        const fromDocument = src_1.WsvDocument.fromBase64String(input);
        expect(fromDocument.toString()).toEqual(output1);
        expect(fromDocument.encoding).toEqual(output2);
    });
    test.each([
        ["Base64||"],
        ["Base64|TWFu|"],
        ["BASE64|77u/TWFu|"],
        ["77u/TWFu"],
    ])("Given %p throws", (input) => {
        expect(() => src_1.WsvDocument.fromBase64String(input)).toThrow();
    });
});
// ----------------------------------------------------------------------
test("WsvSerializer.serializeLines", () => {
    expect(src_1.WsvSerializer.serializeLines([new src_1.WsvLine(["a", "b"]), new src_1.WsvLine([]), new src_1.WsvLine(["c"])])).toEqual("a b\n\nc");
});
//# sourceMappingURL=wsv.test.js.map