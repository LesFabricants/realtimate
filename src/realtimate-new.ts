import chalk from "chalk";
import fs from "fs";

const appName = process.argv.pop();
const appDir = process.cwd() + "/apps/" + appName;
const inventoryDir = process.cwd() + "/inventory";

fs.mkdirSync(appDir, { recursive: true });
fs.writeFileSync(
  `${appDir}/config.json`,
  JSON.stringify(
    {
      app_id: `${appName}`,
      config_version: 20210101,
      name: `${appName}`,
      location: "DE-FF",
      provider_region: "gcp-europe-west1",
      deployment_model: "LOCAL",
      environment: "testing",
    },
    null,
    2
  )
);

fs.mkdirSync(appDir + "/auth", { recursive: true });
fs.writeFileSync(
  `${appDir}/auth/custom_user_data.json`,
  JSON.stringify(
    {
      enabled: false,
    },
    null,
    2
  )
);
fs.writeFileSync(
  `${appDir}/auth/providers.json`,
  JSON.stringify(
    {
      "api-key": {
        name: "api-key",
        type: "api-key",
        disabled: true,
      },
    },
    null,
    2
  )
);

fs.mkdirSync(appDir + "/functions", { recursive: true });
fs.mkdirSync(appDir + "/trigger", { recursive: true });
fs.mkdirSync(appDir + "/data_sources/mongodb-atlas", { recursive: true });
fs.writeFileSync(
  `${appDir}/data_sources/mongodb-atlas/config.json`,
  JSON.stringify(
    {
      name: "mongodb-atlas",
      type: "mongodb-atlas",
      config: {
        clusterName: appName,
        readPreference: "primary",
        wireProtocolEnabled: false,
      },
      version: 1,
    },
    null,
    2
  )
);

fs.mkdirSync(appDir + "/environments", { recursive: true });
const emptyValues = { values: {} };

fs.writeFileSync(
  `${appDir}/environments/development.json`,
  JSON.stringify(emptyValues, null, 2)
);
fs.writeFileSync(
  `${appDir}/environments/production.json`,
  JSON.stringify(emptyValues, null, 2)
);
fs.writeFileSync(
  `${appDir}/environments/testing.json`,
  JSON.stringify(emptyValues, null, 2)
);
fs.writeFileSync(
  `${appDir}/environments/qa.json`,
  JSON.stringify(emptyValues, null, 2)
);
fs.writeFileSync(
  `${appDir}/environments/no-environment.json`,
  JSON.stringify(emptyValues, null, 2)
);

fs.mkdirSync(appDir + "/graphql", { recursive: true });
fs.writeFileSync(
  `${appDir}/graphql/config.json`,
  JSON.stringify(
    {
      use_natural_pluralization: true,
    },
    null,
    2
  )
);

fs.mkdirSync(appDir + "/values", { recursive: true });
fs.mkdirSync(appDir + "/http_endpoints", { recursive: true });
fs.writeFileSync(
  `${appDir}/http_endpoints/config.json`,
  JSON.stringify([], null, 2)
);

fs.mkdirSync(inventoryDir + "/develop", { recursive: true });
fs.mkdirSync(inventoryDir + "/main", { recursive: true });
fs.writeFileSync(
  `${inventoryDir}/develop/${appName}.json`,
  JSON.stringify(
    {
      app_id: `dev-${appName}`,
      config_version: 20210101,
      name: `dev-${appName}`,
      location: "DE-FF",
      provider_region: "gcp-europe-west1",
      deployment_model: "LOCAL",
      environment: "qa",
    },
    null,
    2
  )
);
fs.writeFileSync(
  `${inventoryDir}/main/${appName}.json`,
  JSON.stringify(
    {
      app_id: `${appName}`,
      config_version: 20210101,
      name: `${appName}`,
      location: "DE-FF",
      provider_region: "gcp-europe-west1",
      deployment_model: "LOCAL",
      environment: "production",
    },
    null,
    2
  )
);

fs.mkdirSync(process.cwd() + "/src/" + appName, { recursive: true });
fs.writeFileSync(
  `${process.cwd()}/src/${appName}/example.ts`,
  fs.readFileSync(`${__dirname}/assets/example.template`)
);

// if github action, then update apps.json
const jsonApps = fs.readFileSync(
  process.cwd() + "/.github/workflows/apps.json"
);

if (jsonApps) {
  const apps: { name: string }[] = JSON.parse(jsonApps.toString());
  if (!apps.find(({ name }) => name === appName)) {
    apps.push({ name: appName! });
  }
  fs.writeFileSync(
    process.cwd() + "/.github/workflows/apps.json",
    JSON.stringify(apps, null, 2)
  );
}

console.log(chalk.redBright(`${appName} created 🚀 !`));
