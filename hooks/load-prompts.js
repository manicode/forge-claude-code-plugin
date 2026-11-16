// Copyright (c) 2026 Manicode Worldwide, Inc. Proprietary and confidential.
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};

// list-files.js
var require_list_files = __commonJS({
  "list-files.js"(exports2, module2) {
    var { execFileSync } = require("child_process");
    function listFiles(root) {
      const out = execFileSync(
        "git",
        ["ls-files", "--cached", "--others", "--exclude-standard"],
        { cwd: root, encoding: "utf8" }
      );
      return out.split("\n").filter(Boolean);
    }
    module2.exports = { listFiles };
  }
});

// detect-language.js
var require_detect_language = __commonJS({
  "detect-language.js"(exports2, module2) {
    var { extname } = require("path");
    var { listFiles } = require_list_files();
    var LANGUAGE_BY_EXT = {
      ".js": "javascript",
      ".jsx": "javascript",
      ".mjs": "javascript",
      ".cjs": "javascript"
    };
    function detectLanguages(root) {
      const found = /* @__PURE__ */ new Set();
      for (const file of listFiles(root)) {
        const lang = LANGUAGE_BY_EXT[extname(file)];
        if (lang) found.add(lang);
      }
      return [...found].sort();
    }
    module2.exports = { detectLanguages };
  }
});

// stack-detection/js-technologies.js
var require_js_technologies = __commonJS({
  "stack-detection/js-technologies.js"(exports2, module2) {
    var STACK_GROUP = "js";
    var JAVASCRIPT_VERSION = "ES2026";
    var PACKAGE_TECHNOLOGIES = [
      { technology: "react", npmPackage: "react" },
      { technology: "nextjs", npmPackage: "next" },
      { technology: "express", npmPackage: "express" }
    ];
    module2.exports = { STACK_GROUP, JAVASCRIPT_VERSION, PACKAGE_TECHNOLOGIES };
  }
});

// detect-stack.js
var require_detect_stack = __commonJS({
  "detect-stack.js"(exports2, module2) {
    var { readFileSync } = require("fs");
    var { join } = require("path");
    var { detectLanguages } = require_detect_language();
    var {
      STACK_GROUP,
      JAVASCRIPT_VERSION,
      PACKAGE_TECHNOLOGIES
    } = require_js_technologies();
    function readJson(path) {
      try {
        return JSON.parse(readFileSync(path, "utf8"));
      } catch {
        return null;
      }
    }
    function lowestVersion(range) {
      if (typeof range !== "string") return null;
      const match = /^[\s^~>=v]*(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(range);
      if (!match) return null;
      const [, major, minor = "0", patch = "0"] = match;
      return `${major}.${minor}.${patch}`;
    }
    function packageVersion(root, npmPackage, range, lockfile) {
      const installed = readJson(
        join(root, "node_modules", npmPackage, "package.json")
      );
      const locked = lockfile?.packages?.[`node_modules/${npmPackage}`];
      return installed?.version ?? locked?.version ?? lowestVersion(range);
    }
    function stackItem(technology, version) {
      return { group: STACK_GROUP, technology, version };
    }
    function detectStack(root) {
      const stack = [];
      if (detectLanguages(root).includes("javascript")) {
        stack.push(stackItem("javascript", JAVASCRIPT_VERSION));
      }
      const manifest = readJson(join(root, "package.json"));
      if (!manifest) return stack;
      stack.push(stackItem("nodejs", process.versions.node));
      const declared = { ...manifest.dependencies, ...manifest.devDependencies };
      const lockfile = readJson(join(root, "package-lock.json"));
      for (const { technology, npmPackage } of PACKAGE_TECHNOLOGIES) {
        if (!(npmPackage in declared)) continue;
        const version = packageVersion(
          root,
          npmPackage,
          declared[npmPackage],
          lockfile
        );
        if (version) stack.push(stackItem(technology, version));
      }
      return stack;
    }
    module2.exports = { detectStack };
  }
});

// state.js
var require_state = __commonJS({
  "state.js"(exports2, module2) {
    var { execFileSync } = require("child_process");
    var { writeFileSync, mkdirSync } = require("fs");
    var { join, dirname } = require("path");
    var { detectStack } = require_detect_stack();
    function repoRoot() {
      return execFileSync("git", ["rev-parse", "--show-toplevel"], {
        encoding: "utf8"
      }).trim();
    }
    function detectAndStore2() {
      const root = repoRoot();
      const state = {
        stack: detectStack(root),
        detectedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      const file = join(root, ".forge", "state.json");
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(join(dirname(file), ".gitignore"), "*\n");
      writeFileSync(file, JSON.stringify(state, null, 2) + "\n");
      return state;
    }
    module2.exports = { detectAndStore: detectAndStore2 };
  }
});

// fetch-prompts.js
var require_fetch_prompts = __commonJS({
  "fetch-prompts.js"(exports2, module2) {
    var API_KEY_VAR = "MANICODE_REGISTRY_API_KEY";
    var DEFAULT_REGISTRY_URL = "https://manicode-context-registry.fly.dev";
    async function fetchPrompts2(stack) {
      if (stack.length === 0) return "";
      const baseUrl = process.env.MANICODE_REGISTRY_URL || DEFAULT_REGISTRY_URL;
      const apiKey = process.env[API_KEY_VAR];
      if (!apiKey) throw new Error(`${API_KEY_VAR} is not set`);
      let response;
      try {
        response = await fetch(new URL("/api/prompts", baseUrl), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ stack }),
          signal: AbortSignal.timeout(5e3)
        });
      } catch (error) {
        throw new Error(`registry at ${baseUrl} not reachable: ${error.message}`, {
          cause: error
        });
      }
      if (response.status === 401) {
        throw new Error(`the registry rejected ${API_KEY_VAR}`);
      }
      if (!response.ok) {
        throw new Error(
          `registry at ${baseUrl} responded ${response.status} for /api/prompts`
        );
      }
      return response.text();
    }
    module2.exports = { fetchPrompts: fetchPrompts2 };
  }
});

// hooks/load-prompts.js
var { detectAndStore } = require_state();
var { fetchPrompts } = require_fetch_prompts();
async function main() {
  try {
    const prompts = await fetchPrompts(detectAndStore().stack);
    if (prompts) process.stdout.write(prompts + "\n");
  } catch (error) {
    const [reason] = error.message.split("\n");
    console.error(`forge: prompts not delivered: ${reason}`);
    process.exit(1);
  }
}
main();
