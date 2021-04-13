const { expect } = require('chai');

const safeStringify = require('../../src/lib/safe-stringify');

describe('safe-stringify', () => {

  it('stringifies an object', () => {
      const given = {
        name: 'harold',
        count: 3,
        match: true,
        gender: null,
        child: {
          name: 'gerald',
          child: {
            name: 'gerald the second'
          }
        }
      };
      const expected =
`{
  "name": "harold",
  "count": 3,
  "match": true,
  "gender": null,
  "child": {
    "name": "gerald",
    "child": {
      "name": "gerald the second"
    }
  }
}`;
      expect(safeStringify(given)).to.deep.equal(expected);
  });

  describe('types', () => {

    const tests = [
      { type: 'string', given: 'str', expected: '"str"' },
      { type: 'boolean', given: true, expected: 'true' },
      { type: 'integer', given: 13, expected: '13' },
      { type: 'decimal', given: 15.03, expected: '15.03' },
      { type: 'array', given: [ 'hello', 3, true ], expected: '[\n  "hello",\n  3,\n  true\n]' },
      { type: 'object', given: { one: 'two' }, expected: '{\n  "one": "two"\n}' },
      { type: 'date', given: new Date(123456879), expected: '"1970-01-02T10:17:36.879Z"'},
      { type: 'null', given: null, expected: 'null' },
      { type: 'undefined', given: undefined, expected: undefined },
      { type: 'undefined property', given: { prop: undefined }, expected: '{}' }
    ];

    tests.forEach(({ type, given, expected }) => {
      it(`should convert ${type} to JSON`, () => {
        expect(safeStringify(given)).to.equal(expected);
      });
    });

  });

  describe('circular references', () => {

    it('in objects', () => {
      const child = { hello: 'world' };
      const parent = { child: child };
      child.parent = parent;
      const expected =
`{
  "child": {
    "hello": "world"
  }
}`;
      expect(safeStringify(parent)).to.deep.equal(expected);
    });

    it('in arrays', () => {
      const child = { hello: 'world' };
      const parent = { children: [ child ] };
      child.parent = parent;
      const expected =
`{
  "children": [
    {
      "hello": "world"
    }
  ]
}`;
      expect(safeStringify(parent)).to.deep.equal(expected);
    });

    it('allows duplicate references', () => {
      const person = { id: 'a' };
      const parent = { patient: person, contact: person };
      const expected =
`{
  "patient": {
    "id": "a"
  },
  "contact": {
    "id": "a"
  }
}`;
      expect(safeStringify(parent)).to.deep.equal(expected);
    });

  });

});
