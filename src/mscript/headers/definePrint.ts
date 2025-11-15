import { inlineSpaces } from "@/parser/base-parser";
import { ADT } from "../adt";
import { identifier } from "../common";
import { Parser } from "@/parser/parser";

export class DefinePrintStatement extends ADT {
  constructor(public ident: string, public target: string) {
    super();
  }
}

export const definePrint = identifier
  .matchSome(2, 2, inlineSpaces)
  .fmap(([pName, pTarget]) => new DefinePrintStatement(pName, pTarget));

export const definePrintLine: [string, Parser<DefinePrintStatement>] = ["define_print", definePrint];