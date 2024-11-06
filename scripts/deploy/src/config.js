export default {
  MEDIC_REPO_NAME: process.env.MEDIC_REPO_NAME || 'medic',
  MEDIC_REPO_URL: process.env.MEDIC_REPO_URL || 'https://docs.communityhealthtoolkit.org/helm-charts',
  CHT_CHART_NAME: process.env.CHT_CHART_NAME || 'medic/cht-chart-4x',
  DEFAULT_CHART_VERSION: process.env.DEFAULT_CHART_VERSION || '1.*.*',
  IMAGE_TAG_API_URL: process.env.IMAGE_TAG_API_URL || 'https://staging.dev.medicmobile.org/_couch/builds_4',
  CERT_FILE: process.env.CERT_FILE || 'certificate.crt',
  KEY_FILE: process.env.KEY_FILE || 'private.key',
  CERT_API_URL: process.env.CERT_API_URL || 'https://local-ip.medicmobile.org',
  FETCH_TIMEOUT: parseInt(process.env.FETCH_TIMEOUT, 10) || 5000,
};
