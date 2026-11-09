const { spawnSync } = require('node:child_process');

const environment = process.env.BUILD_ENV || 'production';
if (environment !== 'production' && environment !== 'uat') {
  console.error('BUILD_ENV must be production or uat.');
  process.exit(1);
}

const configuration = environment === 'uat' ? 'production,uat' : 'production';
const angularCli = require.resolve('@angular/cli/bin/ng.js');
const result = spawnSync(
  process.execPath,
  [angularCli, 'build', ...process.argv.slice(2), '--configuration', configuration],
  { stdio: 'inherit' },
);

if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
