import type { Store } from "./storage.js";

export function pruneExpired(s: Store, now = Date.now()) {
  s.db
    .transaction(() => {
      s.run(
        "DELETE FROM operation_key WHERE expires_at_ms<=? OR principal_key IN (SELECT id FROM viewer_session WHERE expires_at_ms<=?) OR principal_key IN (SELECT id FROM owner_session WHERE expires_at_ms<=? OR revoked_at_ms IS NOT NULL)",
        now,
        now,
        now,
      );
      s.run("DELETE FROM viewer_session WHERE expires_at_ms<=?", now);
      s.run(
        "DELETE FROM owner_session WHERE expires_at_ms<=? OR revoked_at_ms IS NOT NULL",
        now,
      );
      s.run("DELETE FROM oauth_state WHERE expires_at_ms<=?", now);
      s.run(
        "DELETE FROM overlay_key WHERE expires_at_ms<=? OR revoked_at_ms IS NOT NULL",
        now,
      );
      s.run(
        "DELETE FROM audit_event WHERE created_at_ms<?",
        now - 7 * 86400000,
      );
    })
    .immediate();
}
