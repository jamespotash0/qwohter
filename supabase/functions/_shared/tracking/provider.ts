/**
 * Which provider is in use.
 *
 * One place, read from the environment, so switching vendors is a secret change
 * and a redeploy rather than an edit spread across three functions.
 */

import { AfterShipProvider } from './aftership.ts';
import { EasyPostProvider } from './easypost.ts';
import { TrackingError, type ProviderName, type TrackingProvider } from './types.ts';

//@ts-ignore Deno global
const env = (key: string): string | undefined => Deno.env.get(key);

/**
 * The configured provider, or null when nothing is set up.
 *
 * Null rather than a throw: an organization that records shipments by hand is a
 * legitimate, fully working state, and the back office must not fall over
 * because nobody has bought a tracking subscription.
 */
export function getTrackingProvider(preferred?: ProviderName | null): TrackingProvider | null {
  const configured = (preferred ?? env('TRACKING_PROVIDER') ?? 'aftership') as ProviderName;

  if (configured === 'manual') return null;

  if (configured === 'easypost') {
    const key = env('EASYPOST_API_KEY');
    return key ? new EasyPostProvider(key) : null;
  }

  if (configured === 'aftership') {
    const key = env('AFTERSHIP_API_KEY');
    return key ? new AfterShipProvider(key, env('AFTERSHIP_API_VERSION') ?? '2025-07') : null;
  }

  throw new TrackingError(`Unknown tracking provider: ${configured}`);
}

/** Name of the configured provider, for storing on the shipment row. */
export function configuredProviderName(): ProviderName {
  return (env('TRACKING_PROVIDER') ?? 'aftership') as ProviderName;
}
