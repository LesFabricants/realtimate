"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ncc = require("@vercel/ncc");
const chalk_1 = __importDefault(require("chalk"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const packageJson = require(process.cwd() + "/package.json");
const MAX_LIMIT = 10000;
console.log(chalk_1.default.redBright("[realtimate] building functions..."));
//TODO: colors !
function build(appname, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const externals = ["mongodb", ...Object.keys(packageJson.dependencies)];
        console.log("External dependencies:", externals);
        const appList = typeof appname === "string"
            ? [appname]
            : fs_1.default.readdirSync(`${process.cwd()}/apps`);
        for (const app of appList) {
            const basePath = `${process.cwd()}/src/${app}`;
            console.log(`Building functions: ${basePath}`);
            const files = fs_1.default.readdirSync(basePath);
            for (const file of files) {
                const fileSrc = `${basePath}/${file}`;
                if (file.indexOf(".") === -1) {
                    console.warn(`File has no extension ${file}, skipping`);
                    continue;
                }
                const [fileName, ext] = file.split(".");
                if (!["ts", "js"].includes(ext.toLocaleLowerCase())) {
                    console.warn(`${fileSrc} is not javascript, nor typescript, (ext: ${ext}) skipping...`);
                    continue;
                }
                const nccOptions = Object.assign({
                    externals,
                    minify: true,
                    target: "es2022",
                    v8cache: false,
                    quiet: true,
                    debugLog: false, // default
                }, options);
                const { code } = yield ncc(fileSrc, nccOptions);
                const finalCode = `exports=(...args)=>{__dirname='';module={};${code};return module.exports.apply(null, args)}`;
                const distfile = path_1.default.resolve(`apps/${app}/functions/${fileName}.js`);
                console.log(`BUNDLE: ${fileSrc} -> ${distfile} (length: ${finalCode.length})`);
                fs_1.default.writeFileSync(distfile, finalCode);
                if (finalCode.length > MAX_LIMIT) {
                    throw new Error("Reach max function limit");
                }
            }
            // Copy hosting files
            const hostingSrc = `${process.cwd()}/hosting/${app}/dist`;
            if (fs_1.default.existsSync(hostingSrc)) {
                const hostingDir = `apps/${app}/hosting`;
                const hostingDest = `${hostingDir}/files`;
                console.log(`Hosting: ${hostingSrc} -> ${hostingDest}`);
                fs_1.default.mkdirSync(hostingDest, { recursive: true });
                fs_1.default.cpSync(hostingSrc, hostingDest, { recursive: true, force: true });
            }
            else {
                console.log("No hosting files detected");
            }
        }
    });
}
const appsFile = fs_1.default.readFileSync(`${process.cwd()}/.github/workflows/apps.json`);
const apps = JSON.parse(appsFile.toString());
for (const app of apps) {
    build(app.name, { minify: true });
}
//# sourceMappingURL=realtimate-build.js.map