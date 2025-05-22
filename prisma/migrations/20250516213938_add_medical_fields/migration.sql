-- AlterTable
ALTER TABLE `users` ADD COLUMN `allergies` TEXT NULL,
    ADD COLUMN `blood_type` VARCHAR(10) NULL,
    ADD COLUMN `chronic_conditions` TEXT NULL,
    ADD COLUMN `current_medications` TEXT NULL,
    ADD COLUMN `date_of_birth` DATE NULL,
    ADD COLUMN `gender` VARCHAR(20) NULL,
    ADD COLUMN `insurance_policy` VARCHAR(100) NULL,
    ADD COLUMN `insurance_provider` VARCHAR(100) NULL,
    ADD COLUMN `past_surgeries` TEXT NULL,
    ADD COLUMN `physician_contact` VARCHAR(100) NULL,
    ADD COLUMN `preferred_pharmacy` VARCHAR(100) NULL,
    ADD COLUMN `primary_physician` VARCHAR(100) NULL,
    ADD COLUMN `vaccination_records` TEXT NULL;
