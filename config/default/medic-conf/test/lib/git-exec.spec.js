const { expect } = require('chai');
const rewire = require('rewire');

const git = rewire('./../../src/lib/git-exec');

describe('git-exec', () => {

  it('`status` returns `null` if git is not installed', async () => {
    let result;
    git.__set__('exec', () => Promise.reject('Command \'git\' not found, did you mean:'));
    result = await git.status();
    expect(result).to.be.null;

    git.__set__('exec', () => Promise.reject('git: command not found'));
    result = await git.status();
    expect(result).to.be.null;
  });

  it('`status` returns `false` if the working directory does not have a git repository', async () => {
    let result;
    git.__set__('exec', () => Promise.reject('fatal: not a git repository (or any of the parent directories): .git'));
    result = await git.status();
    expect(result).to.be.null;
  });

  it('`getUpstream` with no upstream repositories returns `null`', async () => {
    git.__set__('exec', () => Promise.resolve(''));
    const result = await git.getDefaultRemote();
    expect(result).to.be.null;
  });

  it('`getUpstream` with upstream repositories returns name`', async () => {
    git.__set__('exec', () => Promise.resolve('origin'));
    const result = await git.getDefaultRemote();
    expect(result).to.be.eq('origin');
  });

  it('`getUpstream` with multiple upstream repositories returns "origin" one`', async () => {
    git.__set__('exec', () => Promise.resolve('first-one\norigin\nother-repo-name'));
    const result = await git.getDefaultRemote();
    expect(result).to.be.eq('origin');
  });

  it('`getUpstream` with multiple upstream repositories returns one`', async () => {
    git.__set__('exec', () => Promise.resolve('first-one\nother-repo-name'));
    const result = await git.getDefaultRemote();
    expect(result).to.be.eq('first-one');
  });

  it('`checkUpstream` with no upstream changes get empty result', async () => {
    git.__set__('getUpstream', () => Promise.resolve('origin/master'));
    git.__set__('exec', () => Promise.resolve('0\t0'));
    const result = await git.checkUpstream();
    expect(result).to.eq('');
  });

  it('`checkUpstream` with branch changes get text with result', async () => {
    git.__set__('getUpstream', () => Promise.resolve('origin/master'));
    git.__set__('exec', () => Promise.resolve('1\t0'));
    const result = await git.checkUpstream();
    expect(result).to.eq('branch is ahead upstream by 1 commit');
  });

  it('`checkUpstream` with upstream changes get text with result', async () => {
    git.__set__('getUpstream', () => Promise.resolve('origin/master'));
    git.__set__('exec', () => Promise.resolve('0\t2'));
    const result = await git.checkUpstream();
    expect(result).to.eq('branch is behind upstream by 2 commits');
  });

  it('`checkUpstream` with upstream and local branch changes get text with result', async () => {
    git.__set__('getUpstream', () => Promise.resolve('origin/master'));
    git.__set__('exec', () => Promise.resolve('2\t1'));
    const result = await git.checkUpstream();
    expect(result).to.eq('branch is behind upstream by 1 commit and ahead by 2 commits');
  });
});
