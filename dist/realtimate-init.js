"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const readline_sync_1 = __importDefault(require("readline-sync"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
const rootDir = process.cwd();
if (readline_sync_1.default.keyInYN("Do you want to install github action?")) {
    fs_1.default.mkdirSync(rootDir + "/.github/workflows", { recursive: true });
    fs_1.default.writeFileSync(`${rootDir}/.github/workflows/build.yml`, fs_1.default.readFileSync(`${__dirname}/assets/.github/build.template`));
    fs_1.default.writeFileSync(`${rootDir}/.github/workflows/clean.yml`, fs_1.default.readFileSync(`${__dirname}/assets/.github/clean.template`));
    fs_1.default.writeFileSync(`${rootDir}/.github/workflows/apps.json`, "[]");
}
fs_1.default.mkdirSync(rootDir + "/src/types", { recursive: true });
fs_1.default.writeFileSync(`${rootDir}/src/types/realm.d.ts`, fs_1.default.readFileSync(`${__dirname}/assets/realm.d.template`).toString());
(0, child_process_1.execSync)("npm install typescript");
(0, child_process_1.execSync)("npm install mongodb");
(0, child_process_1.execSync)("npm install body-parser");
//# sourceMappingURL=realtimate-init.js.map