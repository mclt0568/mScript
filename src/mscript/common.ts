import {
  beginWithRegex,
  isString,
  stringUntil,
} from "@/parser/base-parser";
import { Parser } from "@/parser/parser";

export const stringLiteral = isString('"')
  .keepRight(stringUntil(Parser.anyOf([isString('"'), isString("\n")])))
  .keepLeft(isString('"'));

export const booleanLiteral = Parser.anyOf([
  isString("true").to(true),
  isString("false").to(false),
]);

export const numberLiteral = Parser.do(
  (_) => ["s", isString("-").optional().fmap((v: any) => (v === null ? 1 : -1))],
  (_) => ["n", beginWithRegex(/^[+-]?([0-9]*[.])?[0-9]+/)],
  Parser.doTap(console.log),
  ({ s, n }: {s: number, n: number}) => Parser.pure(s * Number(n))
)

export const identifier = beginWithRegex(
  /^[a-zA-Z_][a-zA-Z0-9_]*/,
  "identifier"
);
