import { createGunsoleClient } from "gunsole-js";

const debugFetch: typeof fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const headers = init?.headers as Record<string, string> | undefined;
  console.log(`\n>>> FETCH ${init?.method ?? "GET"} ${url}`);
  console.log(`>>> Headers:`, JSON.stringify(headers, null, 2));
  try {
    const res = await fetch(input, init);
    const body = await res.clone().text();
    console.log(`<<< ${res.status} ${res.statusText}`);
    if (body) console.log(`<<< Body: ${body}`);
    return res;
  } catch (err) {
    console.error(`<<< NETWORK ERROR:`, err);
    throw err;
  }
};

const gunsole = createGunsoleClient({
  projectId: "log-blaster-test",
  apiKey: "test-api-key",
  mode: "local",
  appName: "log-blaster",
  appVersion: "1.0.0",
  env: "development",
  batchSize: 25,
  flushInterval: 2000,
  defaultTags: { source: "log-blaster" },
  fetch: debugFetch,
});

gunsole.setUser({
  id: "user-42",
  email: "blaster@gunsole.dev",
  name: "Log Blaster",
});

gunsole.setSessionId(`session-${Date.now()}`);

// --- Log definitions ---

const buckets = [
  "auth",
  "api",
  "ui",
  "database",
  "payment",
  "notification",
  "cache",
  "scheduler",
  "analytics",
  "security",
];

