# Mobile testing guide

Quick reference for the Jest + React Native Testing Library setup in `app/mobile/`.

## Stack

- **Runner:** `jest` 29 via the `jest-expo` preset (Expo SDK 54, RN 0.81, React 19).
- **Renderer:** `@testing-library/react-native` 13 (+ `react-test-renderer` 19).
- **Config:** `jest` block in `package.json` — no separate `jest.config.js`.
- **Coverage scope:** `src/**/*.{ts,tsx}`, excluding `src/mocks/**`.
- **Test layout:** all tests live under `__tests__/` mirroring `src/` (`__tests__/components/`, `__tests__/screens/`, `__tests__/services/`, `__tests__/utils/`).

`__tests__/smoke.test.tsx` is the harness sanity check — keep it green.

## Running tests

```bash
cd app/mobile

# Whole suite
npx jest

# A single file
npx jest __tests__/services/passportActionService.test.ts

# By test name (regex)
npx jest -t "POSTs to the passport try endpoint"

# Watch mode while editing
npx jest --watch

# Coverage report (writes to coverage/)
npx jest --coverage

# Update snapshots after intentional UI changes
npx jest -u
```

## Debugging

Attach a Node inspector (Chrome DevTools → `chrome://inspect`, or VS Code):

```bash
node --inspect-brk node_modules/.bin/jest --runInBand __tests__/components/PassportWorldMap.test.tsx
```

`--runInBand` keeps everything on one worker so breakpoints behave. Add `debugger;` statements or set breakpoints in the inspector once it attaches.

For noisy failures, `npx jest --verbose <path>` prints each `it()` line.

## Mocking conventions

We mock per-file (no global `__mocks__/` directory) so each test owns its boundaries explicitly. Patterns currently in use:

### `httpClient`

Service tests stub the HTTP layer rather than hitting the network:

```ts
import { apiPostJson } from '../../src/services/httpClient';

jest.mock('../../src/services/httpClient', () => ({
  apiPostJson: jest.fn(),
  apiGetJson: jest.fn(),
}));

const mockedPost = apiPostJson as jest.MockedFunction<typeof apiPostJson>;
beforeEach(() => mockedPost.mockReset());
```

This also sidesteps `AsyncStorage` (which `httpClient` reaches for to load the auth token), so service tests do not need an `AsyncStorage` mock.

### `react-native-maps`

The native module cannot load under Jest. Tests that render map components mock it inline with plain RN views and forward the props they assert on:

```ts
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MapView = React.forwardRef(({ children, ...rest }: any, ref: any) =>
    React.createElement(View, { ref, ...rest, testID: rest.testID ?? 'mock-map' }, children),
  );
  const Marker = (props: any) =>
    React.createElement(View, { testID: props.testID ?? `marker-${props.title ?? ''}` });
  return { __esModule: true, default: MapView, Marker, Callout: View };
});
```

See `__tests__/components/PassportWorldMap.test.tsx` for the full pattern.

### Expo modules (`expo-av`, `expo-image-picker`, `expo-clipboard`)

`jest-expo` handles most Expo modules out of the box. If a new test pulls in one of these and crashes on a native call, mock the specific function inline:

```ts
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
```

Prefer narrow mocks over replacing the whole module.

## Writing new tests

- One test file per service / component / util, mirroring the `src/` path.
- Pure utilities (`src/utils/*`) get unit tests against the function directly — no rendering.
- Components: render with `@testing-library/react-native` and assert against `getByText` / `getByTestId` / accessibility roles rather than snapshotting whole trees.
- Service tests: mock `httpClient` exports as above and assert on URL + payload + parsed return value, including the empty-body fallback case where relevant.
- Reset mocks between cases (`beforeEach(() => fn.mockReset())`) so order does not leak state.

## CI

`npx jest` runs in CI from `app/mobile`. Keep it green; a failing mobile suite blocks merge.
