const vscode = require("vscode");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

/**
 * Analyze project details
 */
function analyzeProject(rootPath:any) {
  let details = {
    Framework: "N/A",
    NodeJS: "N/A",
    Script: "Unknown",
    TestingLibs: [] as any,
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

    // Node.js version
    if (pkg.engines?.node) {
      details.NodeJS = pkg.engines.node;
    } else if (fs.existsSync(dockerPath)) {
      const dockerContent = fs.readFileSync(dockerPath, "utf-8");
      const match = dockerContent.match(/FROM\s+node:(\d+\.\d+\.\d+)/);
      if (match) {
        details.NodeJS = `Docker node:${match[1]}`;
      } else {
        details.NodeJS = process.version;
      }
    } else {
      details.NodeJS = process.version;
    }

    // Script type
    if (fs.existsSync(path.join(rootPath, "tsconfig.json"))) {
      details.Script = "TypeScript";
    } else {
      details.Script = "JavaScript";
    }

    // Frontend frameworks
    const frontendFrameworks = ["react", "next", "vue", "angular", "svelte", "remix"];
    for (const fw of frontendFrameworks) {
      if (deps[fw]) {
        details.Framework = `${fw} (${deps[fw]})`;
        details.FE_BE = "Frontend";
        break;
      }
    }

    // Backend frameworks
    const backendFrameworks = ["express", "fastify", "nestjs", "koa"];
    for (const fw of backendFrameworks) {
      if (deps[fw]) {
        details.Framework = `${fw.charAt(0).toUpperCase() + fw.slice(1)} (${deps[fw]})`;
        details.FE_BE = details.FE_BE === "Frontend" ? "Fullstack" : "Backend";
        break;
      }
    }

    // Testing libs (ignore @types/*)
    const testLibs = ["jest", "mocha", "chai", "cypress", "vitest", "playwright", "jasmine"];
    testLibs.forEach((lib) => {
      if (deps[lib]) {
        details.TestingLibs.push({ name: lib, version: deps[lib] });
      }
    });
  }

  return details;
}

/**
 * Call API
 */
