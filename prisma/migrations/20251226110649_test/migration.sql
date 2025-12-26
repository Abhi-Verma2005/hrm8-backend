-- CreateTable
CREATE TABLE "migration_test" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "migration_test_pkey" PRIMARY KEY ("id")
);