const logs: Array<{
  level: "info" | "debug" | "warn" | "error";
  bucket: string;
  message: string;
  context?: Record<string, unknown>;
  tags?: Record<string, string>;
}> = [
  // Auth
  { level: "info", bucket: "auth", message: "User login successful", context: { method: "oauth2", provider: "google" }, tags: { flow: "login" } },
  { level: "info", bucket: "auth", message: "Session token refreshed", context: { ttl: 3600 }, tags: { flow: "refresh" } },
  { level: "warn", bucket: "auth", message: "Login attempt with expired token", context: { tokenAge: 86400 }, tags: { flow: "login" } },
  { level: "error", bucket: "auth", message: "OAuth callback failed", context: { error: "invalid_grant", provider: "github" }, tags: { flow: "oauth" } },
  { level: "debug", bucket: "auth", message: "Password hash comparison complete", context: { algorithm: "bcrypt", rounds: 12 }, tags: { flow: "login" } },
  { level: "info", bucket: "auth", message: "User logout", context: { reason: "manual" }, tags: { flow: "logout" } },
  { level: "warn", bucket: "auth", message: "Rate limit approaching for login endpoint", context: { current: 95, limit: 100 }, tags: { flow: "rate-limit" } },
  { level: "error", bucket: "auth", message: "MFA verification failed after 3 attempts", context: { method: "totp" }, tags: { flow: "mfa" } },
  { level: "info", bucket: "auth", message: "New API key generated", context: { scope: "read-only" }, tags: { flow: "api-key" } },
  { level: "debug", bucket: "auth", message: "JWT claims validated", context: { iss: "gunsole", aud: "api" }, tags: { flow: "jwt" } },

  // API
  { level: "info", bucket: "api", message: "GET /api/users completed", context: { status: 200, duration: 45 }, tags: { method: "GET", path: "/api/users" } },
  { level: "info", bucket: "api", message: "POST /api/orders created", context: { status: 201, orderId: "ord_123" }, tags: { method: "POST", path: "/api/orders" } },
  { level: "warn", bucket: "api", message: "Slow query detected on /api/reports", context: { duration: 3200, threshold: 1000 }, tags: { method: "GET", path: "/api/reports" } },
  { level: "error", bucket: "api", message: "Internal server error on /api/checkout", context: { status: 500, error: "connection_refused" }, tags: { method: "POST", path: "/api/checkout" } },
  { level: "debug", bucket: "api", message: "Request body parsed", context: { contentType: "application/json", size: 1024 }, tags: { method: "POST" } },
  { level: "info", bucket: "api", message: "DELETE /api/sessions/:id completed", context: { status: 204 }, tags: { method: "DELETE", path: "/api/sessions" } },
  { level: "warn", bucket: "api", message: "Deprecated endpoint called: /api/v1/users", context: { sunset: "2025-06-01" }, tags: { version: "v1" } },
  { level: "error", bucket: "api", message: "Request payload too large", context: { size: 10485760, limit: 5242880 }, tags: { method: "POST", path: "/api/upload" } },
  { level: "info", bucket: "api", message: "GraphQL query resolved", context: { operationName: "GetDashboard", duration: 120 }, tags: { type: "graphql" } },
  { level: "debug", bucket: "api", message: "CORS preflight handled", context: { origin: "https://app.example.com" }, tags: { method: "OPTIONS" } },

  // UI
  { level: "info", bucket: "ui", message: "Page view: Dashboard", context: { route: "/dashboard", loadTime: 230 }, tags: { page: "dashboard" } },
  { level: "info", bucket: "ui", message: "Button clicked: Submit Order", context: { component: "OrderForm", position: "footer" }, tags: { action: "click" } },
  { level: "warn", bucket: "ui", message: "Component render took too long", context: { component: "DataTable", renderTime: 800, threshold: 200 }, tags: { perf: "slow" } },
  { level: "error", bucket: "ui", message: "Unhandled React error boundary triggered", context: { component: "UserProfile", error: "Cannot read property 'name' of null" }, tags: { framework: "react" } },
  { level: "debug", bucket: "ui", message: "Form state updated", context: { form: "checkout", fields: 8, valid: true }, tags: { action: "input" } },
  { level: "info", bucket: "ui", message: "Modal opened: Confirm Delete", context: { trigger: "button", itemType: "project" }, tags: { action: "modal" } },
  { level: "info", bucket: "ui", message: "Theme switched to dark mode", context: { previous: "light" }, tags: { action: "settings" } },
  { level: "warn", bucket: "ui", message: "Image failed to load", context: { src: "/assets/avatar.png", status: 404 }, tags: { resource: "image" } },
  { level: "error", bucket: "ui", message: "WebSocket connection dropped", context: { code: 1006, reconnectAttempt: 3 }, tags: { transport: "ws" } },
  { level: "debug", bucket: "ui", message: "Virtual scroll recalculated", context: { totalItems: 10000, visibleItems: 50 }, tags: { perf: "virtualization" } },

  // Database
  { level: "info", bucket: "database", message: "Query executed: SELECT users", context: { rows: 150, duration: 12 }, tags: { table: "users" } },
  { level: "info", bucket: "database", message: "Migration applied: add_index_orders_date", context: { version: "20250101_001" }, tags: { operation: "migration" } },
  { level: "warn", bucket: "database", message: "Connection pool nearing limit", context: { active: 18, max: 20 }, tags: { resource: "pool" } },
  { level: "error", bucket: "database", message: "Deadlock detected on orders table", context: { transaction1: "txn_abc", transaction2: "txn_def" }, tags: { table: "orders" } },
  { level: "debug", bucket: "database", message: "Query plan analyzed", context: { type: "index_scan", cost: 0.42 }, tags: { table: "products" } },
  { level: "info", bucket: "database", message: "Backup completed successfully", context: { size: "2.3GB", duration: 45000 }, tags: { operation: "backup" } },
  { level: "warn", bucket: "database", message: "Replication lag detected", context: { lag: 1500, threshold: 1000 }, tags: { operation: "replication" } },
  { level: "error", bucket: "database", message: "Constraint violation on insert", context: { table: "users", constraint: "unique_email" }, tags: { operation: "insert" } },
  { level: "info", bucket: "database", message: "Index rebuilt: idx_orders_created_at", context: { duration: 8200, rows: 500000 }, tags: { operation: "maintenance" } },
  { level: "debug", bucket: "database", message: "Transaction committed", context: { id: "txn_xyz", operations: 5 }, tags: { operation: "transaction" } },

  // Payment
  { level: "info", bucket: "payment", message: "Payment processed successfully", context: { amount: 99.99, currency: "USD", gateway: "stripe" }, tags: { status: "success" } },
  { level: "info", bucket: "payment", message: "Refund initiated", context: { amount: 25.00, orderId: "ord_456", reason: "defective" }, tags: { status: "refund" } },
  { level: "warn", bucket: "payment", message: "Payment gateway response slow", context: { gateway: "stripe", duration: 5200, threshold: 3000 }, tags: { perf: "slow" } },
  { level: "error", bucket: "payment", message: "Payment declined", context: { reason: "insufficient_funds", lastFour: "4242" }, tags: { status: "declined" } },
  { level: "debug", bucket: "payment", message: "Webhook signature verified", context: { event: "payment_intent.succeeded" }, tags: { source: "webhook" } },
  { level: "info", bucket: "payment", message: "Subscription renewed", context: { plan: "pro", amount: 29.99, period: "monthly" }, tags: { type: "subscription" } },
  { level: "warn", bucket: "payment", message: "Duplicate payment attempt blocked", context: { idempotencyKey: "idk_abc123" }, tags: { security: "duplicate" } },
  { level: "error", bucket: "payment", message: "Currency conversion failed", context: { from: "EUR", to: "USD", provider: "exchangerates" }, tags: { operation: "conversion" } },
  { level: "info", bucket: "payment", message: "Invoice generated", context: { invoiceId: "inv_789", total: 149.97 }, tags: { type: "invoice" } },
  { level: "debug", bucket: "payment", message: "Tax calculation completed", context: { subtotal: 99.99, tax: 8.00, rate: 0.08 }, tags: { operation: "tax" } },

  // Notification
  { level: "info", bucket: "notification", message: "Email sent: Welcome", context: { to: "user@example.com", template: "welcome" }, tags: { channel: "email" } },
  { level: "info", bucket: "notification", message: "Push notification delivered", context: { title: "Order shipped", platform: "ios" }, tags: { channel: "push" } },
  { level: "warn", bucket: "notification", message: "SMS delivery delayed", context: { provider: "twilio", delay: 12000 }, tags: { channel: "sms" } },
  { level: "error", bucket: "notification", message: "Email bounce: invalid address", context: { to: "bad@invalid.xyz", bounceType: "hard" }, tags: { channel: "email" } },
  { level: "debug", bucket: "notification", message: "Notification preferences loaded", context: { userId: "user-42", channels: ["email", "push"] }, tags: { operation: "preferences" } },
  { level: "info", bucket: "notification", message: "Batch email queued", context: { template: "weekly-digest", recipients: 1500 }, tags: { channel: "email" } },
  { level: "warn", bucket: "notification", message: "Push token expired for device", context: { platform: "android", tokenAge: 90 }, tags: { channel: "push" } },
  { level: "error", bucket: "notification", message: "Webhook delivery failed after retries", context: { url: "https://hooks.example.com/notify", attempts: 3 }, tags: { channel: "webhook" } },
  { level: "info", bucket: "notification", message: "In-app notification created", context: { type: "mention", targetUser: "user-99" }, tags: { channel: "in-app" } },
  { level: "debug", bucket: "notification", message: "Template rendered", context: { template: "order-confirmation", variables: 12 }, tags: { operation: "render" } },

  // Cache
  { level: "info", bucket: "cache", message: "Cache hit: user_profile_42", context: { ttl: 300, age: 45 }, tags: { operation: "hit" } },
  { level: "info", bucket: "cache", message: "Cache miss: product_listing_all", context: { key: "product_listing_all" }, tags: { operation: "miss" } },
  { level: "warn", bucket: "cache", message: "Cache memory usage high", context: { used: "950MB", limit: "1024MB", utilization: 0.93 }, tags: { resource: "memory" } },
  { level: "error", bucket: "cache", message: "Redis connection refused", context: { host: "redis.internal", port: 6379 }, tags: { backend: "redis" } },
  { level: "debug", bucket: "cache", message: "Cache key evicted (LRU)", context: { key: "old_report_data", age: 86400 }, tags: { operation: "eviction" } },
  { level: "info", bucket: "cache", message: "Cache warmed: homepage data", context: { keys: 25, duration: 340 }, tags: { operation: "warm" } },
  { level: "warn", bucket: "cache", message: "Cache stampede detected", context: { key: "popular_products", concurrent: 50 }, tags: { operation: "stampede" } },
  { level: "error", bucket: "cache", message: "Serialization error on cache write", context: { key: "complex_object", error: "circular reference" }, tags: { operation: "write" } },
  { level: "info", bucket: "cache", message: "Cache cluster rebalanced", context: { nodes: 3, migratedKeys: 1200 }, tags: { operation: "rebalance" } },
  { level: "debug", bucket: "cache", message: "TTL refreshed on access", context: { key: "session_data_42", newTtl: 1800 }, tags: { operation: "touch" } },

  // Scheduler
  { level: "info", bucket: "scheduler", message: "Cron job started: daily-cleanup", context: { schedule: "0 2 * * *" }, tags: { job: "daily-cleanup" } },
  { level: "info", bucket: "scheduler", message: "Cron job completed: daily-cleanup", context: { duration: 12500, itemsProcessed: 340 }, tags: { job: "daily-cleanup" } },
  { level: "warn", bucket: "scheduler", message: "Job execution exceeded timeout", context: { job: "report-generator", duration: 120000, timeout: 60000 }, tags: { job: "report-generator" } },
  { level: "error", bucket: "scheduler", message: "Job failed: email-digest", context: { error: "SMTP connection timeout", attempt: 1 }, tags: { job: "email-digest" } },
  { level: "debug", bucket: "scheduler", message: "Next run calculated", context: { job: "sync-inventory", nextRun: "2025-01-15T03:00:00Z" }, tags: { job: "sync-inventory" } },
  { level: "info", bucket: "scheduler", message: "Worker pool scaled up", context: { previous: 2, current: 5, reason: "queue_depth" }, tags: { resource: "workers" } },
  { level: "warn", bucket: "scheduler", message: "Job queue depth growing", context: { depth: 150, threshold: 100 }, tags: { resource: "queue" } },
  { level: "error", bucket: "scheduler", message: "Dead letter queue overflow", context: { size: 1000, maxSize: 1000 }, tags: { resource: "dlq" } },
  { level: "info", bucket: "scheduler", message: "Scheduled maintenance window started", context: { window: "02:00-04:00 UTC" }, tags: { operation: "maintenance" } },
  { level: "debug", bucket: "scheduler", message: "Job lock acquired", context: { job: "data-export", lockTtl: 300 }, tags: { operation: "lock" } },

  // Analytics
  { level: "info", bucket: "analytics", message: "Event tracked: page_view", context: { page: "/pricing", referrer: "google.com" }, tags: { event: "page_view" } },
  { level: "info", bucket: "analytics", message: "Conversion recorded", context: { funnel: "signup", step: "complete", value: 0 }, tags: { event: "conversion" } },
  { level: "warn", bucket: "analytics", message: "Event batch approaching size limit", context: { current: 950, limit: 1000 }, tags: { resource: "batch" } },
  { level: "error", bucket: "analytics", message: "Failed to send events to analytics provider", context: { provider: "mixpanel", error: "rate_limited" }, tags: { provider: "mixpanel" } },
  { level: "debug", bucket: "analytics", message: "User segment evaluated", context: { segment: "power_users", matched: true, criteria: 5 }, tags: { operation: "segmentation" } },
  { level: "info", bucket: "analytics", message: "A/B test exposure logged", context: { experiment: "new-checkout", variant: "B" }, tags: { event: "experiment" } },
  { level: "warn", bucket: "analytics", message: "Sampling rate adjusted due to volume", context: { previous: 1.0, current: 0.1, reason: "high_volume" }, tags: { operation: "sampling" } },
  { level: "error", bucket: "analytics", message: "Data pipeline lag exceeds SLA", context: { lag: 300, sla: 60, pipeline: "events-to-warehouse" }, tags: { infra: "pipeline" } },
  { level: "info", bucket: "analytics", message: "Daily report generated", context: { metrics: 15, period: "2025-01-14" }, tags: { operation: "reporting" } },
  { level: "debug", bucket: "analytics", message: "Feature flag evaluated", context: { flag: "dark_mode_v2", enabled: true, source: "remote" }, tags: { operation: "feature-flag" } },

  // Security
  { level: "info", bucket: "security", message: "Access granted to resource", context: { resource: "/admin/users", role: "admin" }, tags: { action: "access" } },
  { level: "info", bucket: "security", message: "Password changed successfully", context: { userId: "user-42" }, tags: { action: "password-change" } },
  { level: "warn", bucket: "security", message: "Suspicious login from new location", context: { ip: "203.0.113.42", country: "XX", previousCountry: "US" }, tags: { action: "anomaly" } },
  { level: "error", bucket: "security", message: "Brute force attack detected", context: { ip: "198.51.100.1", attempts: 50, window: 60 }, tags: { action: "attack" } },
  { level: "debug", bucket: "security", message: "RBAC permission check", context: { user: "user-42", permission: "write:orders", result: "allow" }, tags: { action: "rbac" } },
  { level: "info", bucket: "security", message: "Audit log exported", context: { format: "csv", records: 5000, period: "2025-01" }, tags: { action: "audit" } },
  { level: "warn", bucket: "security", message: "SSL certificate expiring soon", context: { domain: "api.example.com", daysRemaining: 7 }, tags: { infra: "ssl" } },
  { level: "error", bucket: "security", message: "CSRF token validation failed", context: { endpoint: "/api/transfer", method: "POST" }, tags: { action: "csrf" } },
  { level: "info", bucket: "security", message: "IP allowlist updated", context: { added: 2, removed: 1, total: 15 }, tags: { action: "allowlist" } },
  { level: "debug", bucket: "security", message: "Request signature verified", context: { algorithm: "HMAC-SHA256", valid: true }, tags: { action: "signature" } },
];

// --- Fire logs ---

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const delaySec = parseFloat(args[0] ?? "0");

  console.log(`Firing ${logs.length} logs across ${buckets.length} buckets...`);
  if (delaySec > 0) {
    console.log(`Delay between logs: ${delaySec}s`);
  }
  console.log();

  for (let i = 0; i < logs.length; i++) {
    const { level, bucket, message, context, tags } = logs[i];
    const opts = { bucket, message, context, tags };

    switch (level) {
      case "info":
        gunsole.info(opts);
        break;
      case "debug":
        gunsole.debug(opts);
        break;
      case "warn":
        gunsole.warn(opts);
        break;
      case "error":
        gunsole.error(opts);
        break;
    }

    console.log(`  [${String(i + 1).padStart(3)}] ${level.toUpperCase().padEnd(5)} ${bucket.padEnd(14)} ${message}`);

    if (delaySec > 0 && i < logs.length - 1) {
      await sleep(delaySec * 1000);
    }
  }

  console.log("\nFlushing remaining logs...");
  try {
    await gunsole.flush();
    console.log("Done! All 100 logs sent.");
  } catch (err) {
    console.error("Flush failed:", err);
  }
  gunsole.destroy();
}

main();
