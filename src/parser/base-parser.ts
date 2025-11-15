import { Parser, ParserError, ParserSuccess } from "./parser";

export function beginWithRegex(regex: RegExp): Parser<string>;
export function beginWithRegex(
  regex: RegExp,
  expectation: string
): Parser<string>;
export function beginWithRegex(
  regex: RegExp,
  expectation: string | null = null
): Parser<string> {
  return new Parser((s: string) => {
    const match = s.match(regex);

    if (match) {
      const matchedStr = match[0];
      const rest = s.slice(matchedStr.length);
      return new ParserSuccess(matchedStr, rest, matchedStr.length);
    }

    const message = expectation
      ? `Expected ${expectation}`
      : "Unexpected input";
    return new ParserError(message, 0);
  });
}

export const integer = beginWithRegex(/^[-+]?\d+/).fmap((x) => parseInt(x, 10));

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
    return new ParserError("Expected newline", 0);
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
    if (s.length === 0) {
      return new ParserError("Unexpected EOF", s.length);
    }
    
    const idx = s.indexOf(c);
    if (idx === -1) {
      return new ParserSuccess(s, "", s.length);
    }

    return new ParserSuccess(s.substring(0, idx), s.substring(idx), idx);
  });

export const stringUntil = (p: Parser<any>) =>
  new Parser((s: string) => {
    if (s.length === 0) {
      return new ParserError("Unexpected EOF", 0);
    }
    
    const results = [];
    let rest = s;
    for (let i = 0; i < s.length; i++) {
      const curr = s[i];
      const tryPResult = p.run(rest);
      if (!tryPResult.error) {
        break;
      }
      results.push(curr);
      rest = rest.substring(1);
    }

    const result = results.join("");
    
    if (result.length === 0){
      return new ParserError("Invalid string", 0);
    }

    return new ParserSuccess(result, rest, result.length);
  });

export function stringOfChars(cs: string) {
  return new Parser((s: string) => {
    if (s.length === 0){
      return new ParserError("Unexpected EOF", 0);
    }
    
    const results = [];

    for (const c of s) {
      if (cs.includes(c)) {
        results.push(c);
      } else {
        break;
      }
    }

    const result = results.join("");

    if (result.length === 0){
      return new ParserError(`Expected one of chars from "${cs}"`, 0);
    }

    return new ParserSuccess(
      result,
      s.substring(results.length),
      results.length
    );
  });
}

export const inlineSpaces = stringOfChars(" \t").overrideError("Expected spaces");

export const tok = <A>(p: Parser<A>) =>
  inlineSpaces.optional().keepRight(p).keepLeft(inlineSpaces.optional());

export const eof = new Parser((s: string) => {
  if (s.length === 0) return new ParserSuccess(null, "", 0);
  else return new ParserError("Expected EOF", s.length);
});

export const eol = new Parser((s: string) => {
  if (s.length === 0) return new ParserSuccess(null, "", 0);
  if (s[0] === '\n') return new ParserSuccess(null, "", 0);
  else return new ParserError("Expected end of line", s.length);
});


export const linesParser = stringUntilChar("\n").matchSome(
  0,
  Infinity,
  isString("\n")
);
