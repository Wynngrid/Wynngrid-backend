-- First add the column as nullable
ALTER TABLE "Profile" ADD COLUMN "profilePicUrl" TEXT;

-- Update existing records with a default value
UPDATE "Profile" SET "profilePicUrl" = 'https://res.cloudinary.com/dyh31poku/image/upload/v1/profile_pictures/default-avatar.png';

-- Then make the column required
ALTER TABLE "Profile" ALTER COLUMN "profilePicUrl" SET NOT NULL; 