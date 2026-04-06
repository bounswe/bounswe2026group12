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
      id: '1',
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
  return {
    access: `mock-jwt-${Date.now()}`,
    user: {
      id: '2',
      username: username.trim(),
      email: email.trim(),
    },
  };
}
