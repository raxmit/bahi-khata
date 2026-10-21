-- Add a category foreign key without discarding the historical display label.
-- The exact name/type backfill deliberately does not guess unmatched classifications.
ALTER TABLE `transactions`
    ADD COLUMN `categoryId` VARCHAR(191) NULL;

UPDATE `transactions` AS t
INNER JOIN `categories` AS c
    ON BINARY c.`name` = BINARY t.`category`
    AND c.`type` = t.`type`
SET t.`categoryId` = c.`id`;

-- This fails if any historical label has no exact same-type category.
-- Run the documented preflight first and explicitly map unresolved rows.
ALTER TABLE `transactions`
    MODIFY `categoryId` VARCHAR(191) NOT NULL;

CREATE INDEX `transactions_categoryId_idx` ON `transactions`(`categoryId`);

ALTER TABLE `transactions`
    ADD CONSTRAINT `transactions_categoryId_fkey`
    FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

