import ReadLine from "readline-sync";
import fs from "fs";
import { execSync } from "child_process";

const rootDir = process.cwd();

if (ReadLine.keyInYN("Do you want to install github action?")) {
  fs.mkdirSync(rootDir + "/.github/workflows", { recursive: true });
  fs.writeFileSync(
    `${rootDir}/.github/workflows/build.yml`,
    fs.readFileSync(`${__dirname}/assets/.github/build.template`)
  );
  fs.writeFileSync(
    `${rootDir}/.github/workflows/clean.yml`,
    fs.readFileSync(`${__dirname}/assets/.github/clean.template`)
  );
  fs.writeFileSync(`${rootDir}/.github/workflows/apps.json`, "[]");
}

fs.mkdirSync(rootDir + "/src/types", { recursive: true });
fs.writeFileSync(
  `${rootDir}/src/types/realm.d.ts`,
  fs.readFileSync(`${__dirname}/../realm.d.ts`).toString()
);

execSync("npm install typescript");
execSync("npm install mongodb");
execSync("npm install body-parser");
