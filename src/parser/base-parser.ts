import { Parser, ParserError, ParserSuccess } from "./parser";

export const integer: Parser<number> = new Parser((s: string) => {
  const match = s.match(/^[-+]?\d+/);

  if (match) {
    const numStr = match[0];
    const rest = s.slice(numStr.length);
    return new ParserSuccess(parseInt(numStr, 10), rest, numStr.length);
  }
  return new ParserError("Expected integer", 0);
});

export const char: Parser<string> = new Parser((s: string) => {
  if (s.length === 0) {
    return new ParserError("Unexpected EOF", 0);
  }
  return new ParserSuccess(s[0], s.substring(1), 1);
});

export const newLine: Parser<null> = new Parser((s: string) => {
  const result = char.run(s);
  if (result.error) {
    return result as ParserError;
  } else if ((result as ParserSuccess<string>).result !== "\n") {
    return new ParserError("Unexpected EOF", 0);
  }

  return new ParserSuccess(null, (result as ParserSuccess<string>).rest, 1);
});

export const isString = (str: string) =>
  new Parser((s: string) => {
    if (s.length < str.length) {
      return new ParserError("Unexpected EOF", s.length);
    }

    if (s.startsWith(str)) {
      return new ParserSuccess(str, s.substring(str.length), str.length);
    }
    return new ParserError(`Expected ${str}`, 0);
  });

export const stringUntilChar = (c: string) =>
  new Parser((s: string) => {
    const idx = s.indexOf(c);
    if (idx === -1) {
      return new ParserSuccess(s, "", s.length);
    }

    return new ParserSuccess(s.substring(0, idx), s.substring(idx), idx);
  });

export const stringOfChars = (cs: string) =>
  new Parser((s: string) => {
    const result = [];

    for (const c of s) {
      if (cs.includes(c)) {
        result.push(c);
      } else {
        break;
      }
    }

    return new ParserSuccess(
      result.join(""),
      s.substring(result.length),
      result.length
    );
  });

export const inlineSpaces = stringOfChars(" \t");

export const tok = <A>(p: Parser<A>) =>
  inlineSpaces.keepRight(p.keepLeft(inlineSpaces));

// tok p = inlineSpaces *> p <* inlineSpaces