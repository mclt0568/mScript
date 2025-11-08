import { ParserBuildingError } from "./parser-building-error";

export abstract class ParserResult {
  error: boolean;
  col: number;

  constructor(error: boolean, col: number) {
    this.error = error;
    this.col = col;
  }
}

export class ParserSuccess<A> extends ParserResult {
  result: A;
  rest: string;

  constructor(result: A, rest: string, col: number) {
    super(false, col);
    this.result = result;
    this.rest = rest;
  }
}

export class ParserError extends ParserResult {
  message: string;

  constructor(message: string, col: number) {
    super(true, col);
    this.message = message;
  }
}

export class Parser<A> {
  p: (s: string) => ParserSuccess<A> | ParserError;

  constructor(p: (s: string) => ParserSuccess<A> | ParserError) {
    this.p = p;
  }

  static fromParser<A>(parser: Parser<A>): Parser<A>;
  static fromParser<A>(
    parser: Parser<any>,
    p: (s: string) => ParserSuccess<A> | ParserError
  ): Parser<A>;
  static fromParser<A>(
    parser: Parser<any>,
    p: null | ((s: string) => ParserSuccess<A> | ParserError) = null
  ) {
    const newParser = new Parser(p ?? parser.p);
    return newParser;
  }

  static pure<A>(value: A) {
    return new Parser((s: string) => new ParserSuccess(value, s, 0));
  }

  static fail(message: string) {
    return new Parser((_) => new ParserError(message, 0));
  }

  static test(v: any, errMsg: string) {
    return new Parser((s: string) => {
      if (v) return new ParserSuccess(null, s, 0);
      else return new ParserError(errMsg, 0);
    });
  }

  static tap<A>(f: (v: A) => void, v: A) {
    return new Parser((s: string) => {
      f(v);
      return new ParserSuccess(null, s, 0);
    });
  }

  static never = Parser.pure(null);

  static anyOf<A>(parsers: Parser<A>[] | (() => Parser<A>[])): Parser<A>;
  static anyOf<A>(parsers: Parser<A>[] | (() => Parser<A>[]), expectation: string): Parser<A>;
  static anyOf<A>(parsers: Parser<A>[] | (() => Parser<A>[]), expectation: string | null = null) {
    return new Parser((s: string) => {
      const _parsers = (typeof parsers === "function") ? parsers() : parsers;

      for (let i = 0; i < _parsers.length; i++) {
        const p = _parsers[i];
        const r = p.run(s);
        if (r.error && i !== _parsers.length - 1) {
          continue;
        }

        if (r.error){
          return new ParserError(`Expected ${expectation}`, r.col)
        }

        return r;
      }

      throw new ParserBuildingError("No parsers provided");
    });
  }

  run(s: string): ParserSuccess<A> | ParserError {
    const result = this.p(s);
    return result;
  }

  fmap<B>(f: (v: A) => B) {
    return Parser.fromParser(this, (s: string) => {
      const r = this.run(s);
      if (r.error) return r as ParserError;
      const { result, rest, col } = r as ParserSuccess<A>;
      return new ParserSuccess(f(result), rest, col);
    });
  }

  apply<B>(pf: Parser<(v: A) => B>) {
    return Parser.fromParser(this, (s: string) => {
      const pfResult = pf.run(s);
      if (pfResult.error) return pfResult as ParserError;
      const {
        result: f,
        rest,
        col
      } = pfResult as ParserSuccess<(v: A) => B>;

      const r = this.run(rest);
      r.col += col;
      if (r.error) return r as ParserError;
      const { result, rest: rRest } = r as ParserSuccess<A>;
      return new ParserSuccess(f(result), rRest, r.col);
    });
  }

  keepLeft(right: Parser<any>) {
    return right.apply(this.fmap((x) => (_) => x));
  }

  keepRight<B>(right: Parser<B>) {
    return right.apply(this.fmap((_) => (y: B) => y));
  }

  to<B>(v: B) {
    return Parser.fromParser(this).fmap((_) => v);
  }

  bind<B>(f: (v: A) => Parser<B>) {
    const p = (s: string): ParserError | ParserSuccess<B> => {
      const resultFirst = this.run(s);
      if (resultFirst.error) {
        return resultFirst as ParserError;
      }

      const { result, col, rest } = resultFirst as ParserSuccess<A>;
      const nextParser = Parser.fromParser(f(result));
      const nextResult = nextParser.run(rest);
      nextResult.col += col;
      return nextResult;
    };

    return new Parser(p);
  }

  static do<Vars extends Record<string, any>, Last>(
    ...steps: [
      ...((_env: Vars) => [string, Parser<any>] | Parser<any>)[],
      (_env: Vars) => Parser<Last>
    ]
  ): Parser<Last> {
    if (steps.length === 0) {
      throw new ParserBuildingError("Do statement is empty");
    }

    const p = (s: string): ParserError | ParserSuccess<Last> => {
      let variables: Vars = {} as Vars;
      let restTxt = s;
      let currCol = 0;
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const entry = step(variables);

        if (i === steps.length - 1) {
          const result = (entry as Parser<Last>).run(restTxt);
          result.col += currCol;
          return result;
        }

        let result;
        if (Array.isArray(entry)) {
          const [name, parser] = entry;
          result = parser.run(restTxt);
          result.col += currCol;
          currCol = result.col;
          if (result.error) return result;
          restTxt = (result as ParserSuccess<any>).rest;
          variables = {
            ...variables,
            [name]: (result as ParserSuccess<any>).result,
          };
          continue;
        }

        const parser = entry as Parser<any>;
        result = parser.run(restTxt);
        result.col += currCol;
        currCol = result.col;
        if (result.error) return result;
        restTxt = (result as ParserSuccess<any>).rest;
      }

      throw new ParserBuildingError("Do statement is empty");
    };

    return new Parser(p);
  }

  matchSome(
    lb: number = 0,
    ub: number = Infinity,
    sep: Parser<any> = Parser.never
  ) {
    return Parser.fromParser(
      this,
      (s: string): ParserError | ParserSuccess<A[]> => {
        if (ub < lb) {
          throw new ParserBuildingError(
            "Upper bound needs to be grater than or equals to Lower bound"
          );
        }

        if (ub === lb) {
          return new ParserSuccess([], s, 0);
        }

        const results: A[] = [];
        let rest = s;
        let parsedCol = 0;
        const restParser = sep.keepRight(this); // sep *> this

        let parseResult;
        for (let i = 0; i < ub; i++) {
          parseResult = (i === 0 ? this : restParser).run(rest);
          parsedCol += parseResult.col;
          if (parseResult.error) {
            const { message } = parseResult as ParserError;
            if (i < lb) return new ParserError(message, parsedCol);
            else {
              parsedCol -= parseResult.col;
              break;
            };
          }
          
          const { result: rResult, rest: rRest } =
            parseResult as ParserSuccess<A>;
          results.push(rResult);
          rest = rRest;
          continue;
        }

        return new ParserSuccess(
          results,
          rest,
          parsedCol
        );
      }
    );
  }

  optional() {
    return Parser.anyOf([this, Parser.never]);
  }
}
