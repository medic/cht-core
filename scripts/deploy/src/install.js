import fs from 'fs';
import child_process from 'child_process';
import fetch from 'node-fetch';
import yaml from 'js-yaml';
import path from 'path';

import config from './config.js';
const { MEDIC_REPO_NAME, MEDIC_REPO_URL, CHT_CHART_NAME, DEFAULT_CHART_VERSION, IMAGE_TAG_API_URL } = config;

import { fileURLToPath } from 'url';
import { obtainCertificateAndKey, createSecret } from './certificate.js';
import { UserRuntimeError } from './error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readFile = (f) => {
  try {
    return yaml.load(fs.readFileSync(f, 'utf8'));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

const prepare = (f) => {
  const values = readFile(f);
  const environment = values.environment || '';
  const scriptPath = path.join(__dirname, 'prepare.sh');
  child_process.execSync(`${scriptPath} ${environment}`, { stdio: 'inherit' }); //NoSONAR
};

const loadValues = (f) => {
  if (!f) {
    console.error('No values file provided. Please specify a values file using -f <file>');
    process.exit(1);
  }
  return readFile(f);
};

const determineNamespace = (values) => {
  const namespace = values.namespace || '';
  if (!namespace) {
    console.error('Namespace is not specified.');
    process.exit(1);
  }
  return namespace;
};

const getImageTag = async (chtVersion) => {
  const response = await fetch(`${IMAGE_TAG_API_URL}/medic:medic:${chtVersion}`);
  const data = await response.json();
  const tag = data.tags?.[0];
  if (!tag) {
    return Promise.reject(new UserRuntimeError('cht image tag not found'));
  }
  return tag.image.split(':').pop();
};

const getChartVersion = (values) => {
  return values.cht_chart_version || DEFAULT_CHART_VERSION;
};

const helmCmd = (action, positionalArgs, params) => {
  const flagsArray = Object
    .entries(params)
    .map(([key, value]) => {
      if (value === true) {
        return `--${key}`;
      }
      if (value) {
        return `--${key} ${value}`;
      }
      return ''; //If value is falsy, don't include the flag
    })
    .filter(Boolean);

  const command = `helm ${action} ${positionalArgs.join(' ')} ${flagsArray.join(' ')}`;
  return child_process.execSync(command, { stdio: 'inherit' });
};

const helmInstallOrUpdate = (valuesFile, namespace, values, imageTag) => {
  const chartVersion = getChartVersion(values);
  ensureMedicHelmRepo();
  const projectName = values.project_name || '';
  const namespaceExists = checkNamespaceExists(namespace);

  try {
    const releaseExists = child_process
      .execSync(`helm list -n ${namespace}`)
      .toString()
      .includes(projectName);

    const commonOpts = {
      'version': chartVersion,
      'namespace': namespace,
      'values': valuesFile,
      'set': `cht_image_tag=${imageTag}`
    };

    if (releaseExists) {
      console.log('Release exists. Performing upgrade.');
      helmCmd('upgrade', [projectName, CHT_CHART_NAME], {
        install: true,
        ...commonOpts
      });
      console.log(`Instance at https://${values.ingress.host} upgraded successfully.`);
      return;
    }

    console.log('Release does not exist. Performing install.');
    helmCmd('install', [projectName, CHT_CHART_NAME], {
      ...commonOpts,
      'create-namespace': !namespaceExists
    });
    console.log(`Instance installed successfully: https://${values.ingress.host}`);

  } catch (err) {
    console.error(err.message);
    if (err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  }
};

const checkNamespaceExists = (namespace) => {
  try {
    const result = child_process.execSync(`kubectl get namespace ${namespace}`).toString();
    return result.includes(namespace);
  } catch (err) {
    return false;
  }
};

const ensureMedicHelmRepo = () => {
  try {
    const repoList = child_process.execSync(`helm repo list -o json`).toString();
    const repos = JSON.parse(repoList);
    const medicRepo = repos.find(repo => repo.name === MEDIC_REPO_NAME);

    if (!medicRepo) {
      console.log(`Helm repo ${MEDIC_REPO_NAME} not found, adding..`);
      child_process.execSync(`helm repo add ${MEDIC_REPO_NAME} ${MEDIC_REPO_URL}`, { stdio: 'inherit' });
      return;
    }

    if (medicRepo.url.replace(/\/$/, '') !== MEDIC_REPO_URL) {
      throw new UserRuntimeError(`Medic repo found but url not matching '${MEDIC_REPO_URL}', see: helm repo list`);
    }
    // Get the latest
    child_process.execSync(`helm repo update ${MEDIC_REPO_NAME}`, { stdio: 'inherit' });
  } catch (err) {
    console.error(err.message);
    if (err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  }
};

const install = async (f) => {
  prepare(f);
  const values = loadValues(f);
  const namespace = determineNamespace(values);
  if (values.cluster_type === 'k3s-k3d') {
    await obtainCertificateAndKey(values);
    createSecret(namespace, values);
  }
  const imageTag = await getImageTag(values.chtversion);
  helmInstallOrUpdate(f, namespace, values, imageTag);
};

export { install, helmInstallOrUpdate, ensureMedicHelmRepo };
