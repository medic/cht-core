const { expect } = require('chai');
const lexer = require('../src/lexer');
const parser = require('../src/parser');
const validator = require('../src/validator');
const Entity = require('../src/entities');
const Token = require('../src/tokens');

describe('lexer', () => {
  it('should tokenize escaped characters outside strings', () => {
    // Backslash outside a string escapes the next char, treating it as identifier
    const tokens = lexer.tokenize('test\\(value');
    const idToken = tokens.find(t => t.name === Token.Identifier);
    expect(idToken.data).to.equal('test(value');
  });

  it('should tokenize logical NOT', () => {
    const tokens = lexer.tokenize('!required');
    expect(tokens[0].name).to.equal(Token.LogicalNot);
    expect(tokens[1].name).to.equal(Token.Identifier);
    expect(tokens[1].data).to.equal('required');
  });
});

describe('parser', () => {
  it('should parse logical NOT', () => {
    const tokens = lexer.tokenize('!required');
    const result = parser.parse(tokens);
    expect(result[0].type).to.equal(Entity.Block);
    expect(result[0].sub[0].type).to.equal(Entity.LogicalNot);
    expect(result[0].sub[1].type).to.equal(Entity.Func);
    expect(result[0].sub[1].funcName).to.equal('required');
  });

  it('should throw on unexpected string', () => {
    const tokens = [{ name: Token.String, data: 'bad' }];
    expect(() => parser.parse(tokens)).to.throw('Unexpected string');
  });

  it('should throw on unexpected number', () => {
    const tokens = [{ name: Token.Number, data: '42' }];
    expect(() => parser.parse(tokens)).to.throw('Unexpected string');
  });

  it('should throw on unexpected opening bracket in wrong context', () => {
    // After a function name, we expect funcArgsStart or logicalOp.
    // A second BracketOpen after args start expects string/number/funcArgsEnd, not blockStart.
    const tokens = lexer.tokenize('required(()');
    expect(() => parser.parse(tokens)).to.throw('Unexpected opening bracket');
  });

  it('should throw on unexpected closing bracket', () => {
    const tokens = lexer.tokenize(')');
    expect(() => parser.parse(tokens)).to.throw('Unexpected closing bracket');
  });

  it('should throw on unexpected identifier', () => {
    // Two identifiers in a row without an operator between them
    const tokens = [
      { name: Token.Identifier, data: 'required' },
      { name: Token.Identifier, data: 'lenMin' },
    ];
    expect(() => parser.parse(tokens)).to.throw('Unexpected identifier');
  });

  it('should throw on unexpected logical AND', () => {
    const tokens = [
      { name: Token.LogicalAnd, data: null },
    ];
    expect(() => parser.parse(tokens)).to.throw('Unexpected logical AND');
  });

  it('should throw on unexpected logical OR', () => {
    const tokens = [
      { name: Token.LogicalOr, data: null },
    ];
    expect(() => parser.parse(tokens)).to.throw('Unexpected logical OR');
  });

  it('should throw on unexpected ternary then', () => {
    const tokens = [
      { name: Token.QuestionMark, data: null },
    ];
    expect(() => parser.parse(tokens)).to.throw('Unexpected ternary');
  });

  it('should throw on unexpected ternary else', () => {
    const tokens = [
      { name: Token.Colon, data: null },
    ];
    expect(() => parser.parse(tokens)).to.throw('Unexpected ternary');
  });

  it('should throw on unexpected comma', () => {
    const tokens = [
      { name: Token.Comma, data: null },
    ];
    expect(() => parser.parse(tokens)).to.throw('Unexpected function argument separator');
  });

  it('should throw on unexpected logical NOT', () => {
    // After an identifier, negator is not accepted
    const tokens = [
      { name: Token.Identifier, data: 'required' },
      { name: Token.LogicalNot, data: null },
    ];
    expect(() => parser.parse(tokens)).to.throw('Unexpected logical NOT');
  });

  it('should throw when trying to close root block', () => {
    // "required)" tries to close a block that was never opened
    const tokens = lexer.tokenize('required)');
    expect(() => parser.parse(tokens)).to.throw('Can\'t close the root block');
  });

  it('should throw when blocks are not closed', () => {
    const tokens = lexer.tokenize('(required');
    expect(() => parser.parse(tokens)).to.throw('All blocks weren\'t closed');
  });

  it('should handle ternary without explicit else at end of tokens', () => {
    // "required ? lenMin(1)" - ternary with just a then branch
    const tokens = lexer.tokenize('required ? lenMin(1)');
    const result = parser.parse(tokens);
    expect(result[0].type).to.equal(Entity.Block);
    const ternary = result[0].sub[0];
    expect(ternary.type).to.equal(Entity.Ternary);
    expect(ternary.ifThen).to.not.be.null;
  });
});

describe('validator', () => {
  it('should return true for null entities', async () => {
    const result = await validator.validate(null, {}, 'key');
    expect(result).to.be.true;
  });

  it('should return true for undefined entities', async () => {
    const result = await validator.validate(undefined, {}, 'key');
    expect(result).to.be.true;
  });

  it('should handle negation with logical NOT', async () => {
    const entities = [
      { type: Entity.LogicalNot },
      {
        type: Entity.Func,
        funcName: 'required',
        funcArgs: [],
      },
    ];
    // value is 'hello' which is truthy, so required returns true, negated to false
    const result = await validator.validate(entities, { key: 'hello' }, 'key');
    expect(result).to.be.false;
  });

  it('should handle negation making false become true', async () => {
    const entities = [
      { type: Entity.LogicalNot },
      {
        type: Entity.Func,
        funcName: 'required',
        funcArgs: [],
      },
    ];
    // value is '' which is falsy, so required returns false, negated to true
    const result = await validator.validate(entities, { key: '' }, 'key');
    expect(result).to.be.true;
  });
});

describe('entities', () => {
  it('toString should return entity name', () => {
    expect(Entity.Block.toString()).to.equal('Block');
    expect(Entity.Func.toString()).to.equal('Func');
  });
});

describe('tokens', () => {
  it('toString should return token name', () => {
    expect(Token.Identifier.toString()).to.equal('Identifier');
    expect(Token.Comma.toString()).to.equal('Comma');
  });
});
