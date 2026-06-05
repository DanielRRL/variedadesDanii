import prisma from "../config/database";

/**
 * Generates the next sequential order number in VD-YYYYXXXX format.
 * Uses OrderCounter for Prisma 7 compatibility.
 */
export async function generateOrderNumber(): Promise<string> {
  const counter = await prisma.orderCounter.create({});
  const year = new Date().getFullYear();
  return `VD-${year}${String(counter.id).padStart(4, "0")}`;
}
