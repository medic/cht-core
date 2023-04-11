const packageJson = require('../../package.json');
const buildTime = new Date().getTime();

const {
  ECR_REPO,
  ECR_PUBLIC_REPO,
  BRANCH,
  BUILD_NUMBER,
  TAG,
  INTERNAL_CONTRIBUTOR,
} = process.env;

const getBranchVersion = (release) => {
  const base = BRANCH === 'master' ? `${packageJson.version}-alpha` : `${packageJson.version}-${BRANCH}`;
  return release ? base : `${base}.${BUILD_NUMBER}`;
};

const getTagVersion = (release) => {
  return release ? TAG : `${TAG}.${BUILD_NUMBER}`;
};

const getRepo = (repo) => {
  if (!INTERNAL_CONTRIBUTOR) {
    return 'medicmobile';
  }

  if (repo) {
    return repo;
  }

  return ECR_REPO;
};

const getVersion = (release) => {
  if (TAG) {
    return getTagVersion(release);
  }
  if (BRANCH) {
    return getBranchVersion(release);
  }

  if (process.env.VERSION) {
    return process.env.VERSION;
  }

  return `${packageJson.version}-dev.${buildTime}`;
};

const getImageTag = (service, release = false) => {
  const version = getVersion(release);
  const repo = release ? ECR_PUBLIC_REPO : ECR_REPO;
  const tag = version.replace(/\/|_/g, '-');
  return service ? `${getRepo(repo)}/cht-${service}:${tag}` : tag;
};

module.exports = {
  getImageTag,
  getVersion,
  getRepo,
  SERVICES: ['api', 'sentinel'],
  INFRASTRUCTURE: ['couchdb', 'haproxy', 'haproxy-healthcheck', 'nginx'],
};
