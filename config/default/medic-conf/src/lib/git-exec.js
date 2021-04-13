const exec = require('./exec-promise');
const pluralize = require('pluralize');
const log = require('./log');

const GIT = 'git';    // Git command path
const NOT_FOUND_REGEX = new RegExp(`[(Cc)ommand|${GIT}].* not found`);

/**
 * Returns the working tree status in a string (files to commit),
 * or empty if the working tree is clean.
 *
 * If there is no git installation or git repository in the
 * working directory it warns a message with the issue and
 * returns `null`.
 *
 * NOTE: only changes that affect files in the folder where
 * the command is executed are taken into account, to avoid
 * highlighting changes from other configuration folders
 * in multi-projects repos.
 */
module.exports.status = async () => {
  try {
    return await exec([GIT, 'status', '--porcelain', '.'], log.LEVEL_NONE);
  } catch (e) {
    if (typeof e === 'string') {
      if (NOT_FOUND_REGEX.test(e)) {
        log.warn(`Command ${GIT} not found`);
        return null;
      }
      if (e.indexOf('not a git repository') >= 0) {
        log.warn('git repository not found');
        return null;
      }
      log.warn('git command could not be executed successfully -', e);
      return null;
    }
    throw e;
  }
};

/**
 * Returns the name of the remote repository, normally 'origin'.
 *
 * If there is more than one upstream, it returns 'origin' if
 * it is among the list, or the first found.
 *
 * Returns `null` if there are no upstreams repos configured.
 */
module.exports.getDefaultRemote = async () => {
  const result = (await exec([GIT, 'remote'], log.LEVEL_NONE)).trim();
  if (result) {
    const lines = result.split('\n');
    if (lines.length > 1) {
      const upstream = lines.find(r=> r === 'origin');
      if (upstream) {
        return upstream;
      }
      return lines[0];
    }
    return result;
  }
  return null;
};

/**
 * Returns the upstream of the current branch,
 * in the form of repo/branch, eg. 'origin/master'.
 *
 * Returns `null` if there are no upstreams repos configured.
 */
module.exports.getUpstream = async () => {
  try {
    return (await exec([GIT, 'rev-parse --abbrev-ref --symbolic-full-name @{u}'], log.LEVEL_NONE)).trim();
  } catch (err) {
    if (typeof err === 'string' && err.indexOf('no upstream configured') >= 0) {
      return null;
    }
    throw err;
  }
};

/**
 * Fetches the upstream repository and compares the current
 * branch against it, returning a message with the result whether it
 * is behind, ahead or both.
 *
 * Returns an empty string if it is in sync.
 *
 * If there is no upstream repository in the
 * working directory it warns a message with the issue and
 * returns `null`.
 *
 * NOTE: only commits that affect files in the folder where
 * the command is executed are taken into account, to avoid
 * highlighting changes from other configuration folders
 * in multi-projects repos.
 */
module.exports.checkUpstream = async () => {
  await exec([GIT, 'fetch'], log.LEVEL_ERROR);
  let upstream = await module.exports.getUpstream();
  if (upstream === null) {
    upstream = await module.exports.getDefaultRemote();
    if (upstream === null) {
      log.warn('git upstream repository not found');
      return null;
    }
  }
  try {
    // Get the commits count from each side that aren't in the other side,
    // eg. `1    3` means 1 commit is ahead in the local repo (not in upstream)
    // while 3 commits from upstream aren't in sync yet in local
    const result = await exec([GIT, `rev-list --left-right --count ...${upstream} .`], log.LEVEL_ERROR);
    const [ahead, behind] = result.split('\t').filter(s => s).map(Number);
    if (ahead && behind) {
      return `branch is behind upstream by ${pluralize('commit', behind, true)} `
        + `and ahead by ${pluralize('commit', ahead, true)}`;
    }
    if (behind) {
      return `branch is behind upstream by ${pluralize('commit', behind, true)}`;
    }
    if (ahead) {
      return `branch is ahead upstream by ${pluralize('commit', ahead, true)}`;
    }
    return '';
  } catch (e) {
    if (typeof e === 'string') {
      if (e.indexOf('unknown revision or path') >= 0) {
        log.warn('git repository not found');
        return false;
      }
      throw new Error(e);
    }
    throw e;
  }
};
