import { Parser } from "@/parser/parser";
import { ADT } from "../adt";
import { identifier } from "../common";
import {
  eol,
  inlineSpaces,
  isString,
  stringOfChars,
  stringUntil,
  tok,
} from "@/parser/base-parser";

export class DefineMacroStatement extends ADT {
  constructor(
    public ident: string,
    public args: string[],
    public body: (string | DefineMacroBodyArgument)[]
  ) {
    super();
  }
}

export class DefineMacroBodyArgument extends ADT {
  constructor(public ident: string) {
    super();
  }
}

const defineMacroParameters = Parser.anyOf([
  isString("(")
    .keepRight(tok(identifier).matchSome(0, Infinity, isString(",")))
    .keepLeft(isString(")").keepLeft(inlineSpaces)),
  Parser.pure([]),
]).overrideError((x) => `Malformed macro parameter definition: ${x}`);

export const defineMacroBody = Parser.anyOf<string | DefineMacroBodyArgument>([
  stringUntil(stringOfChars("\\{}\n")),
  isString("\\\\").to("\\"),
  isString("\\{").to("{"),
  isString("\\}").to("}"),
  isString("{")
    .keepRight(tok(identifier))
    .keepLeft(isString("}"))
    .fmap((ident) => new DefineMacroBodyArgument(ident)),
])
  .matchSome(1)
  .keepLeft(eol)
  .overrideError(`Malformed macro body definition`);

const defineMacro = Parser.do(
  (_) => ["ident", identifier.overrideError("Malformed macro name")],
  (_) => ["params", defineMacroParameters],
  (_) => ["body", defineMacroBody],
  ({ ident, params, body }) =>
    Parser.pure(new DefineMacroStatement(ident, params, body))
);

export const defineMacroLine: [string, Parser<DefineMacroStatement>] = [
  "define",
  defineMacro,
];
