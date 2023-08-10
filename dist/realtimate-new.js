"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const fs_1 = __importDefault(require("fs"));
const appName = process.argv.pop();
const appDir = process.cwd() + "/apps/" + appName;
const inventoryDir = process.cwd() + "/inventory";
fs_1.default.mkdirSync(appDir, { recursive: true });
fs_1.default.writeFileSync(`${appDir}/config.json`, JSON.stringify({
    app_id: `${appName}`,
    config_version: 20210101,
    name: `${appName}`,
    location: "DE-FF",
    provider_region: "gcp-europe-west1",
    deployment_model: "LOCAL",
    environment: "testing",
}, null, 2));
fs_1.default.mkdirSync(appDir + "/auth", { recursive: true });
fs_1.default.writeFileSync(`${appDir}/auth/custom_user_data.json`, JSON.stringify({
    enabled: false,
}, null, 2));
fs_1.default.writeFileSync(`${appDir}/auth/providers.json`, JSON.stringify({
    "api-key": {
        name: "api-key",
        type: "api-key",
        disabled: true,
    },
}, null, 2));
fs_1.default.mkdirSync(appDir + "/functions", { recursive: true });
fs_1.default.mkdirSync(appDir + "/trigger", { recursive: true });
fs_1.default.mkdirSync(appDir + "/data_sources/mongodb-atlas", { recursive: true });
fs_1.default.writeFileSync(`${appDir}/data_sources/mongodb-atlas/config.json`, JSON.stringify({
    name: "mongodb-atlas",
    type: "mongodb-atlas",
    config: {
        clusterName: appName,
        readPreference: "primary",
        wireProtocolEnabled: false,
    },
    version: 1,
}, null, 2));
fs_1.default.mkdirSync(appDir + "/environments", { recursive: true });
const emptyValues = { values: {} };
fs_1.default.writeFileSync(`${appDir}/environments/development.json`, JSON.stringify(emptyValues, null, 2));
fs_1.default.writeFileSync(`${appDir}/environments/production.json`, JSON.stringify(emptyValues, null, 2));
fs_1.default.writeFileSync(`${appDir}/environments/testing.json`, JSON.stringify(emptyValues, null, 2));
fs_1.default.writeFileSync(`${appDir}/environments/qa.json`, JSON.stringify(emptyValues, null, 2));
fs_1.default.writeFileSync(`${appDir}/environments/no-environment.json`, JSON.stringify(emptyValues, null, 2));
fs_1.default.mkdirSync(appDir + "/graphql", { recursive: true });
fs_1.default.writeFileSync(`${appDir}/graphql/config.json`, JSON.stringify({
    use_natural_pluralization: true,
}, null, 2));
fs_1.default.mkdirSync(appDir + "/values", { recursive: true });
fs_1.default.mkdirSync(appDir + "/http_endpoints", { recursive: true });
fs_1.default.writeFileSync(`${appDir}/http_endpoints/config.json`, JSON.stringify([], null, 2));
fs_1.default.mkdirSync(inventoryDir + "/develop", { recursive: true });
fs_1.default.mkdirSync(inventoryDir + "/main", { recursive: true });
fs_1.default.writeFileSync(`${inventoryDir}/develop/${appName}.json`, JSON.stringify({
    app_id: `dev-${appName}`,
    config_version: 20210101,
    name: `dev-${appName}`,
    location: "DE-FF",
    provider_region: "gcp-europe-west1",
    deployment_model: "LOCAL",
    environment: "qa",
}, null, 2));
fs_1.default.writeFileSync(`${inventoryDir}/main/${appName}.json`, JSON.stringify({
    app_id: `${appName}`,
    config_version: 20210101,
    name: `${appName}`,
    location: "DE-FF",
    provider_region: "gcp-europe-west1",
    deployment_model: "LOCAL",
    environment: "production",
}, null, 2));
fs_1.default.mkdirSync(process.cwd() + "/src/" + appName, { recursive: true });
fs_1.default.writeFileSync(`${process.cwd()}/src/${appName}/example.ts`, "exports = async () => {}");
// if github action, then update apps.json
const jsonApps = fs_1.default.readFileSync(process.cwd() + "/.github/workflows/apps.json");
console.log(chalk_1.default.greenBright(JSON.stringify(jsonApps)));
if (jsonApps) {
    const apps = JSON.parse(jsonApps.toString());
    if (!apps.find(({ name }) => name === appName)) {
        apps.push({ name: appName });
    }
    console.log(chalk_1.default.blueBright(JSON.stringify(apps)));
    fs_1.default.writeFileSync(process.cwd() + "/.github/workflows/apps.json", JSON.stringify(apps, null, 2));
}
console.log(chalk_1.default.redBright(`Created ${appName} !`));
//# sourceMappingURL=realtimate-new.js.map