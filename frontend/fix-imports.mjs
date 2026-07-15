import { Project } from "ts-morph";
import path from "path";

const project = new Project({
    tsConfigFilePath: "./tsconfig.json",
});

const srcDir = path.resolve("./src");

// Ordem importa: mais específico primeiro
const aliasMap = [
    { prefix: "lib", alias: "@lib" },
    { prefix: "modules", alias: "@modules" },
    { prefix: "components", alias: "@components" },
];

function toAlias(absPath) {
    const rel = path.relative(srcDir, absPath).replace(/\\/g, "/");
    for (const { prefix, alias } of aliasMap) {
        if (rel.startsWith(prefix + "/")) {
            return rel.replace(prefix, alias);
        }
    }
    return "@/" + rel;
}

const sourceFiles = project.getSourceFiles(["src/**/*.ts", "src/**/*.tsx"]);
let changed = 0;

for (const file of sourceFiles) {
    const imports = [
        ...file.getImportDeclarations(),
        ...file.getExportDeclarations(),
    ];

    for (const imp of imports) {
        const spec = imp.getModuleSpecifierValue?.();
        if (!spec || !spec.startsWith(".")) continue; // só relativos

        const currentDir = file.getDirectoryPath();
        const resolved = path.resolve(currentDir, spec);

        // ignora se resolver fora de src/ (ex: config na raiz)
        if (!resolved.startsWith(srcDir)) continue;

        const newSpec = toAlias(resolved).replace(/\/(index)?$/, (m) =>
            m === "/index" ? "" : m
        );

        imp.setModuleSpecifier(newSpec);
        changed++;
    }
}

await project.save();
console.log(`Imports atualizados: ${changed}`);