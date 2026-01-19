-- CreateTable for AuditLog
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performed_by" TEXT NOT NULL,
    "performed_by_email" TEXT DEFAULT 'unknown',
    "performed_by_role" TEXT DEFAULT 'SYSTEM',
    "changes" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "description" TEXT,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_entity_type_idx" ON "audit_logs"("entity_type");
CREATE INDEX IF NOT EXISTS "audit_logs_entity_id_idx" ON "audit_logs"("entity_id");
CREATE INDEX IF NOT EXISTS "audit_logs_performed_by_idx" ON "audit_logs"("performed_by");
CREATE INDEX IF NOT EXISTS "audit_logs_performed_at_idx" ON "audit_logs"("performed_at");
