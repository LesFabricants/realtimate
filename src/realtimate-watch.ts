import chalk from "chalk";
import { execSync } from "child_process";
import { program } from "commander";
import { readdirSync } from "fs";
import path from "path";

program
  .option("-m, --multiple", "should use all the subdirectory")
  .option("-b --build <build_opt>", "build options to use", undefined)
  .option("-r --run <run>", "run options to use", undefined)
  .option("-s --source <source>", "source to use", `${process.cwd()}/src`)
  .action(function () {
    // @ts-ignore
    const options = this.opts();

    let apps = [process.cwd()];

    let commands: string[] = [];

    if (options.multiple) {
      apps = readdirSync(options.source).map((app) =>
        path.resolve(options.source, app)
      );
    }

    if (options.build) {
      commands.push(`node ${__dirname}/realtimate-build.js ${options.build}`);
    }

    if (options.run) {
      commands.push(
        `node ${__dirname}/realtimate-run.js ${apps
          .map((appPath) => `--app="${appPath}"`)
          .join(" ")} ${options.run}`
      );
    }

    if (!options.run && !options.build) {
      throw new Error("--run or --build is required");
    }

    const exex = `npx nodemon --quiet -e ts,json --watch ${process.cwd()} --watch ${
      options.source
    } --exec '${commands.join(" && ")}'`;

    console.log(
      chalk.grey(
        `[realtimate] runnning: ${exex.replaceAll(/(.*):.*@/g, "$1:********@")}`
      )
    );
    execSync(exex, {
      stdio: "inherit",
    });
  });

program.parse(process.argv);
