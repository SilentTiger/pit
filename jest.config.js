module.exports = {
  preset: 'ts-jest/presets/js-with-ts',
  setupFiles: ["./test/setup.ts", "jest-canvas-mock"],
  testEnvironment: 'jsdom',
}
