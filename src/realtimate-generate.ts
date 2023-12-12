import chalk from 'chalk';
import { execSync } from 'child_process';
import fs from 'fs';

execSync('npm install atlas-app-services-cli');

const appName = process.argv.pop();
const appDir = process.cwd() + '/apps/' + appName;
const inventoryDir = process.cwd() + '/inventory';
const sourceDir = process.cwd() + '/src/' + appName;

[appDir, inventoryDir, sourceDir].forEach(dir => fs.mkdirSync(dir, {recursive: true}));

[{folder: 'develop', env: 'qa'}, {folder:'main', env: 'production'}, {folder: 'template', env: 'testing', prefix: '${PREFIX}'}].forEach(({folder, env, prefix})  => {
  prefix ??= folder;
  fs.mkdirSync(inventoryDir + '/' + folder, { recursive: true });
  fs.writeFileSync(
    `${inventoryDir}/${folder}/${appName}.json`,
    JSON.stringify(
      {
        app_id: '${APP_ID}',
        config_version: 20210101,
        name: `${prefix}-${appName}`,
        location: 'DE-FF',
        provider_region: 'gcp-europe-west1',
        deployment_model: 'LOCAL',
        environment: env,
      },
      null,
      2
    )
  );
});


execSync(`npx appservices apps init -n ${appName}` , {cwd: appDir});
['realm_config.json', '.mdb'].forEach(file => fs.rmSync(`${appDir}/${file}`, {recursive: true}));

fs.writeFileSync(
  `${process.cwd()}/src/${appName}/example.ts`,
  fs.readFileSync(`${__dirname}/assets/example.template`)
);

// if github action, then update apps.json
let apps = [{ name: appName! }];
try {
  const jsonApps = fs.readFileSync(
    process.cwd() + '/.github/workflows/apps.json'
  );
  
  if (jsonApps) {
    apps = JSON.parse(jsonApps.toString());
    if (!apps.find(({ name }) => name === appName)) {
      apps.push({ name: appName! });
    }
  }
} catch(err) {
  //pass
}

fs.writeFileSync(
  process.cwd() + '/.github/workflows/apps.json',
  JSON.stringify(apps, null, 2)
);

execSync('npm remove atlas-app-services-cli');
console.log(chalk.redBright(`${appName} created 🚀 !`));
