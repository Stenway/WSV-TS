import { ReliableTxtEncoding } from "@stenway/reliabletxt";
export declare class WsvParserError extends Error {
    readonly index: number;
    readonly lineIndex: number;
    readonly linePosition: number;
    constructor(index: number, lineIndex: number, linePosition: number, message: string);
}
export declare abstract class WsvStringUtil {
    static validateWhitespaceStrings(values: (string | null)[] | null): void;
    static validateWhitespaceString(str: string, isFirst: boolean): void;
    static validateComment(value: string | null): void;
}
export declare class WsvLine {
    values: (string | null)[];
    private _whitespaces;
    private _comment;
    get hasValues(): boolean;
    get whitespaces(): (string | null)[] | null;
    set whitespaces(values: (string | null)[] | null);
    get comment(): string | null;
    set comment(value: string | null);
    get hasComment(): boolean;
    constructor(values: (string | null)[], whitespaces?: (string | null)[] | null, comment?: string | null);
    set(values: (string | null)[], whitespaces?: (string | null)[] | null, comment?: string | null): void;
    toString(preserveWhitespaceAndComment?: boolean): string;
    serialize(): string;
    static internal(values: (string | null)[], whitespaces?: (string | null)[] | null, comment?: string | null): WsvLine;
    static internalWhitespaces(line: WsvLine): (string | null)[] | null;
    static parse(str: string, preserveWhitespacesAndComments?: boolean): WsvLine;
    static parseAsArray(str: string): (string | null)[];
    static serialize(values: (string | null)[]): string;
}
export declare class WsvDocument {
    lines: WsvLine[];
    encoding: ReliableTxtEncoding;
    constructor(lines?: WsvLine[], encoding?: ReliableTxtEncoding);
    addLine(values: (string | null)[], whitespaces?: string[] | null, comment?: string | null): void;
    toJaggedArray(): (string | null)[][];
    toString(preserveWhitespaceAndComment?: boolean): string;
    getBytes(preserveWhitespacesAndComments?: boolean): Uint8Array;
    static parse(str: string, preserveWhitespacesAndComments?: boolean): WsvDocument;
    static parseAsJaggedArray(str: string): (string | null)[][];
}
export declare abstract class WsvSerializer {
    private static readonly stringNotClosed;
    private static containsSpecialChar;
    static serializeValue(value: string | null): string;
    static serializeValues(values: (string | null)[]): string;
    static serializeJaggedArray(jaggedArray: (string | null)[][]): string;
    static serializeValuesWhitespacesAndComment(values: (string | null)[], whitespaces?: (string | null)[] | null, comment?: string | null): string;
    static serializeLines(lines: WsvLine[], preserveWhitespaceAndComment?: boolean): string;
}
export declare abstract class WsvParser {
    private static readonly stringNotClosed;
    private static readonly invalidStringLineBreak;
    private static readonly invalidCharacterAfterString;
    private static readonly invalidDoubleQuoteInValue;
    static parseLine(str: string, preserveWhitespacesAndComments: boolean, lineIndexOffset?: number): WsvLine;
    static parseLines(str: string, preserveWhitespacesAndComments: boolean, lineIndexOffset?: number): WsvLine[];
    private static getError;
    private static parseLinesPreserving;
    private static parseLinesNonPreserving;
    static parseAsJaggedArray(str: string, lineIndexOffset?: number): (string | null)[][];
}
