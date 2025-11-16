-- AlterTable
ALTER TABLE "public"."template_field" ADD COLUMN     "confidence_score" DOUBLE PRECISION,
ADD COLUMN     "field_status" TEXT DEFAULT 'pending',
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "sample_extracted_value" TEXT;
