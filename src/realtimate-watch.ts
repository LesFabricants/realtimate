import chalk from "chalk";
import { program } from "commander";
import { config } from "dotenv";
import { FSWatcher, readdirSync, watch } from "fs";
import { resolve } from "path";
import { TypescriptDepencyGraph } from "typescript-source-graph";
import { build, buildFunction } from "./utils/build";
import { debounceFile, seriesOrParallel } from "./utils/helpers";
import { run } from "./utils/run";

config();


program
  .option(
    '-a, --app <app>',
    'should use all the subdirectory',
    `${process.cwd()}`
  )
  .option('-M, --no-multiple', 'should list all the subdirectory')
  .option('-B --no-build', 'build options to use', true)
  .option('-R --no-run', 'run options to use', true)
  .option('-u, --uri <uri>', 'mongodb URI')
  .option(
    '-e,  --environement <environement>',
    'environement to use',
    'development'
  )
  .option("--port <port>", "port number", "3000")
  .option("-s --source <source>", "source to use", `${process.cwd()}/src`)
  .option("-v --verbose")
  .option('-i --buildInBand', 'Build the functions in band', false)
  .action(async function () {
    // @ts-expect-error commander use this
    const options = this.opts();
    const verbose = options.verbose;

    const apps = (
      options.multiple ? readdirSync(options.app) : [options.app]
    ).map((app) => ({
      app,
      source: resolve(options.source, app),
      destination: resolve(options.app, app),
    }));

    let watcher: FSWatcher;
    if (options.build) {
      const packageJsonSource = resolve(`${options.source}`, '../package.json');
      verbose && console.log('package.json: ', packageJsonSource);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const packageJson = require(packageJsonSource);

      const externals = ['mongodb', ...Object.keys(packageJson.dependencies)];
      watcher = watch(options.source, { recursive: true }, (_, filename) => {
        debounceFile(filename!, async (filename: string) => {
          const fullpath = resolve(options.source, filename!);
          verbose &&
            console.log(
              `Detected changes in ${chalk.gray(
                fullpath
              )}, recompiling afected functions`
            );
          const graph = new TypescriptDepencyGraph(options.source);

          const impacted: string[] = [
            fullpath,
            ...graph.getParentFiles(fullpath),
          ];

          const shouldRebuild = impacted.filter((path) =>
            apps.some((app) => path.includes(app.source))
          );

          for (const func of shouldRebuild) {
            const app = apps.find((app) => func.includes(app.source))!;
            const split = func.split('/');
            const [file, ...basePath] = [split.pop(), ...split];

            try {
              await buildFunction(
                basePath.join('/'),
                file!,
                app.destination,
                {
                  externals,
                },
                verbose
              );
            } catch(e: unknown){
              if(e instanceof Error)
                console.warn(e?.message);
            }
          }
        });
      });

      console.time("build");
      await seriesOrParallel(apps, async (app) => { await build(app.source, app.destination, false, options.verbose) }, options.buildInBand)

      console.timeEnd("build");

      console.log(
        `Staring watching for changes in ${chalk.green(options.source)}`
      );
    }

    if (options.run) {
      const port = parseInt(options.port);

      const uri = options.uri ?? process.env.MONGODB_URI;

      run(
        port,
        uri,
        apps.map((apps) => apps.destination),
        options.environement
      );
    }

    process.on('SIGINT', () => {
      watcher?.close();
      process.exit(0);
    });
  });

program.parse(process.argv);
