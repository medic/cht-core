const { expect, assert } = require('chai');
const rewire = require('rewire');
const { Readable } = require('stream');

const exec = rewire('./../../src/lib/exec-promise');

describe('exec-promise', () => {

  const readable = new Readable();  // dummy readable that at least does pipe
  readable._read = () => {};

  it('execute command resolve in a promise with the standard output as a result', async () => {
    exec.__set__('exec', (command, options, cb) => {
      let sub = {};
      sub.stdout = sub.stderr = readable;
      cb(null, 'Usage: node [options] ...', null);
      return sub;
    });
    const output = await exec([ 'node', '-h']);  // No error is raised
    expect(output).to.match(/Usage: node/);
  });

  it('execute command that output error raise a rejected promise with output error as a result', async () => {
    exec.__set__('exec', (command, options, cb) => {
      let sub = {};
      sub.stdout = sub.stderr = readable;
      cb(new Error(), null, 'node: bad option: --invalid-arg');
      return sub;
    });
    try {
      await exec(['node', '--invalid-arg']);
      assert.fail('Expected execution error');
    } catch (err) {
      expect(err).to.match(/node: bad option/);
    }
  });
});
