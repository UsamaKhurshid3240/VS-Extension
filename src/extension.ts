const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

/**
 * Analyze project details
 */
function analyzeProject(rootPath: any) {
  let details = {
    Framework: "N/A",
    NodeJS: "N/A",
    Script: "Unknown",
    TestingLibs: [] as any[],
    FE_BE: "Unknown",
  };

  const pkgPath = path.join(rootPath, "package.json");
  const dockerPath = path.join(rootPath, "Dockerfile");

  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    const deps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies,
      ...pkg.optionalDependencies,
    };

    // Node version
    if (pkg.engines?.node) {
      details.NodeJS = pkg.engines.node;
    } else if (fs.existsSync(dockerPath)) {
      const dockerContent = fs.readFileSync(dockerPath, "utf-8");
      const match = dockerContent.match(/FROM\s+node:(\d+\.\d+\.\d+)/);
      details.NodeJS = match ? `Docker node:${match[1]}` : process.version;
    } else {
      details.NodeJS = process.version;
    }

    // Script type
    details.Script = fs.existsSync(path.join(rootPath, "tsconfig.json"))
      ? "TypeScript"
      : "JavaScript";

    // Frontend
    const fe = ["react", "next", "vue", "angular", "svelte"];
    for (const fw of fe) {
      if (deps[fw]) {
        details.Framework = `${fw} (${deps[fw]})`;
        details.FE_BE = "Frontend";
        break;
      }
    }

    // Backend
    const be = ["express", "fastify", "nestjs", "koa"];
    for (const fw of be) {
      if (deps[fw]) {
        details.Framework = `${fw} (${deps[fw]})`;
        details.FE_BE =
          details.FE_BE === "Frontend" ? "Fullstack" : "Backend";
        break;
      }
    }

    // Testing libs
    const testLibs = [
      "jest",
      "mocha",
      "chai",
      "vitest",
      "cypress",
      "playwright",
    ];
    testLibs.forEach((lib) => {
      if (deps[lib]) {
        details.TestingLibs.push({ name: lib, version: deps[lib] });
      }
    });
  }

  return details;
}

/**
 * ❌ REAL API CALL (COMMENTED)
 */
// async function askChatGPT(prompt: any) {
//   ...
// }

/**
 * ✅ Dummy streaming AI response (word by word)
 */
async function* dummyStreamResponse() {
  // Replace with the api request and stream handling
  const dummyText = `
import { describe, it, expect, jest } from '@jest/globals';
import { getJobById } from '../job.service';

describe('getJobById', () => {
  it('should return job when job exists', async () => {
    const job = await getJobById('123');
    expect(job).toBeDefined();
  });

  it('should throw NotFoundError when job does not exist', async () => {
    await expect(getJobById('999')).rejects.toThrow();
  });

  it('should throw error for invalid jobId', async () => {
    await expect(getJobById(null as any)).rejects.toThrow();
  });
});
`;

  const words = dummyText.split(" ");

  for (const word of words) {
    yield word + " ";
    await new Promise((res) => setTimeout(res, 60)); // typing speed
  }
}

/**
 * Extension activate
 */
function activate(context: any) {
  let disposable = vscode.commands.registerCommand(
    "ai-helper.generateTests",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor");
        return;
      }

      // Project details
      let projectDetails: any = {};
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders) {
        projectDetails = analyzeProject(workspaceFolders[0].uri.fsPath);
      }

      // Code selection
      const selection = editor.selection;
      const code = editor.document.getText(
        selection.isEmpty ? undefined : selection
      );

      vscode.window.showInformationMessage("Streaming test cases...");

      // Open empty document
      const testFile = await vscode.workspace.openTextDocument({
        content: "",
        language: "typescript",
      });

      const editorView = await vscode.window.showTextDocument(
        testFile,
        vscode.ViewColumn.Beside
      );

      // Stream response
      for await (const chunk of dummyStreamResponse()) {
        await editorView.edit((editBuilder: any) => {
          const lastLine = testFile.lineCount;
          const lastChar = testFile.lineAt(lastLine - 1).range.end;
          editBuilder.insert(lastChar, chunk);
        });
      }
    }
  );

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = { activate, deactivate };
