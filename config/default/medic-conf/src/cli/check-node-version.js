const MIN_NODE_VERSION = 6;
const currentNodeVersion = process.versions.node;

if(Number.parseInt(currentNodeVersion.split('.')[0]) < MIN_NODE_VERSION) {
  console.log(`\x1b[31mYour NodeJS is too old.
    You are running node version: ${currentNodeVersion}
    medic-conf requires version:  ${MIN_NODE_VERSION}
  Please upgrade node to continue.\x1b[0m`);
  process.exit(1);
}
