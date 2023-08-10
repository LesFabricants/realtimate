const ncc = require("@vercel/ncc");
import chalk from "chalk";
import fs from "fs";
import path from "path";

const packageJson = require(process.cwd() + "/package.json");

const MAX_LIMIT = 10000;

console.log(chalk.redBright("[realtimate] building functions..."));

//TODO: colors !
async function build(appname: string, options: { minify: boolean }) {
  const externals = ["mongodb", ...Object.keys(packageJson.dependencies)];
  console.log("External dependencies:", externals);

  const appList =
    typeof appname === "string"
      ? [appname]
      : fs.readdirSync(`${process.cwd()}/apps`);
  for (const app of appList) {
    const basePath = `${process.cwd()}/src/${app}`;
    console.log(`Building functions: ${basePath}`);

    const files = fs.readdirSync(basePath);
    for (const file of files) {
      const fileSrc = `${basePath}/${file}`;
      if (file.indexOf(".") === -1) {
        console.warn(`File has no extension ${file}, skipping`);
        continue;
      }
      const [fileName, ext] = file.split(".");
      if (!["ts", "js"].includes(ext.toLocaleLowerCase())) {
        console.warn(
          `${fileSrc} is not javascript, nor typescript, (ext: ${ext}) skipping...`
        );
        continue;
      }
      const nccOptions = Object.assign(
        {
          externals,
          minify: true, // default
          target: "es2022", // default
          v8cache: false, // default
          quiet: true, // default
          debugLog: false, // default
        },
        options
      );
      const { code } = await ncc(fileSrc, nccOptions);

      const finalCode = `exports=(...args)=>{__dirname='';module={};${code};return module.exports.apply(null, args)}`;
      const distfile = path.resolve(`apps/${app}/functions/${fileName}.js`);
      console.log(
        `BUNDLE: ${fileSrc} -> ${distfile} (length: ${finalCode.length})`
      );
      fs.writeFileSync(distfile, finalCode);

      if (finalCode.length > MAX_LIMIT) {
        throw new Error("Reach max function limit");
      }
    }

    // Copy hosting files
    const hostingSrc = `${process.cwd()}/hosting/${app}/dist`;
    if (fs.existsSync(hostingSrc)) {
      const hostingDir = `apps/${app}/hosting`;
      const hostingDest = `${hostingDir}/files`;
      console.log(`Hosting: ${hostingSrc} -> ${hostingDest}`);
      fs.mkdirSync(hostingDest, { recursive: true });
      fs.cpSync(hostingSrc, hostingDest, { recursive: true, force: true });
    } else {
      console.log("No hosting files detected");
    }
  }
}

const appsFile = fs.readFileSync(
  `${process.cwd()}/.github/workflows/apps.json`
);
const apps: { name: string }[] = JSON.parse(appsFile.toString());
for (const app of apps) {
  build(app.name, { minify: true });
}
