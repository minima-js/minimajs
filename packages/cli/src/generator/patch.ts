/**
 * AST-based code patcher for src/module.ts.
 * Uses the TypeScript Compiler API (already a project dependency) to make
 * precise, format-preserving edits rather than fragile regex replacements.
 */

import { join } from "node:path";
import ts from "typescript";
import { exists, text } from "../utils/fs.js";

/**
 * Patch src/module.ts to:
 *  1. Add an import declaration (after the last existing import)
 *  2. Append a plugin expression to the `plugins` array inside `export const meta`
 *     (or create the `plugins` property if it doesn't exist yet)
 *
 * Idempotent: skips if the import is already present.
 */
export function patchModule(cwd: string, importLine: string, plugin: string): void {
  const modulePath = join(cwd, "src", "module.ts");
  if (!exists(modulePath)) return;

  const original = text.read(modulePath);

  // Fast idempotency check on raw source
  if (original.includes(importLine)) return;

  const sourceFile = ts.createSourceFile(modulePath, original, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

  // Parse the plugin expression string into an AST expression node
  const pluginExpr = parseExpression(plugin);
  if (!pluginExpr) return;

  // Parse the import declaration string into an AST node
  const importDecl = parseImportDeclaration(importLine);
  if (!importDecl) return;

  // Transform the source file
  const result = ts.transform(sourceFile, [(ctx) => transformModule(ctx, importDecl, pluginExpr)]);

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const output = printer.printFile(result.transformed[0] as ts.SourceFile);
  result.dispose();

  text.write(modulePath, output);
}

// ─── Transformer ─────────────────────────────────────────────────────────────

function transformModule(
  ctx: ts.TransformationContext,
  importDecl: ts.ImportDeclaration,
  pluginExpr: ts.Expression
): ts.Transformer<ts.SourceFile> {
  const { factory } = ctx;

  return (sourceFile: ts.SourceFile): ts.SourceFile => {
    // 1. Find the last import declaration index in the statement list
    let lastImportIdx = -1;
    sourceFile.statements.forEach((stmt, i) => {
      if (ts.isImportDeclaration(stmt)) lastImportIdx = i;
    });

    // 2. Visit statements — patch the meta variable and collect new statement list
    const newStatements: ts.Statement[] = [];
    const stmts = Array.from(sourceFile.statements) as ts.Statement[];

    for (let i = 0; i < stmts.length; i++) {
      const stmt = stmts[i] as ts.Statement;

      // Insert the new import right after the last existing import
      if (i === lastImportIdx) {
        newStatements.push(stmt);
        newStatements.push(importDecl);
        continue;
      }

      // Find `export const meta ... = { ... }`
      if (isMetaExport(stmt)) {
        newStatements.push(patchMetaStatement(factory, stmt as ts.VariableStatement, pluginExpr));
        continue;
      }

      newStatements.push(stmt);
    }

    // Edge case: no imports at all — prepend the import
    if (lastImportIdx === -1) {
      newStatements.unshift(importDecl);
    }

    return factory.updateSourceFile(sourceFile, newStatements);
  };
}

// ─── Meta statement patcher ──────────────────────────────────────────────────

function isMetaExport(stmt: ts.Statement): boolean {
  if (!ts.isVariableStatement(stmt)) return false;
  const hasExport = stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
  if (!hasExport) return false;
  return stmt.declarationList.declarations.some((d) => ts.isIdentifier(d.name) && d.name.text === "meta");
}

function patchMetaStatement(
  factory: ts.NodeFactory,
  stmt: ts.VariableStatement,
  pluginExpr: ts.Expression
): ts.VariableStatement {
  const newDeclarations = stmt.declarationList.declarations.map((decl) => {
    if (!ts.isIdentifier(decl.name) || decl.name.text !== "meta") return decl;
    if (!decl.initializer || !ts.isObjectLiteralExpression(decl.initializer)) return decl;

    return factory.updateVariableDeclaration(
      decl,
      decl.name,
      decl.exclamationToken,
      decl.type,
      patchMetaObject(factory, decl.initializer, pluginExpr)
    );
  });

  return factory.updateVariableStatement(
    stmt,
    stmt.modifiers,
    factory.updateVariableDeclarationList(stmt.declarationList, newDeclarations)
  );
}

function patchMetaObject(
  factory: ts.NodeFactory,
  obj: ts.ObjectLiteralExpression,
  pluginExpr: ts.Expression
): ts.ObjectLiteralExpression {
  // Check if a `plugins` property already exists
  const existingPluginsProp = obj.properties.find(
    (p) => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === "plugins"
  ) as ts.PropertyAssignment | undefined;

  if (existingPluginsProp) {
    // Append to the existing array
    if (!ts.isArrayLiteralExpression(existingPluginsProp.initializer)) return obj;
    const arr = existingPluginsProp.initializer;
    const newArr = factory.updateArrayLiteralExpression(arr, [...arr.elements, pluginExpr]);
    const newProp = factory.updatePropertyAssignment(existingPluginsProp, existingPluginsProp.name, newArr);
    return factory.updateObjectLiteralExpression(
      obj,
      obj.properties.map((p) => (p === existingPluginsProp ? newProp : p))
    );
  }

  // Create a new `plugins: [pluginExpr]` property
  const pluginsProp = factory.createPropertyAssignment(
    factory.createIdentifier("plugins"),
    factory.createArrayLiteralExpression([pluginExpr])
  );

  return factory.updateObjectLiteralExpression(obj, [...obj.properties, pluginsProp]);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse a single expression from a string using a dummy TS source file. */
function parseExpression(code: string): ts.Expression | null {
  const src = ts.createSourceFile("_.ts", `const _ = ${code};`, ts.ScriptTarget.Latest, true);
  const stmt = src.statements[0];
  if (!stmt || !ts.isVariableStatement(stmt)) return null;
  const decl = stmt.declarationList.declarations[0];
  return decl?.initializer ?? null;
}

/** Parse a single import declaration from a string. */
function parseImportDeclaration(code: string): ts.ImportDeclaration | null {
  const src = ts.createSourceFile("_.ts", code, ts.ScriptTarget.Latest, true);
  const stmt = src.statements[0];
  if (!stmt || !ts.isImportDeclaration(stmt)) return null;
  return stmt;
}
