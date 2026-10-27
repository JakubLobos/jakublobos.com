import { z } from 'zod';

/** Names of the offending variables only; values may be secrets and are never included. */
export class ConfigError extends Error {
  readonly variables: readonly string[];

  constructor(variables: readonly string[]) {
    super(`Invalid configuration. Check these variables: ${variables.join(', ')}`);
    this.name = 'ConfigError';
    this.variables = variables;
  }
}

// Shells and `.env` files express "unset" as an empty string.
const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

const optionalText = z.preprocess(emptyToUndefined, z.string().trim().min(1).optional());

const withDefault = <T extends z.ZodType>(schema: T, fallback: z.input<T>) =>
  z.preprocess(emptyToUndefined, schema.prefault(fallback));

const intString = z.string().regex(/^\d+$/, 'must be an integer').transform(Number);

const corsOrigins = z.string().transform((raw, ctx) => {
  const origins = raw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '');
  if (origins.length === 0) {
    ctx.addIssue({ code: 'custom', message: 'at least one origin is required' });
    return z.NEVER;
  }
  for (const origin of origins) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      ctx.addIssue({ code: 'custom', message: 'not a valid origin' });
      return z.NEVER;
    }
    const schemeOk = parsed.protocol === 'http:' || parsed.protocol === 'https:';
    // origin === input rejects paths, trailing slashes, queries and credentials.
    if (!schemeOk || parsed.origin !== origin) {
      ctx.addIssue({ code: 'custom', message: 'must be scheme://host[:port] with no path' });
      return z.NEVER;
    }
  }
  return origins;
});

const hostnames = z.string().transform((raw, ctx) => {
  const items = raw
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item !== '');
  if (items.length === 0) {
    ctx.addIssue({ code: 'custom', message: 'at least one hostname is required' });
    return z.NEVER;
  }
  return items;
});

const envSchema = z.object({
  NODE_ENV: withDefault(z.enum(['development', 'test', 'production']), 'development'),
  HOST: withDefault(z.string().trim().min(1), '0.0.0.0'),
  PORT: withDefault(intString.pipe(z.int().min(1).max(65535)), '3000'),
  LOG_LEVEL: withDefault(z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']), 'info'),
  CORS_ALLOWED_ORIGINS: withDefault(corsOrigins, 'http://localhost:4321,http://localhost:8787'),
  CLIENT_IP_SOURCE: withDefault(z.enum(['socket', 'x-real-ip']), 'socket'),
  DATABASE_PATH: withDefault(z.string().trim().min(1), './data/portfolio.db'),

  MODERATION_PROVIDER: withDefault(z.enum(['openai', 'fake']), 'fake'),
  SUITABILITY_PROVIDER: withDefault(z.enum(['openai', 'fake']), 'fake'),
  OPENAI_API_KEY: optionalText,
  OPENAI_MODERATION_MODEL: withDefault(z.string().trim().min(1), 'omni-moderation-latest'),
  OPENAI_SUITABILITY_MODEL: withDefault(z.string().trim().min(1), 'gpt-5-nano'),
  MODERATION_TIMEOUT_MS: withDefault(intString.pipe(z.int().min(1)), '5000'),
  SUITABILITY_TIMEOUT_MS: withDefault(intString.pipe(z.int().min(1)), '10000'),
  MODERATION_SCORE_THRESHOLD: withDefault(
    z.string().transform(Number).pipe(z.number().gt(0).max(1)),
    '0.2',
  ),

  MAILER: withDefault(z.enum(['resend', 'console']), 'console'),
  RESEND_API_KEY: optionalText,
  MAIL_FROM: optionalText,
  CONTACT_RECIPIENT_EMAIL: z.preprocess(emptyToUndefined, z.email().optional()),

  CONTACT_PHONE: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .regex(/^\+[1-9]\d{6,14}$/, 'must be E.164')
      .optional(),
  ),
  HUMAN_VERIFIER: withDefault(z.enum(['turnstile', 'fake']), 'fake'),
  TURNSTILE_SECRET_KEY: optionalText,
  TURNSTILE_ALLOWED_HOSTNAMES: withDefault(hostnames, 'localhost'),
});

type Env = z.output<typeof envSchema>;

export interface Config {
  readonly nodeEnv: Env['NODE_ENV'];
  readonly isProduction: boolean;
  readonly host: string;
  readonly port: number;
  readonly logLevel: Env['LOG_LEVEL'];
  readonly corsAllowedOrigins: readonly string[];
  readonly clientIpSource: Env['CLIENT_IP_SOURCE'];
  readonly databasePath: string;
  readonly moderation: {
    readonly provider: Env['MODERATION_PROVIDER'];
    readonly model: string;
    readonly timeoutMs: number;
    readonly scoreThreshold: number;
  };
  readonly suitability: {
    readonly provider: Env['SUITABILITY_PROVIDER'];
    readonly model: string;
    readonly timeoutMs: number;
  };
  readonly openaiApiKey: string | undefined;
  readonly mail: {
    readonly mailer: Env['MAILER'];
    readonly resendApiKey: string | undefined;
    readonly from: string | undefined;
    readonly recipient: string | undefined;
  };
  readonly contactPhone: string | undefined;
  readonly humanVerifier: {
    readonly kind: Env['HUMAN_VERIFIER'];
    readonly turnstileSecretKey: string | undefined;
    readonly allowedHostnames: readonly string[];
  };
}

