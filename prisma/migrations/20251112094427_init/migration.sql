-- CreateEnum
CREATE TYPE "public"."ocr_status" AS ENUM ('PENDING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "public"."template" (
    "template_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pdf_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_pkey" PRIMARY KEY ("template_id")
);

-- CreateTable
CREATE TABLE "public"."template_field" (
    "field_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "field_name" TEXT NOT NULL,
    "label" TEXT,
    "page_number" INTEGER NOT NULL,
    "x_norm" DOUBLE PRECISION NOT NULL,
    "y_norm" DOUBLE PRECISION NOT NULL,
    "w_norm" DOUBLE PRECISION NOT NULL,
    "h_norm" DOUBLE PRECISION NOT NULL,
    "sample_value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_field_pkey" PRIMARY KEY ("field_id")
);

-- CreateTable
CREATE TABLE "public"."file_store" (
    "file_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "uri" TEXT NOT NULL,
    "size_bytes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_store_pkey" PRIMARY KEY ("file_id")
);

-- CreateTable
CREATE TABLE "public"."ocr_run" (
    "run_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "input_file_id" TEXT NOT NULL,
    "status" "public"."ocr_status" NOT NULL DEFAULT 'PENDING',
    "ocr_score" DOUBLE PRECISION,
    "total_fields" INTEGER,
    "matched_fields" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "output_file_id" TEXT,

    CONSTRAINT "ocr_run_pkey" PRIMARY KEY ("run_id")
);

-- CreateTable
CREATE TABLE "public"."ocr_field_result" (
    "result_id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "field_id" TEXT NOT NULL,
    "field_name" TEXT NOT NULL,
    "page_number" INTEGER NOT NULL,
    "raw_text" TEXT,
    "cleaned_text" TEXT,
    "confidence" DOUBLE PRECISION,
    "matched" BOOLEAN,
    "validator_msg" TEXT,
    "x_norm" DOUBLE PRECISION NOT NULL,
    "y_norm" DOUBLE PRECISION NOT NULL,
    "w_norm" DOUBLE PRECISION NOT NULL,
    "h_norm" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ocr_field_result_pkey" PRIMARY KEY ("result_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "template_name_key" ON "public"."template"("name");

-- AddForeignKey
ALTER TABLE "public"."template_field" ADD CONSTRAINT "template_field_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."template"("template_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ocr_run" ADD CONSTRAINT "ocr_run_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."template"("template_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ocr_run" ADD CONSTRAINT "ocr_run_input_file_id_fkey" FOREIGN KEY ("input_file_id") REFERENCES "public"."file_store"("file_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ocr_run" ADD CONSTRAINT "ocr_run_output_file_id_fkey" FOREIGN KEY ("output_file_id") REFERENCES "public"."file_store"("file_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ocr_field_result" ADD CONSTRAINT "ocr_field_result_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."ocr_run"("run_id") ON DELETE CASCADE ON UPDATE CASCADE;
