-- Migration: Add hsn_sac column to company table
ALTER TABLE company ADD COLUMN hsn_sac VARCHAR(32) DEFAULT NULL;
