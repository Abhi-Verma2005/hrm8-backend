-- CreateTable
CREATE TABLE "candidate_verification_tokens" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "candidate_verification_tokens_token_key" ON "candidate_verification_tokens"("token");

-- CreateIndex
CREATE INDEX "candidate_verification_tokens_token_idx" ON "candidate_verification_tokens"("token");

-- CreateIndex
CREATE INDEX "candidate_verification_tokens_candidate_id_idx" ON "candidate_verification_tokens"("candidate_id");

-- AddForeignKey
ALTER TABLE "candidate_verification_tokens" ADD CONSTRAINT "candidate_verification_tokens_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
