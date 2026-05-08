/**
 * Stand-in for web `authService` (`loginRequest` / `registerRequest`).
 * Replace with real HTTP calls to `${API}/api/auth/login/` and `/register/` when backend is ready.
 */

export type AuthUser = {
  id: string;
  username: string;
  email: string;
};

export type AuthSuccess = {
  access: string;
  user: AuthUser;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stableNumericId(input: string): string {
  const s = input.trim().toLowerCase();
  // Reserve a known author account for demos/tests.
  if (s === 'demo_chef') return '101';

  // Deterministic hash -> id range [200..999] to avoid colliding with reserved ids.
  let hash = 5381;
  for (let i = 0; i < s.length; i += 1) {
    hash = ((hash << 5) + hash) ^ s.charCodeAt(i); // djb2-xor
  }
  const n = 200 + (Math.abs(hash) % 800);
  return String(n === 101 ? 102 : n);
}

/** Use password `wrong` or email containing `fail@` to simulate API failure. */
export async function mockLoginRequest(
  email: string,
  password: string
): Promise<AuthSuccess> {
  await delay(450);
  const e = email.trim().toLowerCase();
  if (password === 'wrong' || e.includes('fail@')) {
    throw new Error('Login failed');
  }
  const local = e.split('@')[0] || 'user';
  return {
    access: `mock-jwt-${Date.now()}`,
    user: {
      id: stableNumericId(local),
      username: local,
      email: email.trim(),
    },
  };
}

/** Use username `taken` to simulate registration conflict. */
export async function mockRegisterRequest(
  username: string,
  email: string,
  password: string
): Promise<AuthSuccess> {
  await delay(450);
  if (username.trim().toLowerCase() === 'taken') {
    throw new Error('Registration failed');
  }
  const u = username.trim();
  return {
    access: `mock-jwt-${Date.now()}`,
    user: {
      id: stableNumericId(u),
      username: u,
      email: email.trim(),
    },
  };
}
