/**
 * Vitest Global Test Setup
 *
 * This file runs before all tests and sets up the testing environment.
 * - Mocks for browser APIs not available in jsdom
 * - Global test utilities
 * - Cleanup between tests
 */

import '@testing-library/jest-dom';
import { vi, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Reset mocks before each test
beforeEach(() => {
  vi.resetModules();
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn((key: string) => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
  takeRecords: vi.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

// Mock URL.createObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(() => 'mock-url'),
});

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn(),
});

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
});

// Suppress console warnings in tests (optional - remove if you want to see warnings)
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  // Filter out specific noisy warnings
  const message = args[0];
  if (
    typeof message === 'string' &&
    (message.includes('React Router') || message.includes('act(...)'))
  ) {
    return;
  }
  originalWarn.apply(console, args);
};
