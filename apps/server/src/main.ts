import { createApp } from './app.ts';
import { ConfigError, loadConfig, type Config } from './config.ts';
import type { HumanVerifier } from './domain/contact/human-verifier.port.ts';
import { createGuestbookService } from './domain/guestbook/guestbook.service.ts';
import { createReviewPipeline } from './domain/guestbook/review-pipeline.ts';
import {
  createRecentRejections,
  createReviewWorker,
  intervalScheduler,
} from './domain/guestbook/review-worker.ts';
import { systemClock } from './domain/shared/clock.ts';
import { uuidGenerator } from './domain/shared/ids.ts';
import { createHttpServer } from './http/server.ts';
import { openDatabase } from './infra/db/connection.ts';
import { createGuestbookRepository } from './infra/db/guestbook.repository.ts';
import { migrate } from './infra/db/migrate.ts';
import { createContactRoutes } from './http/routes/contact.routes.ts';
import { createGuestbookCap, createGuestbookRoutes } from './http/routes/guestbook.routes.ts';
import { createHealthRoutes } from './http/routes/health.routes.ts';
import { createPhoneRoutes } from './http/routes/phone.routes.ts';
import { createResumeRoutes } from './http/routes/resume.routes.ts';
import { sha256Hasher } from './infra/crypto/sha256.hasher.ts';
import { createFileResumeStore } from './infra/resume/file.resume-store.ts';
import { createReviewProviders } from './infra/review/index.ts';
import { createFakeVerifier } from './infra/verification/fake.verifier.ts';
import { createTurnstileVerifier } from './infra/verification/turnstile.verifier.ts';
import { createMailer } from './infra/mail/index.ts';
import { createLogger } from './logger.ts';
import { createShutdownManager } from './shutdown.ts';
import { installSignalHandlers } from './signals.ts';

const SHUTDOWN_DEADLINE_MS = 10_000;

function readConfig(): Config {
  try {
    return loadConfig(process.env);
  } catch (error) {
    // Variable names only: the message never contains values.
    const message =
      error instanceof ConfigError ? error.message : 'Configuration could not be loaded';
    console.error(message);
    process.exit(1);
  }
}

function createHumanVerifier(config: Config): HumanVerifier {
  const { kind, turnstileSecretKey, allowedHostnames } = config.humanVerifier;
  // Config refuses `fake` in production and requires the secret for `turnstile`.
  if (kind === 'fake') return createFakeVerifier();
  if (turnstileSecretKey === undefined) throw new Error('TURNSTILE_SECRET_KEY is required');
  return createTurnstileVerifier({
    secret: turnstileSecretKey,
    allowedHostnames,
    fetch,
    nextIdempotencyKey: () => uuidGenerator.next(),
  });
}

function main(): void {
  const config = readConfig();
  const logger = createLogger({ level: config.logLevel, pretty: config.nodeEnv === 'development' });

  const db = openDatabase(config.databasePath);
  migrate(db);
  const guestbookRepo = createGuestbookRepository(db);

  const recentRejections = createRecentRejections(systemClock);
  const guestbookWorker = createReviewWorker({
    repo: guestbookRepo,
    pipeline: createReviewPipeline({
      ...createReviewProviders(config, { fetch, clock: systemClock, logger }),
      moderationThreshold: config.moderation.scoreThreshold,
    }),
    clock: systemClock,
    scheduler: intervalScheduler,
    logger,
    recentRejections,
  });
  const guestbookService = createGuestbookService({
    repo: guestbookRepo,
    worker: guestbookWorker,
    hasher: sha256Hasher,
    ids: uuidGenerator,
    clock: systemClock,
    cap: createGuestbookCap(systemClock),
    recentRejections,
  });

  const verifier = createHumanVerifier(config);
  const app = createApp({
    logger,
    ids: uuidGenerator,
    isProduction: config.isProduction,
    corsAllowedOrigins: config.corsAllowedOrigins,
    routes: [
      createHealthRoutes({ checkDatabase: guestbookRepo.ping }),
      createContactRoutes({
        mailer: createMailer(config.mail, { fetch: globalThis.fetch, logger }),
        clientIpSource: config.clientIpSource,
      }),
      createGuestbookRoutes({
        service: guestbookService,
        clientIpSource: config.clientIpSource,
      }),
      createPhoneRoutes({
        verifier,
        phone: config.contactPhone,
        clientIpSource: config.clientIpSource,
      }),
      createResumeRoutes({
        verifier,
        store: createFileResumeStore(config.resumeDir),
        clientIpSource: config.clientIpSource,
      }),
    ],
  });

  const server = createHttpServer(app);
  server.listen(config.port, config.host, () => {
    logger.info({ port: config.port }, 'api listening');
    guestbookWorker.start();
  });

  const shutdown = createShutdownManager({
    timeoutMs: SHUTDOWN_DEADLINE_MS,
    onError: (error) => {
      logger.error({ err: error }, 'shutdown hook failed');
    },
  });
  // Registered before the server hook: hooks run in reverse, so the DB closes after requests drain.
  shutdown.onShutdown(() => {
    db.close();
  });
  // Registered after the DB hook, so it runs before it: the worker stops before the DB closes.
  shutdown.onShutdown(() => guestbookWorker.stop());
  shutdown.onShutdown(
    () =>
      new Promise<void>((resolve) => {
        server.close(() => {
          resolve();
        });
        server.closeIdleConnections();
      }),
  );

  installSignalHandlers(process, shutdown, {
    onSignal: (signal) => {
      logger.info({ signal }, 'shutting down');
    },
    flush: () => {
      logger.flush();
    },
  });
}

main();
