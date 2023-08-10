import ReadLine from "readline-sync";
import fs from "fs";
import { execSync } from "child_process";

const rootDir = process.cwd();

fs.mkdirSync(rootDir + "/.github/workflows", { recursive: true });
fs.writeFileSync(
  `${rootDir}/.github/workflows/build.yml`,
  fs.readFileSync(`${__dirname}/assets/.github/build.template`)
);
fs.writeFileSync(
  `${rootDir}/.github/workflows/clean.yml`,
  fs.readFileSync(`${__dirname}/assets/.github/clean.template`)
);
if (!fs.readFileSync(`${rootDir}/.github/workflows/apps.json`)) {
  fs.writeFileSync(`${rootDir}/.github/workflows/apps.json`, "[]");
}

fs.mkdirSync(rootDir + "/src/types", { recursive: true });
fs.writeFileSync(
  `${rootDir}/src/types/realm.d.ts`,
  fs.readFileSync(`${__dirname}/../realm.d.ts`).toString()
);

// fs.writeFileSync(
//   `${rootDir}/tsconfig.json`,
//   fs.readFileSync(`${__dirname}/assets/tsconfig.template`).toString()
// );
// fs.writeFileSync(
//   `${rootDir}/turbo.json`,
//   fs.readFileSync(`${__dirname}/assets/turbo.template`).toString()
// );

execSync("npm install typescript mongodb body-parser", { stdio: "inherit" });
