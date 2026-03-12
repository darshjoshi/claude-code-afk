import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import json from "@rollup/plugin-json";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectSrc = path.resolve(__dirname, "..", "src");

export default {
  input: "src/plugin.ts",
  output: {
    file: "com.claude.code-control.sdPlugin/bin/plugin.js",
    format: "esm",
    sourcemap: true,
  },
  plugins: [
    // Resolve ../../src/ imports from TS source to the project root's src/ directory
    {
      name: "resolve-parent-src",
      resolveId(source) {
        if (source.startsWith("../../src/")) {
          const relative = source.replace("../../src/", "");
          const resolved = path.join(projectSrc, relative);
          const withJs = resolved.endsWith(".js") ? resolved : resolved + ".js";
          return withJs;
        }
        return null;
      },
    },
    typescript({ tsconfig: "./tsconfig.json" }),
    resolve({ preferBuiltins: true }),
    commonjs(),
    json(),
  ],
  external: [
    "node:http",
    "node:events",
    "node:child_process",
    "node:path",
    "node:fs",
    "node:os",
    "node:url",
    "node:crypto",
    "node:net",
    "node:stream",
    "node:util",
    "http",
    "events",
    "child_process",
    "path",
    "fs",
    "os",
    "url",
    "crypto",
    "net",
    "stream",
    "util",
  ],
};
