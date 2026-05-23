import { SetMetadata } from '@nestjs/common';

/**
 * Marks a handler as runnable even when the caller's tenant is suspended or
 * their office is inactive. The TenantStatusGuard reads this metadata and
 * skips the suspension check.
 *
 * Use sparingly — every exempt endpoint is one more thing a suspended user
 * can still hit. Today's allowlist:
 *   - `GET /auth/me`        — render the "החשבון מושעה" screen
 *   - `POST /auth/logout`   — clear cookies even when suspended
 *   - `GET /billing/usage`  — show how much is owed (future)
 *   - `POST /billing/pay`   — settle the bill (future)
 */
export const ALLOW_SUSPENDED_KEY = 'allowSuspended';
export const AllowSuspended = () => SetMetadata(ALLOW_SUSPENDED_KEY, true);
