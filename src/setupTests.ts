import '@testing-library/jest-dom/vitest';
import { afterEach, expect } from 'vitest';
import { cleanup } from '@testing-library/react';
import { toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

// `test.globals` isn't enabled, so RTL's own auto-cleanup (which looks for a
// global `afterEach`) never registers — without this, renders from one test
// leak into the next within the same file.
afterEach(cleanup);
