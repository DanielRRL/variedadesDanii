-- Migration: add_sequences
-- Adds two PostgreSQL sequences for human-readable order and invoice numbers,
-- and extends the OrderStatus enum with the READY state.
--
-- WHY SEQUENCES instead of MAX()+1:
--   nextval() is atomic at the database level. Two concurrent transactions
--   will always receive different, consecutive values without any application-
--   level locking or race conditions.

-- Sequence for order numbers (format VD-YYYYXXXX).
-- Starts at 1; gaps are acceptable if a transaction rolls back.
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- Sequence for electronic invoice numbers (used in Part 7).
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

-- Extend the OrderStatus enum with READY (replaces the SHIPPED stage
-- semantically for this local-delivery business: the order is prepared
-- and waiting to be handed off to the courier or customer).
-- ADD VALUE IF NOT EXISTS is safe to run multiple times (idempotent).
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'READY';
