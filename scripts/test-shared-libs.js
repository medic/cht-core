/**
 * Runs `npm test` for each workspace and prints a failure summary at the end.
 *
 * `npm test --workspaces --if-present` buries failures in the middle of the output when a
 * workspace fails early and subsequent workspaces pass. This script streams test output in
 * real-time so you can watch progress, but also captures the output of failing workspaces and
 * reprints it at the end so failures are always visible.
 */
const { execSync, spawn } = require('child_process');

const runTest = (name) => {
  return new Promise((resolve) => {
    const proc = spawn('npm', ['test', '-w', name], {
      env: { ...process.env, UNIT_TEST_ENV: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    proc.stdout.on('data', (data) => {
      process.stdout.write(data);
      output += data.toString();
    });
    proc.stderr.on('data', (data) => {
      process.stderr.write(data);
      output += data.toString();
    });

    proc.on('close', (code) => resolve({ name, code, output }));
  });
};

const extractFailureLines = (output) => {
  const lines = output.split('\n');
  const failingIdx = lines.findIndex(l => /\d+ failing/.test(l));
  if (failingIdx === -1) {
    return output.split('\n').slice(-30).join('\n');
  }
  return lines.slice(failingIdx).join('\n');
};

const main = async () => {
  const workspaces = JSON.parse(execSync('npm query ".workspace"', { encoding: 'utf8' }));
  const failures = [];

  for (const ws of workspaces) {
    if (!ws.scripts?.test) {
      continue;
    }
    const result = await runTest(ws.name);
    if (result.code !== 0) {
      failures.push(result);
    }
  }

  if (failures.length) {
    console.error('\n');
    console.error('========================================');
    console.error(' SHARED-LIB TEST FAILURES');
    console.error('========================================');
    for (const { name, output } of failures) {
      console.error(`\n--- ${name} ---\n`);
      console.error(extractFailureLines(output));
    }
    console.error('\n========================================');
    console.error(` ${failures.length} workspace(s) failed:`);
    failures.forEach(f => console.error(`   ✖ ${f.name}`));
    console.error('========================================\n');
    process.exit(1);
  }
};

main();
