import 'source-map-support/register';
import { isString } from './parser/base-parser';
import { Parser } from './parser/parser';
import { headerLine, headerLines } from './mscript/header';

const lines = `#define_print hello world
#define_print hello world`

console.log(headerLines.run(lines));
// console.log(isString("x").bind(_ => Parser.pure("hello")).run("xxx"))