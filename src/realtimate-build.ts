const ncc = require("@vercel/ncc");
import chalk from "chalk";
import { program } from "commander";
import fs from "fs";
import path from "path";

const MAX_LIMIT = 10000;

async function build(
  source: string,
  destination: string,
  hosting: boolean | string = false,
  verbose: boolean = false,
  options?: { minify: boolean }
) {
  verbose && console.log(chalk.redBright("[realtimate] building functions..."));
  const packageJsonSource = path.resolve(`${source}`, `../../package.json`);
  verbose && console.log(`package.json: `, packageJsonSource);
  const packageJson = require(packageJsonSource);

  const externals = ["mongodb", ...Object.keys(packageJson.dependencies)];
  verbose && console.log("External dependencies:", chalk.gray(externals));

  const basePath = path.resolve(source);
  verbose && console.log(`Building functions: ${chalk.green(basePath)}`);

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
    const distfile = path.resolve(destination, `functions/${fileName}.js`);
    verbose &&
      console.log(
        `DONE: ${chalk.green(fileSrc)} -> ${chalk.greenBright(
          distfile
        )} (length: ${chalk.gray(finalCode.length)})`
      );
    fs.writeFileSync(distfile, finalCode);

    if (finalCode.length > MAX_LIMIT) {
      throw new Error("Reach max function limit");
    }
  }

  if (!hosting) return;
  // Copy hosting files
  const hostingSrc =
    typeof hosting === "string"
      ? path.resolve(hosting)
      : path.resolve(source, `/../../hosting/dist`);
  if (fs.existsSync(hostingSrc)) {
    const hostingDir = path.resolve(destination, `/hosting`);
    const hostingDest = `${hostingDir}/files`;
    verbose && console.log(`Hosting: ${hostingSrc} -> ${hostingDest}`);
    fs.mkdirSync(hostingDest, { recursive: true });
    fs.cpSync(hostingSrc, hostingDest, { recursive: true, force: true });
  } else {
    console.warn("No hosting files detected");
  }
}

program
  .option("-s, --source <source>", "App source directory")
  .option("-d, --destination <destination>", "Realm App destination directory")
  .option(
    "-h, --hosting [hosting directory]",
    "enable hosting and specify hosting directtory "
  )
  .option("-u, --unminify", "unminify the target file")
  .option("-v, --verbose")
  .action(function () {
    // @ts-ignore
    const options: any = this.opts();

    if (!options.source) {
      const appsFile = fs.readFileSync(
        `${process.cwd()}/.github/workflows/apps.json`
      );
      const apps: { name: string }[] = JSON.parse(appsFile.toString());
      return Promise.all(
        apps.map((app) =>
          build(
            `${process.cwd()}/src/${app.name}`,
            `${process.cwd()}/apps/${app.name}`,
            `${process.cwd()}/hosting/${app.name}/dist`,
            true,
            { minify: true }
          )
        )
      ).then(() => {});
    }

    return build(
      options.source,
      options.destination,
      options.hosting,
      options.verbose,
      {
        minify: !options.unminify,
      }
    );
  });

program.parse(process.argv);
