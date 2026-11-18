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
    function detectAndStore() {
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
    module2.exports = { detectAndStore, repoRoot };
  }
});

// fetch-prompts.js
var require_fetch_prompts = __commonJS({
  "fetch-prompts.js"(exports2, module2) {
    var API_KEY_VAR = "MANICODE_REGISTRY_API_KEY";
    var DEFAULT_REGISTRY_URL = "https://manicode-context-registry.fly.dev";
    async function fetchPrompts(stack) {
      if (stack.length === 0) return [];
      const baseUrl = process.env.MANICODE_REGISTRY_URL || DEFAULT_REGISTRY_URL;
      const apiKey = process.env[API_KEY_VAR];
      if (!apiKey) throw new Error(`${API_KEY_VAR} is not set`);
      let response;
      try {
        response = await fetch(new URL("/api/prompts", baseUrl), {
          method: "POST",
          headers: {
            Accept: "application/json",
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
      return response.json();
    }
    module2.exports = { fetchPrompts };
  }
});

// write-rule-files.js
var require_write_rule_files = __commonJS({
  "write-rule-files.js"(exports2, module2) {
    var {
      existsSync,
      mkdirSync,
      readdirSync,
      readFileSync,
      rmSync,
      writeFileSync
    } = require("fs");
    var { join } = require("path");
    var RULES_DIR = join(".claude", "rules", "forge");
    function writeRuleFiles(root, prompts) {
      const dir = join(root, RULES_DIR);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, ".gitignore"), "*\n");
      const wanted = new Map(
        prompts.map(({ technology, text }) => [`${technology}.md`, text])
      );
      let changed = false;
      for (const [name, text] of wanted) {
        const file = join(dir, name);
        if (existsSync(file) && readFileSync(file, "utf8") === text) continue;
        writeFileSync(file, text);
        changed = true;
      }
      for (const name of readdirSync(dir)) {
        if (name.endsWith(".md") && !wanted.has(name)) {
          rmSync(join(dir, name));
          changed = true;
        }
      }
      return changed;
    }
    module2.exports = { writeRuleFiles };
  }
});

// sync-prompts.js
var require_sync_prompts = __commonJS({
  "sync-prompts.js"(exports2, module2) {
    var { detectAndStore, repoRoot } = require_state();
    var { fetchPrompts } = require_fetch_prompts();
    var { writeRuleFiles } = require_write_rule_files();
    async function syncPrompts2() {
      const prompts = await fetchPrompts(detectAndStore().stack);
      return writeRuleFiles(repoRoot(), prompts);
    }
    module2.exports = { syncPrompts: syncPrompts2 };
  }
});

// hooks/load-prompts.js
var { syncPrompts } = require_sync_prompts();
var RELOAD_NOTICE = {
  systemMessage: "Manicode prompts updated. Run /clear to load them."
};
async function main() {
  try {
    if (await syncPrompts()) {
      process.stdout.write(JSON.stringify(RELOAD_NOTICE) + "\n");
    }
  } catch (error) {
    const [reason] = error.message.split("\n");
    console.error(`forge: prompts not delivered: ${reason}`);
    process.exit(1);
  }
}
main();
