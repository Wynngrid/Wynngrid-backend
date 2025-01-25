/*
  Warnings:

  - Added the required column `fullName` to the `Profile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "fullName" TEXT NOT NULL,
ADD COLUMN     "preferredWorkLocations" TEXT[];
