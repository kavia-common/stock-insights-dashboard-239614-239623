// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";

// Silence expected network-fallback warnings in unit tests.
// Individual tests can still assert on console output by mocking/spying if needed.
beforeAll(() => {
  jest.spyOn(console, "warn").mockImplementation(() => {});

  // Prevent accidental real network calls in Jest/jsdom which can cause ECONNREFUSED noise.
  // apiClient already falls back to mock data on fetch failure; this just makes it deterministic.
  global.fetch = jest.fn(() => Promise.reject(new Error("Network disabled in Jest test environment")));
});

afterAll(() => {
  console.warn.mockRestore?.();

  // Cleanup our fetch stub if something else relies on it later.
  // (CRA/Jest environment recreates between files, but this is safe.)
  delete global.fetch;
});
