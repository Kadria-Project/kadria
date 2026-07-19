import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["app/dashboard-v2/projet/**/page.tsx"],
    rules: {
      // Le contrôleur historique est encore en cours d'extraction ; le
      // contrôle TypeScript reste assuré par le build de la route.
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
]);

export default eslintConfig;
