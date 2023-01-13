import {
  Lexer,
  Parser,
  BindingPipe,
  PropertyRead,
  ImplicitReceiver,
  LiteralPrimitive,
  Call,
  Conditional,
  Unary,
  Binary,
  PrefixNot,
  KeyedRead,
  LiteralMap,
  LiteralArray,
} from '@angular/compiler';
import { Injectable } from '@angular/core';
import { PipesService } from '@mm-services/pipes.service';

// taken from https://github.com/vinayk406/angular-expression-parser

const isString = v => typeof v === 'string';
const isDef = v => v !== void 0;
const ifDef = (v, d) => v === void 0 ? d : v;
const plus = (a, b) => {
  if (void 0 === a) {
    return b;
  }
  if (void 0 === b) {
    return a;
  }
  return a + b;
};
const minus = (a, b) => ifDef(a, 0) - ifDef(b, 0);
const noop = () => {};

const fnCache = new Map();
const purePipes = new Map();

const primitiveEquals = (a, b) => {
  if (typeof a === 'object' || typeof b === 'object') {
    return false;
  }
  if (a !== a && b !== b) { // NaN case
    return true;
  }
  return a === b;
};

const detectChanges = (ov, nv) => {
  const len = nv.length;
  let hasChange = len > 10;
  switch (len) {
  case 10:
    hasChange = !primitiveEquals(ov[9], nv[9]);
    if (hasChange) {
      break;
    }
  // eslint-disable-next-line no-fallthrough
  case 9:
    hasChange = !primitiveEquals(ov[8], nv[8]);
    if (hasChange) {
      break;
    }
  // eslint-disable-next-line no-fallthrough
  case 8:
    hasChange = !primitiveEquals(ov[7], nv[7]);
    if (hasChange) {
      break;
    }
  // eslint-disable-next-line no-fallthrough
  case 7:
    hasChange = !primitiveEquals(ov[6], nv[6]);
    if (hasChange) {
      break;
    }
  // eslint-disable-next-line no-fallthrough
  case 6:
    hasChange = !primitiveEquals(ov[5], nv[5]);
    if (hasChange) {
      break;
    }
  // eslint-disable-next-line no-fallthrough
  case 5:
    hasChange = !primitiveEquals(ov[4], nv[4]);
    if (hasChange) {
      break;
    }
  // eslint-disable-next-line no-fallthrough
  case 4:
    hasChange = !primitiveEquals(ov[3], nv[3]);
    if (hasChange) {
      break;
    }
  // eslint-disable-next-line no-fallthrough
  case 3:
    hasChange = !primitiveEquals(ov[2], nv[2]);
    if (hasChange) {
      break;
    }
  // eslint-disable-next-line no-fallthrough
  case 2:
    hasChange = !primitiveEquals(ov[1], nv[1]);
    if (hasChange) {
      break;
    }
  // eslint-disable-next-line no-fallthrough
  case 1:
    hasChange = !primitiveEquals(ov[0], nv[0]);
    if (hasChange) {
      break;
    }
  }
  return hasChange;
};

const getPurePipeVal = (pipe, cache, identifier, ...args) => {
  let lastResult = cache.get(identifier);
  if (lastResult) {
    const isModified = detectChanges(lastResult.args, args);
    if (!isModified) {
      return lastResult.result;
    }
  }
  const result = pipe.transform(...args);
  lastResult = { args, result };
  cache.set(identifier, lastResult);
  return result;
};

class ASTCompiler {
  ast; // ast to be compiled
  declarations; // variable names
  stmts; // function body statements
  pipes; // used pipes
  vIdx; // variable name index
  cAst; // current AST node in the process
  cStmts;
  pipeNameVsIsPureMap;

  constructor(ast, pipeNameVsIsPureMap) {
    this.ast = ast;
    this.declarations = [];
    this.stmts = [];
    this.pipes = [];
    this.vIdx = 0;
    this.pipeNameVsIsPureMap = pipeNameVsIsPureMap;
  }

  createVar() {
    const v = `v${this.vIdx++}`;
    this.declarations.push(v);
    return v;
  }

  processImplicitReceiver() {
    return 'ctx';
  }

  processLiteralPrimitive(ast) {
    return isString(ast.value) ? `"${ast.value}"` : ast.value;
  }

