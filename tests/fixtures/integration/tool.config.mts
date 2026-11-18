// Not linted: the integration flat config only sets the TypeScript parser for .tsx, and the plugin's
// flat configs must not pull this file in (tests/integration/cli.test.ts, "`eslint .` does not crash").
const retries: number = 2;
export default { retries };
