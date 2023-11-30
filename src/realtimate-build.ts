import { program } from "commander";
import fs from "fs";
import { build } from "./utils/build";

program
  .option("-s, --source <source>", "App source directory")
  .option("-d, --destination <destination>", "Realm App destination directory")
  .option(
    "-h, --hosting [hosting directory]",
    "enable hosting and specify hosting directory "
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
