export const ADMIN_SESSION_COOKIE = 'admin_session';

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || 'icpc2024camp';
}

function getAdminSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.WEBHOOK_SECRET || 'icpc-camp-admin-session';
}

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function createAdminSessionToken() {
  return sha256Hex(`${getAdminPassword()}:${getAdminSessionSecret()}`);
}

export async function verifyAdminPassword(password: string) {
  return password === getAdminPassword();
}

export async function verifyAdminSessionToken(token?: string | null) {
  if (!token) return false;
  return token === await createAdminSessionToken();
}
