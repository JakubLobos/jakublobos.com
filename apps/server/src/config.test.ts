import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from './config.ts';

const productionEnv = {
  NODE_ENV: 'production',
  CORS_ALLOWED_ORIGINS: 'https://jakublobos.com',
  CLIENT_IP_SOURCE: 'x-real-ip',
  MODERATION_PROVIDER: 'openai',
  SUITABILITY_PROVIDER: 'openai',
  OPENAI_API_KEY: 'sk-test-secret-value',
  MAILER: 'resend',
  RESEND_API_KEY: 're_test_secret_value',
  MAIL_FROM: 'Portfolio <contact@example.com>',
  CONTACT_RECIPIENT_EMAIL: 'owner@example.com',
  CONTACT_PHONE: '+48000000000',
  HUMAN_VERIFIER: 'turnstile',
  TURNSTILE_SECRET_KEY: 'turnstile-secret-value',
  TURNSTILE_ALLOWED_HOSTNAMES: 'jakublobos.com',
};

function variablesOf(env: Record<string, string>): readonly string[] {
  try {
    loadConfig(env);
  } catch (error) {
    if (error instanceof ConfigError) return error.variables;
    throw error;
  }
  return [];
}

describe('loadConfig (development)', () => {
  it('loads with defaults from an empty environment', () => {
    const config = loadConfig({});
    expect(config).toMatchObject({
      nodeEnv: 'development',
      isProduction: false,
      host: '0.0.0.0',
      port: 3000,
      clientIpSource: 'socket',
      corsAllowedOrigins: ['http://localhost:4321', 'http://localhost:8787'],
      moderation: { provider: 'fake', scoreThreshold: 0.2 },
      mail: { mailer: 'console' },
      humanVerifier: { kind: 'fake', allowedHostnames: ['localhost'] },
    });
    expect(Object.isFrozen(config)).toBe(true);
  });

  it('treats empty strings like .env.example (PORT=, OPENAI_API_KEY=) as unset', () => {
    const config = loadConfig({ PORT: '', OPENAI_API_KEY: '', MAIL_FROM: '' });
    expect(config.port).toBe(3000);
    expect(config.openaiApiKey).toBeUndefined();
  });

  it('parses PORT and rejects garbage instead of picking a random port or NaN', () => {
    expect(loadConfig({ PORT: '4010' }).port).toBe(4010);
    expect(variablesOf({ PORT: 'abc' })).toEqual(['PORT']);
    expect(variablesOf({ PORT: '0' })).toEqual(['PORT']);
    expect(variablesOf({ PORT: '70000' })).toEqual(['PORT']);
  });

  it('parses the origin list and rejects paths, trailing slashes and other schemes', () => {
    expect(
      loadConfig({ CORS_ALLOWED_ORIGINS: ' http://localhost:4321 , https://a.example ' })
        .corsAllowedOrigins,
    ).toEqual(['http://localhost:4321', 'https://a.example']);
    expect(variablesOf({ CORS_ALLOWED_ORIGINS: 'https://a.example/' })).toEqual([
      'CORS_ALLOWED_ORIGINS',
    ]);
    expect(variablesOf({ CORS_ALLOWED_ORIGINS: 'https://a.example/path' })).toEqual([
      'CORS_ALLOWED_ORIGINS',
    ]);
    expect(variablesOf({ CORS_ALLOWED_ORIGINS: 'ftp://a.example' })).toEqual([
      'CORS_ALLOWED_ORIGINS',
    ]);
    expect(variablesOf({ CORS_ALLOWED_ORIGINS: 'not a url' })).toEqual(['CORS_ALLOWED_ORIGINS']);
  });

  it('rejects unknown enum values', () => {
    expect(variablesOf({ CLIENT_IP_SOURCE: 'forwarded' })).toEqual(['CLIENT_IP_SOURCE']);
    expect(variablesOf({ LOG_LEVEL: 'loud' })).toEqual(['LOG_LEVEL']);
  });

  it('requires credentials for any real provider, even in development', () => {
    expect(variablesOf({ MODERATION_PROVIDER: 'openai' })).toEqual(['OPENAI_API_KEY']);
    expect(variablesOf({ MAILER: 'resend' })).toEqual([
      'RESEND_API_KEY',
      'MAIL_FROM',
      'CONTACT_RECIPIENT_EMAIL',
    ]);
    expect(variablesOf({ HUMAN_VERIFIER: 'turnstile' })).toEqual(['TURNSTILE_SECRET_KEY']);
  });

  it('validates the phone as E.164 when present', () => {
    expect(loadConfig({ CONTACT_PHONE: '+48000000000' }).contactPhone).toBe('+48000000000');
    expect(variablesOf({ CONTACT_PHONE: '48 000 000 000' })).toEqual(['CONTACT_PHONE']);
  });
});

