/* eslint-disable no-console */
import { BinaryWsvDecoder, BinaryWsvEncoder, WsvDocument } from "../src/wsv.js";
const lineBreakByte = 0b11111111;
const valueSeparatorByte = 0b11111110;
const nullValueByte = 0b11111101;
const emptyStringByte = 0b11111100;
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
        if (firstByte === nullValueByte) {
            return null;
        }
        else if (firstByte === emptyStringByte) {
            return "";
        }
    }
    const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
    return decoder.decode(bytes);
}
function decodeBinaryWsvDocument(bytes) {
    return splitBytes(bytes.subarray(3), lineBreakByte, false)
        .map((lineBytes) => splitBytes(lineBytes, valueSeparatorByte, true)
        .map((valueBytes) => decodeValue(valueBytes)));
}
const input = `a b`;
const document = WsvDocument.parse(input, false);
const bytes = BinaryWsvEncoder.encode(document);
const jaggedArray = BinaryWsvDecoder.decodeAsJaggedArray(bytes);
const jaggedArrayBySplit = decodeBinaryWsvDocument(bytes);
console.log(JSON.stringify(jaggedArray));
console.log(JSON.stringify(jaggedArrayBySplit));
console.log("Dev");
//# sourceMappingURL=dev.js.map