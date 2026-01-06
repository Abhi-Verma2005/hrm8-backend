-- AddForeignKey
ALTER TABLE "HRM8User" ADD CONSTRAINT "HRM8User_licensee_id_fkey" FOREIGN KEY ("licensee_id") REFERENCES "RegionalLicensee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