describe('loadConfig (production)', () => {
  it('accepts a complete production environment', () => {
    const config = loadConfig(productionEnv);
    expect(config.isProduction).toBe(true);
    expect(config.clientIpSource).toBe('x-real-ip');
  });

  it('refuses every fake provider and the console mailer', () => {
    const vars = variablesOf({
      ...productionEnv,
      MODERATION_PROVIDER: 'fake',
      SUITABILITY_PROVIDER: 'fake',
      MAILER: 'console',
      HUMAN_VERIFIER: 'fake',
    });
    expect(vars).toEqual(
      expect.arrayContaining([
        'MODERATION_PROVIDER',
        'SUITABILITY_PROVIDER',
        'MAILER',
        'HUMAN_VERIFIER',
      ]),
    );
  });

  it.each([
    'OPENAI_API_KEY',
    'RESEND_API_KEY',
    'MAIL_FROM',
    'CONTACT_RECIPIENT_EMAIL',
    'CONTACT_PHONE',
    'TURNSTILE_SECRET_KEY',
  ])('requires %s', (name) => {
    const env = Object.fromEntries(Object.entries(productionEnv).filter(([key]) => key !== name));
    expect(variablesOf(env)).toEqual([name]);
  });

  it.each([
    ['localhost', { TURNSTILE_ALLOWED_HOSTNAMES: 'jakublobos.com,localhost' }],
    ['unset (defaults to localhost)', { TURNSTILE_ALLOWED_HOSTNAMES: '' }],
  ])('rejects TURNSTILE_ALLOWED_HOSTNAMES that is %s', (_name, override) => {
    expect(variablesOf({ ...productionEnv, ...override })).toEqual(['TURNSTILE_ALLOWED_HOSTNAMES']);
  });

  it('rejects non-https CORS origins', () => {
    expect(
      variablesOf({
        ...productionEnv,
        CORS_ALLOWED_ORIGINS: 'https://jakublobos.com,http://localhost:4321',
      }),
    ).toEqual(['CORS_ALLOWED_ORIGINS']);
  });

  it('names variables but never prints values', () => {
    let message = '';
    try {
      loadConfig({
        ...productionEnv,
        MAILER: 'console',
        CORS_ALLOWED_ORIGINS: 'http://insecure.example',
      });
    } catch (error) {
      message = error instanceof Error ? error.message : '';
    }
    expect(message).toContain('MAILER');
    expect(message).toContain('CORS_ALLOWED_ORIGINS');
    for (const secret of [
      'sk-test-secret-value',
      're_test_secret_value',
      'turnstile-secret-value',
      'insecure.example',
    ]) {
      expect(message).not.toContain(secret);
    }
  });
});

describe('syntax errors', () => {
  it('name the variable without echoing its value', () => {
    let message = '';
    try {
      loadConfig({ PORT: 'secret-looking-port-value' });
    } catch (error) {
      message = error instanceof Error ? error.message : '';
    }
    expect(message).toContain('PORT');
    expect(message).not.toContain('secret-looking-port-value');
  });
});
