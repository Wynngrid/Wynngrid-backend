/*
  Warnings:

  - You are about to drop the column `avgProjectArea` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `avgProjectValue` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `projectTypes` on the `Profile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "avgProjectArea",
DROP COLUMN "avgProjectValue",
DROP COLUMN "projectTypes";

-- CreateTable
CREATE TABLE "ProjectAverage" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "projectType" TEXT NOT NULL,
    "avgArea" TEXT NOT NULL,
    "avgValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectAverage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProjectAverage" ADD CONSTRAINT "ProjectAverage_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
