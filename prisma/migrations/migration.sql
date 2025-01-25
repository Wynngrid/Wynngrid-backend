-- First make the column nullable
ALTER TABLE "Profile" ALTER COLUMN "fullName" DROP NOT NULL;

-- Then update existing records
UPDATE "Profile" 
SET "fullName" = CONCAT("User".firstName, ' ', "User".lastName)
FROM "User"
WHERE "Profile"."userId" = "User"."id";

-- Finally make the column required again
ALTER TABLE "Profile" ALTER COLUMN "fullName" SET NOT NULL; 