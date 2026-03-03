import crypto from "crypto";

export const SESSION_COOKIE_NAME = "absen_admin_session";

type SessionPayload = {
  name: string;
  exp: number;
};

function toBase64Url(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function fromBase64Url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function getSessionSecret() {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing APP_SESSION_SECRET environment variable");
  }
  return secret;
}

function sign(data: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

export function createSessionToken(name: string, ttlSeconds = 60 * 60 * 12) {
  const payload: SessionPayload = {
    name,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = toBase64Url(JSON.stringify(payload));
  const signature = sign(encoded, getSessionSecret());
  return `${encoded}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const secret = getSessionSecret();
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded, secret);
  const sigA = Buffer.from(signature);
  const sigB = Buffer.from(expected);
  if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encoded)) as SessionPayload;
    if (!payload?.name || !payload?.exp) return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
