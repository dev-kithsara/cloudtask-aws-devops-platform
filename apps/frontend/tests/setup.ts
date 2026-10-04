import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
Object.defineProperty(globalThis, 'confirm', { value: vi.fn(() => true), writable: true });
