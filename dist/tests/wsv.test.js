import { NoReliableTxtPreambleError, ReliableTxtEncoding } from "@stenway/reliabletxt";
import { BinaryWsvDecoder, BinaryWsvEncoder, BinaryWsvUtil, Uint8ArrayBuilder, Uint8ArrayReader, WsvDocument, WsvLine, WsvParserError, WsvSerializer, WsvStringUtil, WsvValue } from "../src/wsv.js";
function getTestTable() {
    return `a 	U+0061    61            0061        "Latin Small Letter A"
~ 	U+007E    7E            007E        Tilde
¥ 	U+00A5    C2_A5         00A5        "Yen Sign"
» 	U+00BB    C2_BB         00BB        "Right-Pointing Double Angle Quotation Mark"
½ 	U+00BD    C2_BD         00BD        "Vulgar Fraction One Half"
¿ 	U+00BF    C2_BF         00BF        "Inverted Question Mark"
ß 	U+00DF    C3_9F         00DF        "Latin Small Letter Sharp S"
ä 	U+00E4    C3_A4         00E4        "Latin Small Letter A with Diaeresis"
ï 	U+00EF    C3_AF         00EF        "Latin Small Letter I with Diaeresis"
œ 	U+0153    C5_93         0153        "Latin Small Ligature Oe"
€ 	U+20AC    E2_82_AC      20AC        "Euro Sign"
東 	U+6771    E6_9D_B1      6771        "CJK Unified Ideograph-6771"
𝄞 	U+1D11E   F0_9D_84_9E   D834_DD1E   "Musical Symbol G Clef"
𠀇 	U+20007   F0_A0_80_87   D840_DC07   "CJK Unified Ideograph-20007"`;
}
// ----------------------------------------------------------------------
test("WsvParserError.constructor", () => {
    const error = new WsvParserError(10, 2, 3, "Test");
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
        WsvStringUtil.validateWhitespaceString(str, isFirst);
    });
    test.each([
        ["", false],
        ["a", true],
        ["a", false],
    ])("Given %p and %p throws", (str, isFirst) => {
        expect(() => WsvStringUtil.validateWhitespaceString(str, isFirst)).toThrowError();
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
        WsvStringUtil.validateWhitespaceStrings(input);
    });
    test.each([
        [["", ""]],
        [[" ", "  a"]],
    ])("Given %p throws", (input) => {
        expect(() => WsvStringUtil.validateWhitespaceStrings(input)).toThrowError();
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
        WsvStringUtil.validateComment(input);
    });
    test.each([
        ["\n"],
        ["\uD834"],
        ["\uD834\uD834"],
        ["\uDD1E"],
        ["\uDD1E\uDD1E"],
    ])("Given %p throws", (input) => {
        expect(() => WsvStringUtil.validateComment(input)).toThrowError();
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
        let line = new WsvLine(values, whitespaces, comment);
        expect(line.values).toEqual(values);
        expect(line.whitespaces).toEqual(whitespaces);
        expect(line.comment).toEqual(comment);
        expect(line.toString()).toEqual(output);
        expect(line.toString(false)).toEqual(output2);
        line = new WsvLine([]);
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
        let line = new WsvLine(values);
        expect(line.values).toEqual(values);
        expect(line.whitespaces).toEqual(null);
        expect(line.comment).toEqual(null);
        expect(line.toString()).toEqual(output);
        line = new WsvLine([]);
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
        expect(() => new WsvLine(values, whitespaces, comment)).toThrow();
        const line = new WsvLine([]);
        expect(() => line.set(values, whitespaces, comment)).toThrow();
    });
});
describe("WsvLine.hasValues", () => {
    test.each([
        [[], false],
        [["a"], true],
    ])("Given %p returns %p", (input, output) => {
        expect(new WsvLine(input).hasValues).toEqual(output);
    });
});
describe("WsvLine.hasComment", () => {
    test.each([
        [null, false],
        ["", true],
        ["c", true],
    ])("Given %p returns %p", (input, output) => {
        expect(new WsvLine([], null, input).hasComment).toEqual(output);
    });
});
describe("WsvLine.whitespaces", () => {
    test("Change array", () => {
        const line = new WsvLine([]);
        const whitespaces = [" ", " "];
        line.whitespaces = whitespaces;
        whitespaces[0] = "a";
        expect(line.whitespaces).toEqual([" ", " "]);
    });
});
test("WsvLine.internal", () => {
    const line = WsvLine.internal([], ["a"], "\n");
    expect(line.whitespaces).toEqual(["a"]);
    expect(line.comment).toEqual("\n");
});
test("WsvLine.internalWhitespaces", () => {
    const line = new WsvLine([], []);
    const whitespaces = WsvLine.internalWhitespaces(line) ?? [];
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
        expect(WsvLine.parse(input).toString()).toEqual(output);
        expect(WsvLine.parse(input, false).toString()).toEqual(output2);
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
        expect(() => WsvLine.parse(input, true)).toThrowError();
        expect(() => WsvLine.parse(input, false)).toThrowError();
        expect(() => WsvLine.parseAsArray(input)).toThrowError();
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
        expect(WsvLine.parse(input).whitespaces).toEqual(output);
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
        expect(WsvLine.parseAsArray(input)).toEqual(output);
    });
});
describe("WsvLine.serialize", () => {
    test.each([
        [[], ""],
        [["a"], "a"],
        [["a", "b"], "a b"],
        [["a", "b", "c"], "a b c"],
    ])("Given %p returns %p", (input, output) => {
        expect(WsvLine.serialize(input)).toEqual(output);
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
        expect(WsvValue.isSpecial(input)).toEqual(output);
    });
    test.each([
        ["\uD834"],
        ["\uD834\uD834"],
        ["\uDD1E"],
        ["\uDD1E\uDD1E"],
    ])("Given %p throws", (input) => {
        expect(() => WsvValue.isSpecial(input)).toThrowError();
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
        expect(WsvValue.serialize(input)).toEqual(output);
    });
    test.each([
        ["\uD834"],
        ["\uD834\uD834"],
        ["\uDD1E"],
        ["\uDD1E\uDD1E"],
    ])("Given %p throws", (input) => {
        expect(() => WsvValue.serialize(input)).toThrowError();
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
        expect(WsvValue.parse(input)).toEqual(output);
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
        expect(WsvValue.parse(input, true)).toEqual(output);
        expect(WsvDocument.parse(input, true).lines[0].values[0]).toEqual(output);
        expect(WsvDocument.parse(input, false).lines[0].values[0]).toEqual(output);
        expect(WsvDocument.parseAsJaggedArray(input)[0][0]).toEqual(output);
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
        expect(() => WsvValue.parse(input)).toThrowError();
    });
});
// ----------------------------------------------------------------------
describe("WsvDocument.constructor", () => {
    test.each([
        [[], ""],
        [[new WsvLine(["a"])], "a"],
        [[new WsvLine(["a", "b"])], "a b"],
        [[new WsvLine(["a", "b"]), new WsvLine(["c"])], "a b\nc"],
    ])("Given %p returns %p", (input, output) => {
        const document = new WsvDocument(input);
        expect(document.toString()).toEqual(output);
        expect(document.lines).toEqual(input);
    });
    test.each([
        [ReliableTxtEncoding.Utf8],
        [ReliableTxtEncoding.Utf16],
        [ReliableTxtEncoding.Utf16Reverse],
        [ReliableTxtEncoding.Utf32],
    ])("Given %p", (input) => {
        const document = new WsvDocument([], input);
        expect(document.encoding).toEqual(input);
    });
    test("Empty", () => {
        const document = new WsvDocument();
        expect(document.lines).toEqual([]);
        expect(document.encoding).toEqual(ReliableTxtEncoding.Utf8);
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
        const document = new WsvDocument();
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
        const document = new WsvDocument();
        document.addLine(values);
        expect(document.lines[0].values).toEqual(values);
        expect(document.lines[0].whitespaces).toEqual(null);
        expect(document.lines[0].comment).toEqual(null);
    });
    test.each([
        [["a"], null],
        [[" "], "\n"],
    ])("Given %p and %p throws", (whitespaces, comment) => {
        const document = new WsvDocument();
        expect(() => document.addLine([], whitespaces, comment)).toThrowError();
    });
});
test("WsvDocument.toJaggedArray()", () => {
    const document = new WsvDocument();
    document.addLine(["a", "b"]);
    document.addLine([]);
    document.addLine(["c"]);
    document.addLine([null]);
    expect(document.toJaggedArray()).toEqual([["a", "b"], [], ["c"], [null]]);
});
describe("WsvDocument.toBytes", () => {
    test.each([
        [ReliableTxtEncoding.Utf8, [0xEF, 0xBB, 0xBF]],
        [ReliableTxtEncoding.Utf16, [0xFE, 0xFF]],
        [ReliableTxtEncoding.Utf16Reverse, [0xFF, 0xFE]],
        [ReliableTxtEncoding.Utf32, [0x0, 0x0, 0xFE, 0xFF]],
    ])("Given %p returns %p", (encoding, output) => {
        const document = new WsvDocument([], encoding);
        expect(document.toBytes()).toEqual(new Uint8Array(output));
    });
    test.each([
        [ReliableTxtEncoding.Utf8, [0xEF, 0xBB, 0xBF, 0x61, 0x0A, 0x62]],
        [ReliableTxtEncoding.Utf16, [0xFE, 0xFF, 0x0, 0x61, 0x0, 0x0A, 0x0, 0x62]],
        [ReliableTxtEncoding.Utf16Reverse, [0xFF, 0xFE, 0x61, 0x0, 0x0A, 0x0, 0x62, 0x0]],
        [ReliableTxtEncoding.Utf32, [0x0, 0x0, 0xFE, 0xFF, 0x0, 0x0, 0x0, 0x61, 0x0, 0x0, 0x0, 0x0A, 0x0, 0x0, 0x0, 0x62]],
    ])("Given %p returns %p", (encoding, output) => {
        const document = new WsvDocument([new WsvLine(["a"]), new WsvLine(["b"])], encoding);
        expect(document.toBytes()).toEqual(new Uint8Array(output));
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
        const document = WsvDocument.parse(input, preserve);
        expect(document.toString(true)).toEqual(output1);
        expect(document.toString(false)).toEqual(output2);
    });
    test("Without preserving argument", () => {
        const document = WsvDocument.parse(" a   b #c\n  d");
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
        const jaggedArray = WsvDocument.parseAsJaggedArray(input);
        const document = WsvDocument.fromJaggedArray(jaggedArray);
        expect(document.toString()).toEqual(output);
        expect(WsvSerializer.serializeJaggedArray(jaggedArray)).toEqual(output);
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
        expect(() => WsvDocument.parseAsJaggedArray(input)).toThrowError();
    });
});
describe("WsvDocument.fromBytes", () => {
    test.each([
        [ReliableTxtEncoding.Utf8],
        [ReliableTxtEncoding.Utf16],
        [ReliableTxtEncoding.Utf16Reverse],
        [ReliableTxtEncoding.Utf32],
    ])("Given %p", (encoding) => {
        const document = WsvDocument.parse("a b\nc");
        document.encoding = encoding;
        const document2 = WsvDocument.fromBytes(document.toBytes());
        expect(document2.toString()).toEqual(document.toString());
        expect(document2.encoding).toEqual(document.encoding);
    });
    test("Throws", () => {
        expect(() => WsvDocument.fromBytes(new Uint8Array([]))).toThrowError(NoReliableTxtPreambleError);
    });
});
test("WsvDocument.fromLines", () => {
    const document = WsvDocument.fromLines(["a b", "c d #comment"]);
    expect(document.toString()).toEqual("a b\nc d #comment");
});
describe("WsvDocument.toBase64String", () => {
    test.each([
        ["", ReliableTxtEncoding.Utf8, "Base64|77u/|"],
        ["a b #c\n d", ReliableTxtEncoding.Utf8, "Base64|77u/YSBiICNjCiBk|"],
        ["a b #c\n d", ReliableTxtEncoding.Utf16, "Base64|/v8AYQAgAGIAIAAjAGMACgAgAGQ|"],
    ])("Given %j and %p returns %p", (input1, input2, output) => {
        const document = WsvDocument.parse(input1, true, input2);
        expect(document.toBase64String()).toEqual(output);
    });
});
describe("WsvDocument.fromBase64String", () => {
    test.each([
        ["Base64|77u/|", "", ReliableTxtEncoding.Utf8],
        ["Base64|77u/YSBiICNjCiBk|", "a b #c\n d", ReliableTxtEncoding.Utf8],
        ["Base64|/v8AYQAgAGIAIAAjAGMACgAgAGQ|", "a b #c\n d", ReliableTxtEncoding.Utf16],
    ])("Given %p returns %j and %p", (input, output1, output2) => {
        const fromDocument = WsvDocument.fromBase64String(input);
        expect(fromDocument.toString()).toEqual(output1);
        expect(fromDocument.encoding).toEqual(output2);
    });
    test.each([
        ["Base64||"],
        ["Base64|TWFu|"],
        ["BASE64|77u/TWFu|"],
        ["77u/TWFu"],
    ])("Given %p throws", (input) => {
        expect(() => WsvDocument.fromBase64String(input)).toThrow();
    });
});
test("WsvDocument.toBinaryWsv + fromBinaryWsv", () => {
    const text = getTestTable();
    const document = WsvDocument.parse(text, false);
    const bytes = document.toBinaryWsv();
    expect(bytes.subarray(0, 3)).toEqual(BinaryWsvUtil.getPreambleVersion1());
    const decodedDocument = WsvDocument.fromBinaryWsv(bytes);
    expect(document.toString()).toEqual(decodedDocument.toString());
});
// ----------------------------------------------------------------------
test("WsvSerializer.serializeLines", () => {
    expect(WsvSerializer.serializeLines([new WsvLine(["a", "b"]), new WsvLine([]), new WsvLine(["c"])])).toEqual("a b\n\nc");
});
// ----------------------------------------------------------------------
test("BinaryWsvEncodingUtil.getPreamble", () => {
    expect(BinaryWsvUtil.getPreambleVersion1()).toEqual(new Uint8Array([0x42, 0x57, 0x31]));
});
// ----------------------------------------------------------------------
const lineBreakByte = 0b11111111;
const valueSeparatorByte = 0b11111110;
const nullValueByte = 0b11111101;
const emptyStringByte = 0b11111100;
const aByte = 0x61;
// ----------------------------------------------------------------------
describe("BinaryWsvEncoder.encodeJaggedArray", () => {
    test.each([
        [[], []],
        [[[]], []],
        [[[], []], [lineBreakByte]],
        [[[], [], []], [lineBreakByte, lineBreakByte]],
        [[[null]], [nullValueByte]],
        [[[null], [null]], [nullValueByte, lineBreakByte, nullValueByte]],
        [[[null], [null], [null]], [nullValueByte, lineBreakByte, nullValueByte, lineBreakByte, nullValueByte]],
        [[[], [null]], [lineBreakByte, nullValueByte]],
        [[[], [null], [null]], [lineBreakByte, nullValueByte, lineBreakByte, nullValueByte]],
        [[[], [], [null]], [lineBreakByte, lineBreakByte, nullValueByte]],
        [[[null], [], [null]], [nullValueByte, lineBreakByte, lineBreakByte, nullValueByte]],
        [[[""]], [emptyStringByte]],
        [[["a"]], [0x61]],
        [[["a"], ["b"]], [0x61, lineBreakByte, 0x62]],
    ])("Given %j returns %p", (input, output) => {
        const bytes = BinaryWsvEncoder.encodeJaggedArray(input);
        expect(bytes).toEqual(new Uint8Array([0x42, 0x57, 0x31, ...output]));
    });
    test.each([
        [[["\uDEAD"]]],
    ])("Given %p throws", (input) => {
        expect(() => BinaryWsvEncoder.encodeJaggedArray(input)).toThrow();
    });
});
test("BinaryWsvEncoder.encodeJaggedArray without preamble", () => {
    let bytes = BinaryWsvEncoder.encodeJaggedArray([[null]], false);
    expect(bytes).toEqual(new Uint8Array([nullValueByte]));
    bytes = BinaryWsvEncoder.encodeJaggedArray([], false);
    expect(bytes).toEqual(new Uint8Array());
});
test("BinaryWsvEncoder.encode without preamble", () => {
    let bytes = BinaryWsvEncoder.encode(WsvDocument.fromJaggedArray([[null]]), false);
    expect(bytes).toEqual(new Uint8Array([nullValueByte]));
    bytes = BinaryWsvEncoder.encode(new WsvDocument(), false);
    expect(bytes).toEqual(new Uint8Array());
});
test("BinaryWsvEncoder.encodeValues", () => {
    const bytes = BinaryWsvEncoder.encodeValues([null, "a"]);
    expect(bytes).toEqual(new Uint8Array([nullValueByte, valueSeparatorByte, 0x61]));
});
test("BinaryWsvEncoder.encodeValues with long values", () => {
    const longValue = "b".repeat(10000);
    const values = ["a", longValue];
    const bytes = BinaryWsvEncoder.encodeValues(values);
    const decodedValues = BinaryWsvDecoder.decodeAsJaggedArray(bytes, false);
    expect(decodedValues[0]).toEqual(values);
});
test("BinaryWsvEncoder.internalEncodeValues", () => {
    const builder = new Uint8ArrayBuilder();
    BinaryWsvEncoder.internalEncodeValues([null, "a"], builder);
    let bytes = builder.toArray();
    expect(bytes).toEqual(new Uint8Array([nullValueByte, valueSeparatorByte, 0x61]));
    builder.reset();
    BinaryWsvEncoder.internalEncodeValues([null, "b"], builder);
    bytes = builder.toArray();
    expect(bytes).toEqual(new Uint8Array([nullValueByte, valueSeparatorByte, 0x62]));
});
// ----------------------------------------------------------------------
describe("BinaryWsvDecoder.getVersion", () => {
    test.each([
        [[0x42, 0x57, 0x31], "1"],
        [[0x42, 0x57, 0x32, 0x30], "2"],
        [[0x42, 0x57, 0x31, 0x00], "1"],
    ])("Given %p returns %p", (input, output) => {
        const version = BinaryWsvDecoder.getVersion(new Uint8Array(input));
        expect(version).toEqual(output);
    });
    test.each([
        [[0x43, 0x57, 0x31]],
        [[0x42, 0x58, 0x31]],
        [[0x42, 0x57]],
        [[0x42]],
        [[]],
    ])("Given %p throws", (input) => {
        expect(() => BinaryWsvDecoder.getVersion(new Uint8Array(input))).toThrow();
    });
});
describe("BinaryWsvDecoder.getVersionOrNull", () => {
    test.each([
        [[0x42, 0x57, 0x31], "1"],
        [[0x42, 0x57, 0x32], "2"],
        [[0x42, 0x57, 0x31, 0x00], "1"],
        [[0x43, 0x57, 0x31], null],
        [[0x42, 0x58, 0x31], null],
        [[0x42, 0x57], null],
        [[0x42], null],
        [[], null],
    ])("Given %p returns %p", (input, output) => {
        const version = BinaryWsvDecoder.getVersionOrNull(new Uint8Array(input));
        expect(version).toEqual(output);
    });
});
describe("BinaryWsvDecoder.decodeAsJaggedArray", () => {
    test.each([
        [[], [[]]],
        [[lineBreakByte], [[], []]],
        [[lineBreakByte, lineBreakByte], [[], [], []]],
        [[nullValueByte], [[null]]],
        [[nullValueByte, lineBreakByte], [[null], []]],
        [[nullValueByte, lineBreakByte, lineBreakByte], [[null], [], []]],
        [[lineBreakByte, nullValueByte], [[], [null]]],
        [[lineBreakByte, nullValueByte, lineBreakByte], [[], [null], []]],
        [[lineBreakByte, lineBreakByte, nullValueByte], [[], [], [null]]],
        [[lineBreakByte, nullValueByte, valueSeparatorByte, nullValueByte], [[], [null, null]]],
        [[emptyStringByte], [[""]]],
        [[emptyStringByte, lineBreakByte], [[""], []]],
        [[emptyStringByte, lineBreakByte, lineBreakByte], [[""], [], []]],
        [[lineBreakByte, emptyStringByte], [[], [""]]],
        [[lineBreakByte, emptyStringByte, lineBreakByte], [[], [""], []]],
        [[lineBreakByte, lineBreakByte, emptyStringByte], [[], [], [""]]],
        [[lineBreakByte, emptyStringByte, valueSeparatorByte, emptyStringByte], [[], ["", ""]]],
        [[aByte], [["a"]]],
        [[aByte, lineBreakByte], [["a"], []]],
        [[aByte, lineBreakByte, lineBreakByte], [["a"], [], []]],
        [[lineBreakByte, aByte], [[], ["a"]]],
        [[lineBreakByte, aByte, lineBreakByte], [[], ["a"], []]],
        [[lineBreakByte, lineBreakByte, aByte], [[], [], ["a"]]],
        [[lineBreakByte, aByte, valueSeparatorByte, aByte], [[], ["a", "a"]]],
        [[0x61, valueSeparatorByte, 0x62, lineBreakByte, 0x63], [["a", "b"], ["c"]]],
        [[0xEF, 0xBB, 0xBF, 0x61], [["\uFEFFa"]]],
    ])("Given %p returns %p", (input, output) => {
        const jaggedArray = BinaryWsvDecoder.decodeAsJaggedArray(new Uint8Array([0x42, 0x57, 0x31, ...input]));
        expect(jaggedArray).toEqual(output);
    });
    test.each([
        [[0x42, 0x57, 0x32]],
        [[]],
        [[0x42, 0x57, 0x31, emptyStringByte, emptyStringByte]],
    ])("Given %p throws", (input) => {
        expect(() => BinaryWsvDecoder.decodeAsJaggedArray(new Uint8Array(input))).toThrow();
    });
});
test("BinaryWsvDecoder.decodeAsJaggedArray without preamble", () => {
    const jaggedArray = BinaryWsvDecoder.decodeAsJaggedArray(new Uint8Array([nullValueByte]), false);
    expect(jaggedArray).toEqual([[null]]);
});
describe("BinaryWsvDecoder.decode", () => {
    test.each([
        [[], [[]]],
        [[lineBreakByte], [[], []]],
        [[lineBreakByte, lineBreakByte], [[], [], []]],
        [[nullValueByte], [[null]]],
        [[nullValueByte, lineBreakByte], [[null], []]],
        [[lineBreakByte, nullValueByte], [[], [null]]],
        [[nullValueByte, lineBreakByte, lineBreakByte], [[null], [], []]],
        [[lineBreakByte, nullValueByte, lineBreakByte], [[], [null], []]],
        [[lineBreakByte, lineBreakByte, nullValueByte], [[], [], [null]]],
        [[lineBreakByte, nullValueByte, valueSeparatorByte, nullValueByte], [[], [null, null]]],
        [[emptyStringByte], [[""]]],
        [[emptyStringByte, lineBreakByte], [[""], []]],
        [[lineBreakByte, emptyStringByte], [[], [""]]],
        [[emptyStringByte, lineBreakByte, lineBreakByte], [[""], [], []]],
        [[lineBreakByte, emptyStringByte, lineBreakByte], [[], [""], []]],
        [[lineBreakByte, lineBreakByte, emptyStringByte], [[], [], [""]]],
        [[lineBreakByte, emptyStringByte, valueSeparatorByte, emptyStringByte], [[], ["", ""]]],
        [[aByte], [["a"]]],
        [[aByte, lineBreakByte], [["a"], []]],
        [[lineBreakByte, aByte], [[], ["a"]]],
        [[aByte, lineBreakByte, lineBreakByte], [["a"], [], []]],
        [[lineBreakByte, aByte, lineBreakByte], [[], ["a"], []]],
        [[lineBreakByte, lineBreakByte, aByte], [[], [], ["a"]]],
        [[lineBreakByte, aByte, valueSeparatorByte, aByte], [[], ["a", "a"]]],
        [[0x61, valueSeparatorByte, 0x62, lineBreakByte, 0x63], [["a", "b"], ["c"]]],
        [[0xEF, 0xBB, 0xBF, 0x61], [["\uFEFFa"]]],
    ])("Given %p returns %p", (input, output) => {
        const document = BinaryWsvDecoder.decode(new Uint8Array([0x42, 0x57, 0x31, ...input]));
        expect(document.toJaggedArray()).toEqual(output);
    });
    test.each([
        [[0x42, 0x57, 0x32]],
        [[]],
        [[0x42, 0x57, 0x31, emptyStringByte, emptyStringByte]],
        [[0x42, 0x57, 0x31, emptyStringByte, valueSeparatorByte, valueSeparatorByte]],
    ])("Given %p throws", (input) => {
        expect(() => BinaryWsvDecoder.decode(new Uint8Array(input))).toThrow();
    });
});
test("BinaryWsvDecoder.decode without preamble", () => {
    const document = BinaryWsvDecoder.decode(new Uint8Array([nullValueByte]), false);
    expect(document.toJaggedArray()).toEqual([[null]]);
});
test("BinaryWsvDecoder.internalDecodeLine", () => {
    const reader = new Uint8ArrayReader(new Uint8Array(), 0);
    reader.reset(new Uint8Array([nullValueByte]), 0);
    const lineValues = BinaryWsvDecoder.internalDecodeLineValues(reader);
    expect(lineValues).toEqual([null]);
});
test("BinaryWsvDecoder.internalDecodeLine throws", () => {
    const reader = new Uint8ArrayReader(new Uint8Array([lineBreakByte]), 0);
    expect(() => BinaryWsvDecoder.internalDecodeLineValues(reader)).toThrowError();
});
// ----------------------------------------------------------------------
function splitBytes(bytes, splitByte, removeEmpty) {
    const result = [];
    let lastIndex = -1;
    for (;;) {
        const currentIndex = bytes.indexOf(splitByte, lastIndex + 1);
        if (currentIndex < 0) {
            const part = bytes.subarray(lastIndex + 1);
            if (!(part.length === 0 && removeEmpty === true)) {
                result.push(part);
            }
            break;
        }
        else {
            const part = bytes.subarray(lastIndex + 1, currentIndex);
            lastIndex = currentIndex;
            if (!(part.length === 0 && removeEmpty === true)) {
                result.push(part);
            }
        }
    }
    return result;
}
function decodeValue(bytes) {
    if (bytes.length === 0) {
        throw new Error(`Invalid WSV value byte sequence`);
    }
    if (bytes.length === 1) {
        const firstByte = bytes[0];
        if (firstByte === BinaryWsvUtil.nullValueByte) {
            return null;
        }
        else if (firstByte === BinaryWsvUtil.emptyStringByte) {
            return "";
        }
    }
    const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
    return decoder.decode(bytes);
}
describe("BinaryWsvEncoder.encode + BinaryWsvDecoder.decode + ...", () => {
    test.each([
        [``],
        [`a`],
        [`a b`],
        [`a b\nc`],
        [`a b\nc d`],
        [`\n`],
        [`\n\n`],
        [`\na`],
        [`\na\n`],
        [`""`],
        [`"" ""`],
        [`"" "a"`],
        [`"" ""\n"" ""`],
        [`"" - "" -`],
        [`"\uFEFF"`],
        [`"\uFEFF\uFEFF"`],
        [`"\uFEFFa\uFEFF"`],
        [`"Line1"/"Line2" "Hello ""world"""`],
        [`"-" - "" "#Comment" #Comment`],
        [`a ~ ¥ » ½ ¿ ß ä ï œ € 東 𝄞 𠀇`],
    ])("Given %p", (input) => {
        const document = WsvDocument.parse(input, false);
        const bytes = BinaryWsvEncoder.encode(document);
        const decodedDocument = BinaryWsvDecoder.decode(bytes);
        expect(document.toString()).toEqual(decodedDocument.toString());
        const jaggedArray = BinaryWsvDecoder.decodeAsJaggedArray(bytes);
        expect(jaggedArray).toEqual(document.toJaggedArray());
        const bytesOfLines = splitBytes(bytes.subarray(3), lineBreakByte, false);
        expect(bytesOfLines.length).toEqual(jaggedArray.length);
        const jaggedArrayBySplit = bytesOfLines.map((lineBytes) => splitBytes(lineBytes, valueSeparatorByte, true).map((valueBytes) => decodeValue(valueBytes)));
        expect(jaggedArrayBySplit).toEqual(document.toJaggedArray());
    });
    test("Test Table", () => {
        const testTable = getTestTable();
        const document = WsvDocument.parse(testTable, false);
        const bytes = BinaryWsvEncoder.encode(document);
        const decodedDocument = BinaryWsvDecoder.decode(bytes);
        expect(document.toString()).toEqual(decodedDocument.toString());
    });
});
//# sourceMappingURL=wsv.test.js.map