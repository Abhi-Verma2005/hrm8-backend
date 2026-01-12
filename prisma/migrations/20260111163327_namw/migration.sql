-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "sales_agent_id" TEXT;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_sales_agent_id_fkey" FOREIGN KEY ("sales_agent_id") REFERENCES "Consultant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
