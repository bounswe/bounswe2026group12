/**
 * Client-side validation for auth forms.
 * Web (`LoginPage` / `RegisterPage`) only checks required fields; mobile adds light format rules.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LoginFieldErrors = Partial<Record<'email' | 'password', string>>;
export type RegisterFieldErrors = Partial<
  Record<'username' | 'email' | 'password', string>
>;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

const PASSWORD_MIN_LENGTH = 8;

export function validateLoginForm(email: string, password: string): LoginFieldErrors {
  const errs: LoginFieldErrors = {};
  const e = email.trim();
  if (!e) errs.email = 'Email is required';
  else if (!isValidEmail(e)) errs.email = 'Enter a valid email address';
  if (!password) errs.password = 'Password is required';
  return errs;
}

export function validateRegisterForm(
  username: string,
  email: string,
  password: string
): RegisterFieldErrors {
  const errs: RegisterFieldErrors = {};
  const u = username.trim();
  const em = email.trim();
  if (!u) errs.username = 'Username is required';
  else if (u.length < 2) errs.username = 'Username must be at least 2 characters';
  if (!em) errs.email = 'Email is required';
  else if (!isValidEmail(em)) errs.email = 'Enter a valid email address';
  if (!password) errs.password = 'Password is required';
  else if (password.length < PASSWORD_MIN_LENGTH) {
    errs.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  return errs;
}
