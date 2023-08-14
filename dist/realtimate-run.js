"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
(0, child_process_1.execSync)(`npx nodemon --quiet -e ts,json --watch ${process.cwd()}/apps --watch ${process.cwd()}/src --exec 'node ${__dirname}/realtimate-build.js && node ${__dirname}/run.js'`, {
    stdio: "inherit",
});
