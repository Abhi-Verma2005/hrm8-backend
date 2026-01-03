-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Consultant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_referred_by_fkey" FOREIGN KEY ("referred_by") REFERENCES "Consultant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