  processUnaryLiteralPrimitive(ast) {
    const literalValue = this.processLiteralPrimitive(ast.expr);

    if (ast.operator === '-') {
      return isString(literalValue) ? '-' + literalValue : (literalValue * -1);
    }

    return literalValue;
  }

  processLiteralArray() {
    const ast = this.cAst;
    const stmts = this.cStmts;
    const v = this.createVar();
    const s = [];
    for (const item of ast.expressions) {
      s.push(this.build(item));
    }
    stmts.push(`${v}=[${s.join(',')}]`);
    return v;
  }

  processLiteralMap() {
    const ast = this.cAst;
    const stmts = this.cStmts;
    const v = this.createVar();
    const _values = [];
    for (const _value of ast.values) {
      _values.push(this.build(_value));
    }
    stmts.push(`${v}={${ast.keys.map((k, i) => k.key + ':' + _values[i])}}`);
    return v;
  }

  processPropertyRead() {
    const ast = this.cAst;
    const stmts = this.cStmts;
    const r = this.build(ast.receiver);
    const v = this.createVar();
    stmts.push(`${v}=${r}&&${r}.${ast.name}`);
    return v;
  }

  processKeyedRead() {
    const ast = this.cAst;
    const stmts = this.cStmts;
    const k = this.build(ast.key);
    const o = this.build(ast.receiver);
    const v = this.createVar();
    stmts.push(`${v}=${o}["${k}"]`);
    return v;
  }

  processPrefixNot() {
    const ast = this.cAst;
    const stmts = this.cStmts;
    const r = this.build(ast.expression);
    stmts.push(`${r}=!${r}`);
    return r;
  }

  handleBinaryPlus_Minus() {
    const ast = this.cAst;
    const stmts = this.cStmts;
    const l = this.build(ast.left);
    const r = this.build(ast.right);
    const v = this.createVar();
    const m = ast.operation === '+' ? '_plus' : '_minus';
    stmts.push(`${v}=${m}(${l},${r})`);
    return v;
  }

  handleBinaryDefault() {
    const ast = this.cAst;
    const stmts = this.cStmts;
    const l = this.build(ast.left);
    const r = this.build(ast.right);
    const v = this.createVar();
    stmts.push(`${v}=${l}${ast.operation}${r}`);
    return v;
  }

  processBinary() {
    const ast = this.cAst;
    const op = ast.operation;
    if (op === '+' || op === '-') {
      return this.handleBinaryPlus_Minus();
    }

    return this.handleBinaryDefault();
  }

  processConditional() {
    const ast = this.cAst;
    const stmts = this.cStmts;
    const condition = this.build(ast.condition);
    const v = this.createVar();
    const _s1 = [];
    const _s2 = [];
    const _s3 = [];
    const trueExp = this.build(ast.trueExp, _s2);
    const falseExp = this.build(ast.falseExp, _s3);

    _s1.push(
      `if(${condition}){`,
      _s2.join(';'),
      `${v}=${trueExp};`,
      `}else{`,
      _s3.join(';'),
      `${v}=${falseExp};`,
      `}`
    );

    stmts.push(_s1.join(' '));
    return v;
  }

  processMethod() {
    const ast = this.cAst;
    const stmts = this.cStmts;
    const _args = [];

    for (const arg of ast.args) {
      _args.push(this.build(arg));
    }

    const functionName = ast.receiver.name;
    const receiver = this.build(ast.receiver.receiver);
    const v = this.createVar();

    stmts.push(`${v}=${receiver}&&${receiver}.${functionName}&&${receiver}.${functionName}(${_args.join(',')})`);
    return v;
  }

  processPipe() {
    const ast = this.cAst;
    const stmts = this.cStmts;
    const t = this.createVar();
    const _args = [];
    const _s1 = [];
    const _s2 = [];
    const exp = this.build(ast.exp);
    for (const arg of ast.args) {
      _args.push(this.build(arg, _s2));
    }

    const p = `_p${this.pipes.length}`;
    this.pipes.push([ast.name, p]);

    _args.unshift(exp);

    _s1.push(
      _s2.length ? _s2.join(';') + ';': '',
      this.pipeNameVsIsPureMap.get(ast.name) ?
        `${t}=getPPVal(${p},_ppc,"${p}",${_args})` :
        `${t}=${p}.transform(${_args})`
    );

    stmts.push(_s1.join(''));
    return t;
  }

