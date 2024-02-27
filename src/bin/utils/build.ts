// eslint-disable-next-line @typescript-eslint/no-var-requires
const ncc = require('@vercel/ncc');
import chalk from 'chalk';
import fs, { existsSync } from 'fs';
import path from 'path';
import { Backup } from './helpers';

import { Node, Project, Type, TypeParameter } from 'ts-morph';

const MAX_LIMIT = 10000;

export async function build(
  source: string,
  destination: string,
  hosting: boolean | string = false,
  prebuild = true,
  verbose = false,
  options?: { minify: boolean }
) {
  const basePath = path.resolve(source);
  const realtimateDir = path.resolve(basePath, '.realtimate');
  const backup = new Backup(realtimateDir);
  
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

  verbose && console.log(`Building functions: ${chalk.green(basePath)}`);

  const typesPath = path.resolve(realtimateDir,'types.d.ts');
  fs.mkdirSync(realtimateDir, {recursive: true});

  try {
    const files = fs.readdirSync(basePath);
    const functionFiles = files
      .filter(f => f.indexOf('.') != -1 && (f.endsWith('.ts') || f.endsWith('.js')));

    if(prebuild){
      preBuildCheck(destination, functionFiles, basePath, typesPath);
    } else {
      console.warn('skipping prebuild checks');
    }

  
    for (const file of functionFiles) {
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
  } finally {
    backup.restore();
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

function preBuildCheck(destination: string, functionFiles: string[], basePath: string, typesPath: string) {
  const fnConfigPath = path.resolve(destination, 'functions', 'config.json');
  // function registry
  const config = JSON.parse(fs.readFileSync(fnConfigPath, { encoding: 'utf8' })) as any[];
  const configFunctions = config.map((f: any) => f.name) as string[];


  const missingFunctions = functionFiles.map(f=> f.split('.')[0]).filter(f => !configFunctions.includes(f));
  if (missingFunctions.length) {
    console.warn(`"${missingFunctions.join(',')}" are missing from ${fnConfigPath}, they will be added as private`);
    config.push(...missingFunctions.map((f) => ({
      name: f,
      private: true
    })));
    fs.writeFileSync(fnConfigPath, JSON.stringify(config, undefined, 2), { encoding: 'utf8' });
  }
  
  const functionDeclarations = functionFiles.map(f => getFunctionTypeDeclaration(basePath, f));
  const types = fs.readFileSync(path.resolve(__dirname, '..', '..', 'types.d.ts'), { encoding: 'utf8' });
  const localTypes = types.replace('type FNAME = (name: string, ...args: any[]) => any;', `type FNAME = ${functionDeclarations.join(' & ')};`);
  fs.writeFileSync(typesPath, localTypes, { encoding: 'utf8' });
}

function getFunctionTypeDeclaration(basePath: string, file: string) {
  const sourcePath = path.resolve(basePath, file);
  const functionName = file.split('.')[0];
  const project = new Project();
  project.addSourceFilesAtPaths(sourcePath);
  const expo = project.getSourceFileOrThrow(sourcePath);
  const fn = expo.getExportAssignment(Boolean)?.getFirstChild((node) => Node.isFunctionExpression(node) || Node.isCallExpression(node) || Node.isArrowFunction(node));
  if (fn == undefined) {
    throw new Error(`${file} is missing an export = function() {} statement`);
  }

  const returnType = fn.getType().getCallSignatures()[0].getReturnType().getText(undefined);
  const genericType = fn.getType().getCallSignatures()[0].getTypeParameters().map(generateTypeParameterSignature);
  
  const argsTypes = fn.getType().getCallSignatures()[0].getParameters().map((p) => {
    return p.getTypeAtLocation(fn).getText();
  });
  return `(${genericType.length ? `<${genericType.join(', ')}>` : ''}(name: '${functionName}', ${argsTypes.map((a, i) => `_${i}: ${a}`).join(', ')}) => ${returnType})`;
}

function generateTypeParameterSignature(type: TypeParameter) : string | undefined {
  const constraint = type.getConstraint();
  const def = type.getDefault();
  return `${type.getText()}${constraint ? ` extends ${generateTypeSignature(constraint)}` : ''}${def ? ` = ${generateTypeSignature(def)}` : ''}`;
}

function generateTypeSignature(type: Type): string{
  return `${type.getText()}`;
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
