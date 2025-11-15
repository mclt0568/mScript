import { Parser } from "@/parser/parser";
import { ADT } from "../adt";
import { inlineSpaces, newLine, stringUntil } from "@/parser/base-parser";

export class IncludeStatement extends ADT {
  constructor(
    public filename: string
  ) {
    super();
  }
}

const filename = stringUntil(Parser.anyOf([newLine, inlineSpaces])).fmap(f => new IncludeStatement(f));


export const includeLine: [string, Parser<ADT>] = [
  "include",
  filename,
];