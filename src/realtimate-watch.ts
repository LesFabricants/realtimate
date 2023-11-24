import chalk from "chalk";
import { program } from "commander";
import { config } from "dotenv";
import { FSWatcher, readdirSync, watch } from "fs";
import { resolve } from "path";
import { buildFunction } from "./utils/build";
import getInvertedDependencyGraphForFiles from "./utils/graph";
import { run } from "./utils/run";

config();

const timer: Map<string, NodeJS.Timeout> = new Map();
const debounceFile = (
  file: string,
  func: (file: string) => void,
  timeout = 50
) => {
  clearTimeout(timer.get(file));
  timer.set(
    file,
    setTimeout(() => {
      func.apply(null, [file]);
    }, timeout)
  );
};

program
  .option(
    "-a, --app <app>",
    "should use all the subdirectory",
    `${process.cwd()}`
  )
  .option("-M, --no-multiple", "should list all the subdirectory")
  .option("-B --no-build", "build options to use", true)
  .option("-R --no-run", "run options to use", true)
  .option("-u, --uri <uri>", "mongodb URI")
  .option(
    "-e,  --environement <environement>",
    "environement to use",
    "development"
  )
  .option("--port <port>", "port number", "3000")
  .option("-s --source <source>", "source to use", `${process.cwd()}/src`)
  .option("-v --verbose")
  .action(function () {
    // @ts-ignore
    const options = this.opts();
    const verbose = options.verbose;

    let apps = (
      options.multiple ? readdirSync(options.app) : [options.app]
    ).map((app) => ({
      app,
      source: resolve(options.source, app),
      destination: resolve(options.app, app),
    }));

    let watcher: FSWatcher;
    if (options.build) {
      const packageJsonSource = resolve(`${options.source}`, `../package.json`);
      verbose && console.log(`package.json: `, packageJsonSource);
      const packageJson = require(packageJsonSource);

      const externals = ["mongodb", ...Object.keys(packageJson.dependencies)];
      watcher = watch(options.source, { recursive: true }, (_, filename) => {
        debounceFile(filename!, async (filename) => {
          const fullpath = resolve(options.source, filename!);
          verbose &&
            console.log(
              `Detected changes in ${chalk.gray(
                fullpath
              )}, recompiling afected functions`
            );
          const graph = getInvertedDependencyGraphForFiles(options.source);

          const impacted: string[] = [fullpath, ...graph[fullpath]];

          const shouldRebuild = impacted.filter((path) =>
            apps.some((app) => path.includes(app.source))
          );

          for (const func of shouldRebuild) {
            const app = apps.find((app) => func.includes(app.source))!;
            const split = func.split("/");
            const [file, ...basePath] = [split.pop(), ...split];

            await buildFunction(
              basePath.join("/"),
              file!,
              app.destination,
              {
                externals,
              },
              verbose
            );
          }
        });
      });
      console.log(
        `Staring watching for changes in ${chalk.green(options.source)}`
      );
    }

    if (options.run) {
      const port = parseInt(options.port);

      let uri = options.uri ?? process.env.MONGODB_URI;

      run(
        port,
        uri,
        apps.map((apps) => apps.destination),
        options.environement
      );
    }

    process.on("SIGINT", () => {
      watcher?.close();
      process.exit(0);
    });
  });

program.parse(process.argv);
