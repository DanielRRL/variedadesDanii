-- =============================================================================
-- Migration: add_loyalty_invoices_auth_history
-- Generated target: Prisma will append the DDL statements below automatically
-- when you run: npx prisma migrate dev --name add_loyalty_invoices_auth_history
--
-- CUSTOM SECTION: order number sequence for format VD-YYYYXXXX (RF-025)
-- Prisma does NOT generate sequences automatically; this SQL must be included
-- in the migration file that `prisma migrate dev` generates, or placed here
-- if you are using a manual / baseline migration.
-- =============================================================================

-- Sequence used by the application layer to assign unique, readable order numbers
-- in the format VD-YYYYXXXX (e.g. VD-20260001).
-- The application reads nextval('order_number_seq') and formats the string.
CREATE SEQUENCE IF NOT EXISTS order_number_seq
  START 1
  INCREMENT 1
  MINVALUE 1
  NO MAXVALUE
  CACHE 1;
