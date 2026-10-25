import type { RequestHandler } from 'express';
import helmet from 'helmet';

export function securityHeaders(options: { readonly isProduction: boolean }): RequestHandler[] {
  const helmetHandler = helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    },
    frameguard: { action: 'deny' },
    // HSTS over plain-HTTP localhost is meaningless and sticky in browsers; production only.
    strictTransportSecurity: options.isProduction ? undefined : false,
  });
  // Responses are API data; routes that want revalidation caching (e.g. /latest) override this.
  const noStore: RequestHandler = (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  };
  return [helmetHandler, noStore];
}
