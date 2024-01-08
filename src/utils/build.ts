// eslint-disable-next-line @typescript-eslint/no-var-requires
const ncc = require('@vercel/ncc');
import chalk from 'chalk';
import fs, { existsSync } from 'fs';
import path from 'path';

const MAX_LIMIT = 10000;

export async function build(
  source: string,
  destination: string,
  hosting: boolean | string = false,
  verbose = false,
  options?: { minify: boolean }
) {
  verbose && console.log(chalk.redBright('[realtimate] building functions...'));
  let packageDir = path.resolve(source);
  while(!existsSync(path.resolve(packageDir, 'package.json'))){
    packageDir = path.resolve(packageDir, '..');
  }

  const packageJsonSource = path.resolve(packageDir, 'package.json');
  verbose && console.log('package.json: ', packageJsonSource);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const packageJson = require(packageJsonSource);

  const externals = ['mongodb', ...Object.keys(packageJson.dependencies ?? {})];
  verbose && console.log('External dependencies:', chalk.gray(externals));

  const basePath = path.resolve(source);
  verbose && console.log(`Building functions: ${chalk.green(basePath)}`);

  try {
    const files = fs.readdirSync(basePath);
    for (const file of files) {
      try {
        const nccOptions = Object.assign(
          {
            externals,
            minify: true,
            target: 'es2022',
            v8cache: false,
            quiet: true,
            debugLog: false, // default
          },
          options
        );
        verbose && process.stdout.write(`-> ${file}... `);
        await buildFunction(basePath, file, destination, nccOptions);
        verbose && console.log('Done');
      } catch (err: any) {
        console.warn(err?.message);
      }
    }
  } catch (e: any) {
    verbose && console.debug(e?.message);
    console.warn('Could not find source for app: ' + basePath);
  }

  if (!hosting) return;
  // Copy hosting files
  const hostingSrc =
    typeof hosting === 'string'
      ? path.resolve(hosting)
      : path.resolve(source, '/../../hosting/dist');
  if (fs.existsSync(hostingSrc)) {
    const hostingDir = path.resolve(destination, '/hosting');
    const hostingDest = `${hostingDir}/files`;
    verbose && console.log(`Hosting: ${hostingSrc} -> ${hostingDest}`);
    fs.mkdirSync(hostingDest, { recursive: true });
    fs.cpSync(hostingSrc, hostingDest, { recursive: true, force: true });
  } else {
    console.warn('No hosting files detected');
  }
}

export async function buildFunction(
  basePath: string,
  file: string,
  destination: string,
  nccOptions: unknown,
  verbose = false
) {
  const fileSrc = `${basePath}/${file}`;
  if (file.indexOf('.') === -1) {
    console.warn(`File has no extension ${file}, skipping`);
    return;
  }
  const [fileName, ext] = file.split('.');
  if (!['ts', 'js'].includes(ext.toLocaleLowerCase())) {
    console.warn(
      `${fileSrc} is not javascript, nor typescript, (ext: ${ext}) skipping...`
    );
    return;
  }

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
    throw new Error('Reach max function limit: ' + fileSrc);
  }
}
