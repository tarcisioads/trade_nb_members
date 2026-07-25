/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {}],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  collectCoverageFrom: [
    "src/core/services/**/*.{ts,tsx}",
    "src/application/services/**/*.{ts,tsx}",
    "src/infrastructure/telegram/**/*.{ts,tsx}",
    "src/infrastructure/database/TradeDatabase.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  coverageThreshold: {
    global: {
      branches: 25,
      functions: 30,
      lines: 35,
      statements: 35,
    },
  },
};