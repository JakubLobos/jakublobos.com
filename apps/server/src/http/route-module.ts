import type { Router } from 'express';

/** A feature's routes plus where they mount; `createApp` registers them after the shared pipeline. */
export interface RouteModule {
  readonly mountPath: string;
  readonly router: Router;
}
