import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import reactPlugin from "eslint-plugin-react";

const eslintConfig = defineConfig([
  // Global ignores must be in a separate config object with ONLY ignores property
  {
    ignores: [
      // Default ignores of eslint-config-next:
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Development tooling scripts
      "dev-tools/**",
      // Test coverage reports
      "coverage/**",
      // Documentation
      "docs/**",
      // AI wizard features (not currently in use - will revisit later)
      "app/admin/pages/new/wizard/**",
      "app/admin/pages/edit/[id]/**",
      "app/api/admin/pages/generate-about/**",
      // Menu builder mock/prototype directories
      "app/admin/menu-builder-mock/**",
      "app/admin/menu-builder-mock2/**",
      // Temporary scratchpad and screenshot scripts
      ".scratch/**",
      ".scratchpad/**",
      ".screenshots/**",
      "scratchpad/**",
    ],
  },
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      "react-hooks": reactHooksPlugin,
      react: reactPlugin,
    },
    rules: {
      // STRICT: Prevent 'any' type - force proper typing
      "@typescript-eslint/no-explicit-any": "error",

      // STRICT: Prevent setState in useEffect - causes cascading renders
      "react-hooks/set-state-in-effect": "error",

      // STRICT: Prevent creating components during render
      "react-hooks/static-components": "error",

      // Enforce exhaustive dependencies in useEffect (warning until all violations fixed)
      "react-hooks/exhaustive-deps": "warn",

      // STRICT: Prevent unescaped entities in JSX
      "react/no-unescaped-entities": "error",

      // STRICT: Enforce Next.js Link component for internal navigation
      "@next/next/no-html-link-for-pages": "error",

      // Keep unused vars as warnings (cleanup task, not blocking)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none", // Allow unused error variables in catch blocks
        },
      ],
    },
  },
]);

export default eslintConfig;
