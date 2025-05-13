-- AlterTable
ALTER TABLE `users` ADD COLUMN `address` VARCHAR(255) NULL,
    ADD COLUMN `emergency_name` VARCHAR(100) NULL,
    ADD COLUMN `emergency_phone` VARCHAR(50) NULL,
    ADD COLUMN `first_name` VARCHAR(100) NULL,
    ADD COLUMN `last_name` VARCHAR(100) NULL,
    ADD COLUMN `medical_info` TEXT NULL,
    ADD COLUMN `phone` VARCHAR(50) NULL;

-- CreateTable
CREATE TABLE `voiceassistantlogs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `message` TEXT NOT NULL,
    `response` TEXT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `voiceassistantlogs_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `voiceassistantlogs` ADD CONSTRAINT `voiceassistantlogs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
