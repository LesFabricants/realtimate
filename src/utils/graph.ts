import * as ts from "typescript";

function generateGraph(inputDir: string) {
  const configPath = ts.findConfigFile(inputDir, ts.sys.fileExists);
  if (!configPath) {
    throw new Error('Could not find a valid "tsconfig.json".');
  }
  const { config } = ts.readConfigFile(configPath, ts.sys.readFile);

  const splitedConfigPath = configPath.split("/");
  const rootDir = splitedConfigPath
    .slice(0, splitedConfigPath.length - 1)
    .join("/");
  const { options, fileNames } = ts.parseJsonConfigFileContent(
    config,
    ts.sys,
    rootDir
  );
  options.rootDir = rootDir;

  const program = ts.createProgram(fileNames, options);
  const sources = program
    .getSourceFiles()
    .filter((node) => !node.fileName.includes("node_modules"))
    .map((node) => {
      const fileName = node.fileName;
      const dependencies: string[] = [];

      ts.forEachChild(node, (childNode) => {
        if (!ts.isImportDeclaration(childNode)) return;
        const module = childNode.moduleSpecifier.getText(node);
        const fullName = ts.resolveModuleName(
          module.substring(1, module.length - 1),
          node.fileName,
          options,
          ts.sys
        );
        if (
          fullName.resolvedModule?.isExternalLibraryImport ||
          !fullName.resolvedModule
        )
          return;

        dependencies.push(fullName.resolvedModule.resolvedFileName);
      });

      return {
        fileName,
        dependencies,
      };
    });

  return sources.reduce(
    (prev, cur) => ({ ...prev, [cur.fileName]: cur.dependencies }),
    {}
  );
}

function buildCompleteGraph(graph: Record<string, string[]>) {
  const newGraph: any = { ...graph };
  for (const key in graph) {
    newGraph[key] = graph[key].reduce(
      (prev, child) => ({
        ...prev,
        [child]: newGraph[child],
      }),
      {}
    );
  }

  const flatten = (graph: any) => {
    const childs: string[] = [];
    for (const key in graph) {
      childs.push(key);
      childs.push(...flatten(graph[key]));
    }
    return childs;
  };

  const childNodes = Object.values(newGraph)
    .map((graph) => flatten(graph))
    .flat();

  for (const node of childNodes) {
    delete newGraph[node];
  }

  return newGraph;
}

function inverseGraph(graph: Record<string, any>) {
  const explore = (graph: Record<string, any>, parents: string[] = []) => {
    const paths = [parents];
    for (const key in graph) {
      paths.push(...explore(graph[key], [...parents, key]));
    }

    return paths;
  };

  const invertedGraph: any = {};

  for (const paths of explore(graph)) {
    if (paths.length === 0) continue;
    const reverse = paths.slice().reverse();
    const [first, ...rest] = reverse;
    invertedGraph[first] = rest;
  }

  return invertedGraph;
}

export default function getInvertedDependencyGraphForFiles(projectDir: string) {
  return inverseGraph(buildCompleteGraph(generateGraph(projectDir)));
}
