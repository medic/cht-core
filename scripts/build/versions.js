const packageJson = require('../../package.json');
const buildTime = new Date().getTime();

const {
  ECR_REPO,
  BRANCH,
  BUILD_NUMBER,
  TAG,
} = process.env;

const getBranchVersion = (release) => {
  const base = BRANCH === 'master' ? `${packageJson.version}-alpha` : `${packageJson.version}-${BRANCH}`;
  return release ? base : `${base}.${BUILD_NUMBER}`;
};

const getRepo = (repo) => {
  return repo || ECR_REPO || 'medicmobile';
};

const getVersion = (release) => {
  if (TAG) {
    return TAG;
  }
  if (BRANCH) {
    return getBranchVersion(release);
  }

  if (process.env.VERSION) {
    return process.env.VERSION;
  }

  return `${packageJson.version}-dev.${buildTime}`;
};

const getImageTag = (service, repo = ECR_REPO, release = false) => {
  const version = getVersion(release);
  const tag = version.replace(/\//g, '-');
  return service ? `${getRepo(repo)}/cht-${service}:${tag}` : tag;
};

module.exports = {
  getImageTag,
  getVersion,
  getRepo,
  SERVICES: ['api', 'sentinel'],
};