async function askChatGPT(prompt:any) {
  try {
    const response = await axios.post(
      "https://agentic-poc-jqje.vercel.app/generate-tests",
      { code: prompt },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer 1234`,
        },
        timeout: 120000,
      }
    );
    return response.data.tests?.trim();
  } catch (err:any) {
    console.error("ChatGPT API Error:", err.response?.data || err.message);
    return "Error: " + (err.response?.data?.error?.message || err.message);
  }
}

function activate(context:any) {
  let disposable = vscode.commands.registerCommand("ai-helper.generateTests", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("No active editor");
      return;
    }

    // --- project details retrieval
    const workspaceFolders = vscode.workspace.workspaceFolders;
    let projectDetails = {} as any;
    if (workspaceFolders) {
      const rootPath = workspaceFolders[0].uri.fsPath;
      projectDetails = analyzeProject(rootPath);
    }

    // --- code from editor
    const selection = editor.selection;
    let code = editor.document.getText(selection.isEmpty ? undefined : selection);

    vscode.window.showInformationMessage("Generating test cases...");

    // --- build prompt with project context
    const detailsString = `
Project Context:
- Framework: ${projectDetails.Framework}
- NodeJS: ${projectDetails.NodeJS}
- Script: ${projectDetails.Script}
- FE/BE: ${projectDetails.FE_BE}
- Testing Libraries: ${
      projectDetails.TestingLibs.length > 0
        ? projectDetails.TestingLibs.map((lib:any) => `${lib.name}:${lib.version}`).join(", ")
        : "N/A"
    }
`;

    const testPrompt = `${detailsString}\nNow generate unit test cases using the detected testing library (prefer Jest if available) for the following code:\n\n${code}.
    Note: output the details given about detected testing library`;

    const result = await askChatGPT(testPrompt);

    // --- write to new file
    const testFile = await vscode.workspace.openTextDocument({
      content: result,
      language: "javascript", // ya typescript bhi detect karke dal sakte ho
    });
    await vscode.window.showTextDocument(testFile, vscode.ViewColumn.Beside);
  });

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = { activate, deactivate };


// async function askChatGPT(prompt:any) {
//     try {
//         const response = await axios.post(
//             "https://qb40xwh8-11434.uks1.devtunnels.ms/api/generate",
//             {
             
//                 model: 'deepcoder:1.5b',
//        			prompt: prompt,
//         		stream: false ,
//             },
//             {
//                 headers: {
//                     "Content-Type": "application/json",
//                 },
//             }
//         );
//         return response?.data ;
//     } catch (err:any) {
//         return "Error: " + err.message;
//     }
// }

// const vscode = require("vscode");
// const fs = require("fs");
// const path = require("path");

// /**
//  * Analyze project details
//  */
// function analyzeProject(rootPath: any) {
//   interface ProjectDetails {
//     Framework: string;
//     NodeJS: string;
//     Script: string;
//     TestingLibs: { name: string; version: string }[];
//     FE_BE: string;
//   }
//   let details: ProjectDetails = {
//     Framework: "N/A",
//     NodeJS: "N/A",
//     Script: "Unknown",
//     TestingLibs: [],
//     FE_BE: "Unknown",
//   };

//   const pkgPath = path.join(rootPath, "package.json");

//   if (fs.existsSync(pkgPath)) {
//     const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
//     const deps = { ...pkg.dependencies, ...pkg.devDependencies };

//     // Node.js version
//     details.NodeJS = pkg.engines?.node || process.version;

//     // Script type
//     if (fs.existsSync(path.join(rootPath, "tsconfig.json"))) {
//       details.Script = "TypeScript";
//     } else {
//       details.Script = "JavaScript";
//     }

//     // Frontend frameworks
//     const frameworks = ["react", "next", "vue", "angular", "svelte", "remix"];
//     for (const fw of frameworks) {
//       if (deps[fw]) {
//         details.Framework = `${fw} (${deps[fw]})`;
//         details.FE_BE = "Frontend";
//         break;
//       }
//     }

//     // Backend frameworks
//     if (deps["express"] || deps["fastify"] || deps["nestjs"]) {
//       details.FE_BE = details.FE_BE === "Frontend" ? "Fullstack" : "Backend";
//       if (deps["express"]) details.Framework = `Express (${deps["express"]})`;
//       if (deps["fastify"]) details.Framework = `Fastify (${deps["fastify"]})`;
//       if (deps["nestjs"]) details.Framework = `NestJS (${deps["nestjs"]})`;
//     }

//     // Testing libs
//     const testLibs = ["jest", "mocha", "chai", "cypress", "vitest", "playwright", "jasmine"];
//     testLibs.forEach((lib) => {
//       if (deps[lib]) {
//         details.TestingLibs.push({ name: lib, version: deps[lib] });
//       }
//     });
//   }

//   return details;
// }

// /**
//  * Webview content (overlay modal UI style)
//  */
// function getWebviewContent(details: any) {
//   return `
//     <!DOCTYPE html>
//     <html lang="en">
//     <head>
//       <meta charset="UTF-8">
//       <style>
//         body {
//           margin: 0;
//           font-family: sans-serif;
//           background: #f5f5f5;
//         }
//         .overlay {
//           position: fixed;
//           top: 0; left: 0;
//           width: 100%; height: 100%;
//           background: rgba(0,0,0,0.6);
//           display: flex;
//           justify-content: center;
//           align-items: center;
//         }
//         .modal {
//           background: #fff;
//           padding: 20px;
//           border-radius: 8px;
//           width: 520px;
//           box-shadow: 0 5px 15px rgba(0,0,0,0.3);
//           max-height: 80%;
//           overflow-y: auto;
//         }
//         .title {
//           font-size: 20px;
//           font-weight: bold;
//           margin-bottom: 12px;
//         }
//         .section {
//           margin: 8px 0;
//         }
//         .btn-grid {
//           display: grid;
//           grid-template-columns: repeat(2, 1fr);
//           gap: 8px;
//           margin-top: 10px;
//         }
//         .btn {
//           background: #007acc;
//           color: #fff;
//           border: none;
//           padding: 8px 12px;
//           border-radius: 4px;
//           cursor: pointer;
//           text-align: center;
//         }
//         .btn:hover {
//           background: #005f99;
//         }
//       </style>
//     </head>
//     <body>
//       <div class="overlay">
//         <div class="modal">
//           <div class="title">📦 Project Details</div>
//           <div class="section">Framework: ${details.Framework}</div>
//           <div class="section">NodeJS: ${details.NodeJS}</div>
//           <div class="section">Script: ${details.Script}</div>
//           <div class="section">FE/BE: ${details.FE_BE}</div>
//           <div class="section">
//             Testing Libraries: ${
//               details.TestingLibs.length > 0
//                 ? details.TestingLibs.map((lib: any) => `${lib.name}:${lib.version}`).join(", ")
//                 : "N/A"
//             }
//           </div>

//           <div class="title">⚡ AI Actions</div>
//           <div class="btn-grid">
//             <button class="btn" onclick="runAction('Generate test cases')">Generate test cases</button>
//             <button class="btn" onclick="runAction('Explain working of file')">Explain file</button>
//             <button class="btn" onclick="runAction('Function test cases')">Function test cases</button>
//             <button class="btn" onclick="runAction('Service usage search')">Service usage search</button>
//             <button class="btn" onclick="runAction('Explain PR changes')">Explain PR changes</button>
//           </div>
//         </div>
//       </div>

//       <script>
//         const vscode = acquireVsCodeApi();
//         function runAction(action) {
//           vscode.postMessage({ command: 'runAction', action });
//         }
//       </script>
//     </body>
//     </html>
//   `;
// }

// function activate(context: any) {
//   let disposable = vscode.commands.registerCommand("ai-helper.generateTests", async () => {
//     const workspaceFolders = vscode.workspace.workspaceFolders;
//     if (!workspaceFolders) {
//       vscode.window.showErrorMessage("No workspace open");
//       return;
//     }

//     const rootPath = workspaceFolders[0].uri.fsPath;
//     const details = analyzeProject(rootPath);

//     const panel = vscode.window.createWebviewPanel(
//       "aiHelper",
//       "AI Helper",
//       vscode.ViewColumn.Beside,
//       { enableScripts: true, retainContextWhenHidden: true }
//     );

//     panel.webview.html = getWebviewContent(details);

//     // Handle button clicks
//     panel.webview.onDidReceiveMessage(
//       (message: any) => {
//         if (message.command === "runAction") {
//           vscode.window.showInformationMessage(`Action triggered: ${message.action}`);
//           console.log("AI Action:", message.action); // For debugging
//         }
//       },
//       undefined,
//       context.subscriptions
//     );
//   });

//   context.subscriptions.push(disposable);
// }

// function deactivate() {}

// module.exports = { activate, deactivate };
