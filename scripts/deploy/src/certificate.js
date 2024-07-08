import fs from 'fs';
import { execSync } from 'child_process';
import fetch from 'node-fetch';
import { UserRuntimeError, CertificateError } from './error.js';
import config from './config.js';

const CERT_SOURCES = {
  FILE: 'specify-file-path',
  MY_IP: 'my-ip-co',
  EKS: 'eks-medic'
};

const cert = config.CERT_FILE;
const key = config.KEY_FILE;

const obtainCertificateAndKey = async function(values) {
  console.log('Obtaining certificate...');
  const certSource = values.cert_source || '';

  const handlers = {
    [CERT_SOURCES.FILE]: () => handleFileSource(values),
    [CERT_SOURCES.MY_IP]: () => handleMyIpSource(),
    [CERT_SOURCES.EKS]: () => {} // No action needed for 'eks-medic'
  };

  const handler = handlers[certSource];
  if (!handler) {
    throw new UserRuntimeError(`cert_source must be one of: ${Object.values(CERT_SOURCES).join(', ')}`);
  }

  await handler();
};

const handleFileSource = function({ certificate_crt_file_path, certificate_key_file_path }) {
  if (!certificate_crt_file_path || !certificate_key_file_path) {
    throw new CertificateError('certificate_crt_file_path and certificate_key_file_path must be set for file source');
  }

  copyFile(certificate_crt_file_path, cert);
  copyFile(certificate_key_file_path, key);
};

const handleMyIpSource = async function() {
  const [crtData, keyData] = await Promise.all([
    fetchData(`${config.CERT_API_URL}/fullchain`),
    fetchData(`${config.CERT_API_URL}/key`)
  ]);

  writeFile(cert, crtData);
  writeFile(key, keyData);
};

const copyFile = function(src, dest) {
  try {
    fs.copyFileSync(src, dest);
  } catch (error) {
    throw new CertificateError(`Failed to copy file from ${src} to ${dest}: ${error.message}`);
  }
};

const writeFile = function(filename, data) {
  try {
    fs.writeFileSync(filename, data);
  } catch (error) {
    throw new CertificateError(`Failed to write file ${filename}: ${error.message}`);
  }
};

const fetchData = async function(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.FETCH_TIMEOUT);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return await response.text();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new CertificateError(`Request to ${url} timed out`);
    }
    throw new CertificateError(`Failed to fetch data from ${url}: ${error.message}`);
  }
};

const createSecret = async function (namespace, values) {
  console.log('Checking if secret api-tls-secret already exists...');
  try {
    execSync(`kubectl get secret api-tls-secret -n ${namespace}`, { stdio: 'inherit' }); //NoSONAR
    console.log('TLS secret already exists. Skipping creation.');
    return;
  } catch (err) {
    if (err.message.includes('NotFound')) {
      console.log('Secret does not exist. Creating Secret from certificate and key...');
    } else {
      throw err;
    }
  }

  await obtainCertificateAndKey(values);

  execSync(
    `kubectl -n ${namespace} create secret tls api-tls-secret --cert=${cert} --key=${key}`, //NoSONAR
    { stdio: 'inherit' }
  );
  cleanupFiles();
};

const cleanupFiles = function() {
  deleteFile(cert);
  deleteFile(key);
};

const deleteFile = function(filename) {
  try {
    if (fs.existsSync(filename)) {
      fs.unlinkSync(filename);
    }
  } catch (error) {
    console.error(`Failed to delete file ${filename}: ${error.message}`);
  }
};

export { obtainCertificateAndKey, createSecret };
