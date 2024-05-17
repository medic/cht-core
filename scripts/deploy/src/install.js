import fs from 'fs';
import child_process from 'child_process';
import fetch from 'node-fetch';
import yaml from 'js-yaml';
import path from 'path';

const MEDIC_REPO_NAME = "medic";
const MEDIC_REPO_URL = "https://docs.communityhealthtoolkit.org/helm-charts";
const CHT_CHART_NAME = `${MEDIC_REPO_NAME}/cht-chart-4x`;
const DEFAULT_CHART_VERSION = "1.0.*";

import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { obtainCertificateAndKey, createSecret } from './certificate.js';
import UserRuntimeError from './error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function readFile(f) {
    try {
        return yaml.load(fs.readFileSync(f, 'utf8'));
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

function prepare(f) {
    const values = readFile(f);
    const environment = values.environment || '';
    const scriptPath = path.join(__dirname, 'prepare.sh');
    child_process.execSync(`${scriptPath} ${environment}`, { stdio: 'inherit' });
}

function loadValues(f) {
    if (!f) {
        console.error("No values file provided. Please specify a values file using -f <file>");
        process.exit(1);
    }
    return readFile(f);
}

function determineNamespace(values) {
    const namespace = values.namespace || '';
    if (!namespace) {
        console.error("Namespace is not specified.");
        process.exit(1);
    }
    return namespace;
}

async function get_image_tag(chtversion) {
    const response = await fetch(`https://staging.dev.medicmobile.org/_couch/builds_4/medic:medic:${chtversion}`);
    const data = await response.json();
    const tag = data.tags && data.tags.find(tag => tag.container_name === 'cht-api');
    if (!tag) return Promise.reject(new UserRuntimeError('cht image tag not found'));
    return tag.image.split(':').pop();
}

function helmInstallOrUpdate(valuesFile, namespace, values, image_tag) {
    const chart_version = values.cht_chart_version || DEFAULT_CHART_VERSION;
    ensureMedicHelmRepo();
    const project_name = values.project_name || "";
    try {
        const releaseExists = child_process.execSync(`helm list -n ${namespace}`).toString();
        if (releaseExists.includes(project_name)) {
            console.log("Release exists. Performing upgrade.");
            child_process.execSync(
                `helm upgrade --install ${project_name} ${CHT_CHART_NAME} --version ${chart_version} --namespace ${namespace} --values ${valuesFile} --set cht_image_tag=${image_tag}`, { stdio: 'inherit' });
            console.log(`Instance at ${values.ingress.host} upgraded successfully.`);
        } else {
            console.log("Release does not exist. Performing install.");
            child_process.execSync(`helm install ${project_name} ${CHT_CHART_NAME} --version ${chart_version} --namespace ${namespace} --create-namespace --values ${valuesFile} --set cht_image_tag=${image_tag}`, { stdio: 'inherit' });
            console.log(`Instance at ${values.ingress.host} installed successfully.`);
        }
    } catch (err) {
        console.error(JSON.stringify(err));
        process.exit(1);
    }
}

function ensureMedicHelmRepo() {
    try {
        const repoList = child_process.execSync(`helm repo list -o json`).toString();
        const repos = JSON.parse(repoList);
        const medicRepo = repos.find(repo => repo.name === MEDIC_REPO_NAME);
        if (!medicRepo) {
            console.log(`Helm repo ${MEDIC_REPO_NAME} not found, adding..`);
            child_process.execSync(`helm repo add ${MEDIC_REPO_NAME} ${MEDIC_REPO_URL}`, { stdio: 'inherit' });
        } else if (medicRepo.url.trim('/') !== MEDIC_REPO_URL) {
            throw new UserRuntimeError(`Medic repo found but url not matching '${MEDIC_REPO_URL}', see: helm repo list`);
        } else {
            // Always get the latest
            child_process.execSync(`helm repo update ${MEDIC_REPO_NAME}`, { stdio: 'inherit' });
        }
    } catch (err) {
        console.error(JSON.stringify(err));
        process.exit(1);
    }
}

async function install(f) {
    prepare(f);
    const values = loadValues(f);
    const namespace = determineNamespace(values);
    if (values.cluster_type === 'k3s-k3d') {
        await obtainCertificateAndKey(values);
        createSecret(namespace, values);
    }
    const image_tag = await get_image_tag(values.chtversion);
    helmInstallOrUpdate(f, namespace, values, image_tag);
}

export { install, helmInstallOrUpdate, ensureMedicHelmRepo };