/** Cross-field rules. Returns offending variable names, never values. */
function crossFieldProblems(env: Env): string[] {
  const problems: string[] = [];
  const requireSet = (variable: string, value: string | undefined) => {
    if (value === undefined) problems.push(variable);
  };

  // A real provider always needs its credentials, in every environment.
  if (env.MODERATION_PROVIDER === 'openai' || env.SUITABILITY_PROVIDER === 'openai') {
    requireSet('OPENAI_API_KEY', env.OPENAI_API_KEY);
  }
  if (env.MAILER === 'resend') {
    requireSet('RESEND_API_KEY', env.RESEND_API_KEY);
    requireSet('MAIL_FROM', env.MAIL_FROM);
    requireSet('CONTACT_RECIPIENT_EMAIL', env.CONTACT_RECIPIENT_EMAIL);
  }
  if (env.HUMAN_VERIFIER === 'turnstile') {
    requireSet('TURNSTILE_SECRET_KEY', env.TURNSTILE_SECRET_KEY);
  }

  if (env.NODE_ENV === 'production') {
    if (env.MODERATION_PROVIDER === 'fake') problems.push('MODERATION_PROVIDER');
    if (env.SUITABILITY_PROVIDER === 'fake') problems.push('SUITABILITY_PROVIDER');
    if (env.MAILER === 'console') problems.push('MAILER');
    if (env.HUMAN_VERIFIER === 'fake') problems.push('HUMAN_VERIFIER');
    requireSet('OPENAI_API_KEY', env.OPENAI_API_KEY);
    requireSet('RESEND_API_KEY', env.RESEND_API_KEY);
    requireSet('MAIL_FROM', env.MAIL_FROM);
    requireSet('CONTACT_RECIPIENT_EMAIL', env.CONTACT_RECIPIENT_EMAIL);
    requireSet('CONTACT_PHONE', env.CONTACT_PHONE);
    requireSet('TURNSTILE_SECRET_KEY', env.TURNSTILE_SECRET_KEY);
    if (!env.CORS_ALLOWED_ORIGINS.every((origin) => origin.startsWith('https://'))) {
      problems.push('CORS_ALLOWED_ORIGINS');
    }
    // The unset default is `localhost`, so this also forces production to name its own host.
    if (env.TURNSTILE_ALLOWED_HOSTNAMES.includes('localhost')) {
      problems.push('TURNSTILE_ALLOWED_HOSTNAMES');
    }
  }
  return [...new Set(problems)];
}

/**
 * Parse and validate the API environment. Throws `ConfigError` naming variables only,
 * so the failure is safe to log (secrets never appear in the message).
 */
export function loadConfig(env: Readonly<Record<string, string | undefined>>): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const names = parsed.error.issues.map((issue) => String(issue.path[0] ?? 'ENV'));
    throw new ConfigError([...new Set(names)]);
  }
  const values = parsed.data;
  const problems = crossFieldProblems(values);
  if (problems.length > 0) throw new ConfigError(problems);

  return Object.freeze({
    nodeEnv: values.NODE_ENV,
    isProduction: values.NODE_ENV === 'production',
    host: values.HOST,
    port: values.PORT,
    logLevel: values.LOG_LEVEL,
    corsAllowedOrigins: Object.freeze(values.CORS_ALLOWED_ORIGINS),
    clientIpSource: values.CLIENT_IP_SOURCE,
    databasePath: values.DATABASE_PATH,
    moderation: Object.freeze({
      provider: values.MODERATION_PROVIDER,
      model: values.OPENAI_MODERATION_MODEL,
      timeoutMs: values.MODERATION_TIMEOUT_MS,
      scoreThreshold: values.MODERATION_SCORE_THRESHOLD,
    }),
    suitability: Object.freeze({
      provider: values.SUITABILITY_PROVIDER,
      model: values.OPENAI_SUITABILITY_MODEL,
      timeoutMs: values.SUITABILITY_TIMEOUT_MS,
    }),
    openaiApiKey: values.OPENAI_API_KEY,
    mail: Object.freeze({
      mailer: values.MAILER,
      resendApiKey: values.RESEND_API_KEY,
      from: values.MAIL_FROM,
      recipient: values.CONTACT_RECIPIENT_EMAIL,
    }),
    contactPhone: values.CONTACT_PHONE,
    humanVerifier: Object.freeze({
      kind: values.HUMAN_VERIFIER,
      turnstileSecretKey: values.TURNSTILE_SECRET_KEY,
      allowedHostnames: Object.freeze(values.TURNSTILE_ALLOWED_HOSTNAMES),
    }),
  });
}
