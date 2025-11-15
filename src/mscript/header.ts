import { Parser } from "@/parser/parser";
import { eof, inlineSpaces, isString, newLine } from "../parser/base-parser";
import { ADT } from "./adt";
import { definePrintLine } from "./headers/definePrint";
import { defineMacroLine } from "./headers/define";
import { includeLine } from "./headers/include";
import { identifier } from "./common";

const headerPrefix = "#";

const headerLinesDefinition: [string, Parser<ADT>][] = [
  definePrintLine,
  defineMacroLine,
  includeLine,
];

export const headerLine = headerLinesDefinition.reduce(
  (prev: Parser<string | ADT>, [name, parser]) =>
    prev.bind((parsedName: string | ADT) => {
      if (parsedName === name) {
        return parser
          .overrideError(msg => `Invalid ${headerPrefix}${name} directive syntax: ${msg}`);
      }

      return Parser.pure(parsedName);
    }).bindTap(console.log),
  inlineSpaces
    .optional()
    .keepRight(isString(headerPrefix))
    .keepRight(identifier)
    .keepLeft(inlineSpaces)
);

// const headerLine = inlineSpaces
//   .optional()
//   .keepRight(isString(headerPrefix))
//   .keepRight(
//     Parser.anyOf(
//       headerLinesDefinition.map(([name, body]) =>
//         isString(name).keepRight(inlineSpaces).keepRight(body)
//       )
//     )
//   );

export const headerLines = newLine
  .matchSome()
  .keepRight(headerLine)
  .matchSome(0, Infinity, newLine);
