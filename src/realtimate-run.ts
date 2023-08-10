import { execSync } from "child_process";

execSync(
  `npx nodemon --quiet -e ts,json --watch ${process.cwd()}/apps --watch ${process.cwd()}/src --exec 'node ${__dirname}/realtimate-build.js && node ${__dirname}/run.js'`,
  {
    stdio: "inherit",
  }
);