  build(ast, cStmts?) {
    this.cAst = ast;
    this.cStmts = cStmts || this.stmts;

    if (ast instanceof ImplicitReceiver) {
      return this.processImplicitReceiver();
    } else if (ast instanceof LiteralPrimitive) {
      return this.processLiteralPrimitive(this.cAst);
    } else if (ast instanceof LiteralArray) {
      return this.processLiteralArray();
    } else if (ast instanceof LiteralMap) {
      return this.processLiteralMap();
    } else if (ast instanceof PropertyRead) {
      return this.processPropertyRead();
    } else if (ast instanceof KeyedRead) {
      return this.processKeyedRead();
    } else if (ast instanceof PrefixNot) {
      return this.processPrefixNot();
    } else if (ast instanceof Unary && ast.expr instanceof LiteralPrimitive) {
      return this.processUnaryLiteralPrimitive(this.cAst);
    } else if (ast instanceof Binary) {
      return this.processBinary();
    } else if (ast instanceof Conditional) {
      return this.processConditional();
    } else if (ast instanceof Call) {
      return this.processMethod();
    } else if (ast instanceof BindingPipe) {
      return this.processPipe();
    }
  }

  extendCtxWithLocals() {
    const v1 = this.createVar();
    this.stmts.push(
      `${v1}=Object.assign({}, locals || {})`,
      `ctx=Object.setPrototypeOf(${v1}, ctx || {})`
    );
  }

  fnBody() {
    return '"use strict";\nvar ' + this.declarations.join(',') + ';\n' + this.stmts.join(';');
  }

  fnArgs() {
    const args = ['_plus', '_minus', '_isDef', 'getPPVal', '_ppc'];

    for (const [, pipeVar] of this.pipes) {
      args.push(pipeVar);
    }

    args.push('ctx', 'locals');

    return args.join(',');
  }

  addReturnStmt(result) {
    this.stmts.push(`return ${result};`);
  }

  cleanup() {
    this.ast = this.cAst = this.stmts = this.cStmts = undefined;
    this.declarations = this.pipes = this.pipeNameVsIsPureMap = undefined;
  }

  compile() {
    this.extendCtxWithLocals();
    this.addReturnStmt(this.build(this.ast));

    const fn = new Function(this.fnArgs(), this.fnBody());
    const boundFn = fn.bind(undefined, plus, minus, isDef, getPurePipeVal);
    boundFn.usedPipes = this.pipes.slice(0); // clone
    this.cleanup();
    return boundFn;
  }
}

const nullPipe = () => {
  return {
    transform: noop
  };
};

@Injectable()
export class ParseProvider {
  constructor(private pipesService:PipesService) {}

  parse(expr) {

    if (!isString(expr)) {
      return noop;
    }

    expr = expr.trim();

    if (!expr.length) {
      return noop;
    }

    let fn = fnCache.get(expr);

    if (fn) {
      return fn;
    }

    const parser = new Parser(new Lexer);
    const ast = parser.parseBinding(expr, '', 0);
    let boundFn;

    if (ast.errors.length) {
      const errors = ast.errors.map(error => error.message).join('; ');
      throw new Error(errors);
    } else {
      const pipeNameVsIsPureMap = this.pipesService.getPipeNameVsIsPureMap();
      const astCompiler = new ASTCompiler(ast.ast, pipeNameVsIsPureMap);
      fn = astCompiler.compile();
      boundFn = fn;
      if (fn.usedPipes.length) {
        const pipeArgs = [];
        let hasPurePipe = false;
        for (const [pipeName] of fn.usedPipes) {
          const pipeInfo = this.pipesService.meta(pipeName);
          let pipeInstance;
          if (!pipeInfo) {
            pipeInstance = nullPipe;
          } else {
            if (pipeInfo.pure) {
              hasPurePipe = true;
              pipeInstance = purePipes.get(pipeName);
            }

            if (!pipeInstance) {
              pipeInstance = this.pipesService.getInstance(pipeName);
            }

            if (pipeInfo.pure) {
              purePipes.set(pipeName, pipeInstance);
            }
          }
          pipeArgs.push(pipeInstance);
        }

        pipeArgs.unshift(hasPurePipe ? new Map() : undefined);

        boundFn = fn.bind(undefined, ...pipeArgs);
      } else {
        boundFn = fn.bind(undefined, undefined);
      }
    }
    fnCache.set(expr, boundFn);

    return boundFn;
  }

}
