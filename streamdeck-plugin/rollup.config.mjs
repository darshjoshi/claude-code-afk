import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import json from "@rollup/plugin-json";

export default {
  input: "src/plugin.ts",
  output: {
    file: "com.claude-code.afk.sdPlugin/bin/plugin.js",
    format: "esm",
    sourcemap: true,
  },
  external: [],
  plugins: [
    typescript({ tsconfig: "./tsconfig.json" }),
    resolve({ preferBuiltins: true }),
    commonjs(),
    json(),
  ],
};
