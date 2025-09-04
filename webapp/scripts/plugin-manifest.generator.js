const fs = require('fs');
const path = require('path');

// eslint-disable-next-line no-console
const print = (...args) => console.log(...args);

// All plugins should be grouped under the "@plugins/" space
const NODE_MODULES = path.resolve(__dirname, '../node_modules/@plugins');
const OUTPUT_FILE = path.resolve(__dirname, '../src/ts/plugins/auto-gen-manifest.ts');
// We generate a ts file in order for webpack to know it shouldn't treeshake these dependencies

print('Path: ', NODE_MODULES);
if (!fs.existsSync(NODE_MODULES)){
  print('No "@plugins" group found in "node_modules"');
  return;
}

print('Building plugin list');
// Check that each plugin has a "package.json" file before adding it to the list
const plugins = fs
  .readdirSync(NODE_MODULES)
  .filter(name => {
    const pkgPath = path.join(NODE_MODULES, name, 'package.json');
    return fs.existsSync(pkgPath);
  });
print('Plugins: ', plugins);

const manifest = plugins
  .map((dir) => {
    return `  '${dir}': async () => await import(
    /* webpackMode: "lazy" */ '@plugins/${dir}'
  )`;
  })
  .join(',\n');

const content = `// Auto-generated file — DO NOT EDIT.
export const plugins = {\n${manifest}\n};\n
`;

fs.writeFileSync(OUTPUT_FILE, content, 'utf8');
print(`Generated ${OUTPUT_FILE} with ${plugins.length} plugins.`);
