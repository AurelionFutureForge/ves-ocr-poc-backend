const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Sample Template Data
const templates = [
  {
    template_id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Invoice Template',
    description: 'Standard invoice template for processing supplier invoices',
    pdf_url: 'https://example.com/templates/invoice-template.pdf',
  },
  {
    template_id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Receipt Template',
    description: 'Standard receipt template for retail transactions',
    pdf_url: 'https://example.com/templates/receipt-template.pdf',
  },
  {
    template_id: '987fcdeb-51a2-43f7-b098-c6f8d3e2a456',
    name: 'Purchase Order Template',
    description: 'Template for processing purchase orders',
    pdf_url: 'https://example.com/templates/purchase-order-template.pdf',
  },
  {
    template_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'Bill of Lading Template',
    description: 'Shipping document template for logistics',
    pdf_url: 'https://example.com/templates/bill-of-lading.pdf',
  },
  {
    template_id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    name: 'Tax Form Template',
    description: 'Template for processing tax forms and documents',
    pdf_url: 'https://example.com/templates/tax-form.pdf',
  },
];

// Sample Template Fields Data
const templateFields = [
  // Fields for Invoice Template
  {
    field_id: '650e8400-e29b-41d4-a716-446655440001',
    template_id: '550e8400-e29b-41d4-a716-446655440000',
    field_name: 'invoice_number',
    label: 'Invoice Number',
    page_number: 1,
    x_norm: 0.15,
    y_norm: 0.10,
    w_norm: 0.25,
    h_norm: 0.05,
    sample_value: 'INV-2024-001',
  },
  {
    field_id: '650e8400-e29b-41d4-a716-446655440002',
    template_id: '550e8400-e29b-41d4-a716-446655440000',
    field_name: 'invoice_date',
    label: 'Invoice Date',
    page_number: 1,
    x_norm: 0.15,
    y_norm: 0.20,
    w_norm: 0.25,
    h_norm: 0.05,
    sample_value: '2024-01-15',
  },
  {
    field_id: '650e8400-e29b-41d4-a716-446655440003',
    template_id: '550e8400-e29b-41d4-a716-446655440000',
    field_name: 'vendor_name',
    label: 'Vendor Name',
    page_number: 1,
    x_norm: 0.15,
    y_norm: 0.30,
    w_norm: 0.40,
    h_norm: 0.05,
    sample_value: 'ABC Corporation',
  },
  {
    field_id: '650e8400-e29b-41d4-a716-446655440004',
    template_id: '550e8400-e29b-41d4-a716-446655440000',
    field_name: 'total_amount',
    label: 'Total Amount',
    page_number: 1,
    x_norm: 0.70,
    y_norm: 0.80,
    w_norm: 0.20,
    h_norm: 0.05,
    sample_value: '$1,234.56',
  },
  {
    field_id: '650e8400-e29b-41d4-a716-446655440005',
    template_id: '550e8400-e29b-41d4-a716-446655440000',
    field_name: 'tax_amount',
    label: 'Tax Amount',
    page_number: 1,
    x_norm: 0.70,
    y_norm: 0.75,
    w_norm: 0.20,
    h_norm: 0.05,
    sample_value: '$123.45',
  },
  {
    field_id: '650e8400-e29b-41d4-a716-446655440006',
    template_id: '550e8400-e29b-41d4-a716-446655440000',
    field_name: 'due_date',
    label: 'Due Date',
    page_number: 1,
    x_norm: 0.15,
    y_norm: 0.25,
    w_norm: 0.25,
    h_norm: 0.05,
    sample_value: '2024-02-15',
  },

  // Fields for Receipt Template
  {
    field_id: '750e8400-e29b-41d4-a716-446655440001',
    template_id: '123e4567-e89b-12d3-a456-426614174000',
    field_name: 'receipt_number',
    label: 'Receipt Number',
    page_number: 1,
    x_norm: 0.20,
    y_norm: 0.10,
    w_norm: 0.30,
    h_norm: 0.04,
    sample_value: 'REC-2024-12345',
  },
  {
    field_id: '750e8400-e29b-41d4-a716-446655440002',
    template_id: '123e4567-e89b-12d3-a456-426614174000',
    field_name: 'receipt_date',
    label: 'Receipt Date',
    page_number: 1,
    x_norm: 0.20,
    y_norm: 0.15,
    w_norm: 0.25,
    h_norm: 0.04,
    sample_value: '2024-01-20',
  },
  {
    field_id: '750e8400-e29b-41d4-a716-446655440003',
    template_id: '123e4567-e89b-12d3-a456-426614174000',
    field_name: 'store_name',
    label: 'Store Name',
    page_number: 1,
    x_norm: 0.20,
    y_norm: 0.05,
    w_norm: 0.35,
    h_norm: 0.04,
    sample_value: 'Retail Store Inc.',
  },
  {
    field_id: '750e8400-e29b-41d4-a716-446655440004',
    template_id: '123e4567-e89b-12d3-a456-426614174000',
    field_name: 'total_paid',
    label: 'Total Paid',
    page_number: 1,
    x_norm: 0.60,
    y_norm: 0.85,
    w_norm: 0.25,
    h_norm: 0.05,
    sample_value: '$89.99',
  },

  // Fields for Purchase Order Template
  {
    field_id: '850e8400-e29b-41d4-a716-446655440001',
    template_id: '987fcdeb-51a2-43f7-b098-c6f8d3e2a456',
    field_name: 'po_number',
    label: 'PO Number',
    page_number: 1,
    x_norm: 0.15,
    y_norm: 0.12,
    w_norm: 0.30,
    h_norm: 0.05,
    sample_value: 'PO-2024-5678',
  },
  {
    field_id: '850e8400-e29b-41d4-a716-446655440002',
    template_id: '987fcdeb-51a2-43f7-b098-c6f8d3e2a456',
    field_name: 'po_date',
    label: 'PO Date',
    page_number: 1,
    x_norm: 0.15,
    y_norm: 0.18,
    w_norm: 0.25,
    h_norm: 0.05,
    sample_value: '2024-01-10',
  },
  {
    field_id: '850e8400-e29b-41d4-a716-446655440003',
    template_id: '987fcdeb-51a2-43f7-b098-c6f8d3e2a456',
    field_name: 'supplier_name',
    label: 'Supplier Name',
    page_number: 1,
    x_norm: 0.15,
    y_norm: 0.30,
    w_norm: 0.40,
    h_norm: 0.05,
    sample_value: 'Global Supplies Ltd.',
  },
  {
    field_id: '850e8400-e29b-41d4-a716-446655440004',
    template_id: '987fcdeb-51a2-43f7-b098-c6f8d3e2a456',
    field_name: 'total_order_amount',
    label: 'Total Order Amount',
    page_number: 1,
    x_norm: 0.65,
    y_norm: 0.85,
    w_norm: 0.25,
    h_norm: 0.06,
    sample_value: '$5,678.90',
  },

  // Fields for Bill of Lading Template
  {
    field_id: '950e8400-e29b-41d4-a716-446655440001',
    template_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    field_name: 'bol_number',
    label: 'BOL Number',
    page_number: 1,
    x_norm: 0.10,
    y_norm: 0.08,
    w_norm: 0.30,
    h_norm: 0.05,
    sample_value: 'BOL-2024-9999',
  },
  {
    field_id: '950e8400-e29b-41d4-a716-446655440002',
    template_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    field_name: 'shipper_name',
    label: 'Shipper Name',
    page_number: 1,
    x_norm: 0.10,
    y_norm: 0.20,
    w_norm: 0.35,
    h_norm: 0.05,
    sample_value: 'Fast Shipping Co.',
  },
  {
    field_id: '950e8400-e29b-41d4-a716-446655440003',
    template_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    field_name: 'consignee_name',
    label: 'Consignee Name',
    page_number: 1,
    x_norm: 0.10,
    y_norm: 0.35,
    w_norm: 0.35,
    h_norm: 0.05,
    sample_value: 'Receiving Warehouse Inc.',
  },

  // Fields for Tax Form Template
  {
    field_id: 'a50e8400-e29b-41d4-a716-446655440001',
    template_id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    field_name: 'tax_id',
    label: 'Tax ID',
    page_number: 1,
    x_norm: 0.15,
    y_norm: 0.15,
    w_norm: 0.30,
    h_norm: 0.05,
    sample_value: 'TAX-123-456-789',
  },
  {
    field_id: 'a50e8400-e29b-41d4-a716-446655440002',
    template_id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    field_name: 'tax_year',
    label: 'Tax Year',
    page_number: 1,
    x_norm: 0.15,
    y_norm: 0.22,
    w_norm: 0.20,
    h_norm: 0.05,
    sample_value: '2024',
  },
  {
    field_id: 'a50e8400-e29b-41d4-a716-446655440003',
    template_id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    field_name: 'total_tax_due',
    label: 'Total Tax Due',
    page_number: 1,
    x_norm: 0.65,
    y_norm: 0.80,
    w_norm: 0.25,
    h_norm: 0.06,
    sample_value: '$2,345.67',
  },
];

// Sample File Store Data
const fileStores = [
  {
    file_id: 'f1e2d3c4-b5a6-7890-1234-567890abcdef',
    file_name: 'invoice_sample_001.pdf',
    file_type: 'application/pdf',
    uri: 'https://storage.example.com/uploads/invoice_sample_001.pdf',
    size_bytes: 245678,
  },
  {
    file_id: 'f2e3d4c5-b6a7-8901-2345-67890abcdef1',
    file_name: 'receipt_sample_001.pdf',
    file_type: 'application/pdf',
    uri: 'https://storage.example.com/uploads/receipt_sample_001.pdf',
    size_bytes: 123456,
  },
  {
    file_id: 'f3e4d5c6-b7a8-9012-3456-7890abcdef12',
    file_name: 'invoice_sample_002.pdf',
    file_type: 'application/pdf',
    uri: 'https://storage.example.com/uploads/invoice_sample_002.pdf',
    size_bytes: 267890,
  },
  {
    file_id: 'f4e5d6c7-b8a9-0123-4567-890abcdef123',
    file_name: 'po_sample_001.pdf',
    file_type: 'application/pdf',
    uri: 'https://storage.example.com/uploads/po_sample_001.pdf',
    size_bytes: 189234,
  },
  {
    file_id: 'f5e6d7c8-b9a0-1234-5678-90abcdef1234',
    file_name: 'output_invoice_001.json',
    file_type: 'application/json',
    uri: 'https://storage.example.com/outputs/output_invoice_001.json',
    size_bytes: 45678,
  },
  {
    file_id: 'f6e7d8c9-b0a1-2345-6789-0abcdef12345',
    file_name: 'output_receipt_001.json',
    file_type: 'application/json',
    uri: 'https://storage.example.com/outputs/output_receipt_001.json',
    size_bytes: 34567,
  },
];

// Sample OCR Run Data
const ocrRuns = [
  {
    run_id: 'r1a2b3c4-d5e6-7890-abcd-ef1234567890',
    template_id: '550e8400-e29b-41d4-a716-446655440000',
    input_file_id: 'f1e2d3c4-b5a6-7890-1234-567890abcdef',
    output_file_id: 'f5e6d7c8-b9a0-1234-5678-90abcdef1234',
    status: 'DONE',
    ocr_score: 0.95,
    total_fields: 6,
    matched_fields: 6,
    notes: 'OCR processing completed successfully',
    finished_at: new Date('2024-01-16T10:30:00Z'),
  },
  {
    run_id: 'r2b3c4d5-e6f7-8901-bcde-f12345678901',
    template_id: '123e4567-e89b-12d3-a456-426614174000',
    input_file_id: 'f2e3d4c5-b6a7-8901-2345-67890abcdef1',
    output_file_id: 'f6e7d8c9-b0a1-2345-6789-0abcdef12345',
    status: 'DONE',
    ocr_score: 0.92,
    total_fields: 4,
    matched_fields: 4,
    notes: 'Receipt processed with high confidence',
    finished_at: new Date('2024-01-20T14:45:00Z'),
  },
  {
    run_id: 'r3c4d5e6-f7a8-9012-cdef-123456789012',
    template_id: '550e8400-e29b-41d4-a716-446655440000',
    input_file_id: 'f3e4d5c6-b7a8-9012-3456-7890abcdef12',
    status: 'PENDING',
    ocr_score: null,
    total_fields: null,
    matched_fields: null,
    notes: 'Queued for processing',
    finished_at: null,
  },
  {
    run_id: 'r4d5e6f7-a8b9-0123-def1-234567890123',
    template_id: '987fcdeb-51a2-43f7-b098-c6f8d3e2a456',
    input_file_id: 'f4e5d6c7-b8a9-0123-4567-890abcdef123',
    status: 'FAILED',
    ocr_score: 0.45,
    total_fields: 4,
    matched_fields: 2,
    notes: 'Low quality scan - reprocessing required',
    finished_at: new Date('2024-01-18T09:15:00Z'),
  },
];

// Sample OCR Field Results Data
const ocrFieldResults = [
  // Results for run 1 (Invoice Sample 001)
  {
    result_id: 'res1-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    run_id: 'r1a2b3c4-d5e6-7890-abcd-ef1234567890',
    field_id: '650e8400-e29b-41d4-a716-446655440001',
    field_name: 'invoice_number',
    page_number: 1,
    raw_text: 'INV-2024-001',
    cleaned_text: 'INV-2024-001',
    confidence: 0.98,
    matched: true,
    validator_msg: 'Format validated',
    x_norm: 0.15,
    y_norm: 0.10,
    w_norm: 0.25,
    h_norm: 0.05,
  },
  {
    result_id: 'res2-a2b3c4d5-e6f7-8901-bcde-f12345678901',
    run_id: 'r1a2b3c4-d5e6-7890-abcd-ef1234567890',
    field_id: '650e8400-e29b-41d4-a716-446655440002',
    field_name: 'invoice_date',
    page_number: 1,
    raw_text: '01/15/2024',
    cleaned_text: '2024-01-15',
    confidence: 0.96,
    matched: true,
    validator_msg: 'Date format converted',
    x_norm: 0.15,
    y_norm: 0.20,
    w_norm: 0.25,
    h_norm: 0.05,
  },
  {
    result_id: 'res3-a3b4c5d6-e7f8-9012-cdef-123456789012',
    run_id: 'r1a2b3c4-d5e6-7890-abcd-ef1234567890',
    field_id: '650e8400-e29b-41d4-a716-446655440003',
    field_name: 'vendor_name',
    page_number: 1,
    raw_text: 'ABC Corporation',
    cleaned_text: 'ABC Corporation',
    confidence: 0.97,
    matched: true,
    validator_msg: null,
    x_norm: 0.15,
    y_norm: 0.30,
    w_norm: 0.40,
    h_norm: 0.05,
  },
  {
    result_id: 'res4-a4b5c6d7-e8f9-0123-def1-234567890123',
    run_id: 'r1a2b3c4-d5e6-7890-abcd-ef1234567890',
    field_id: '650e8400-e29b-41d4-a716-446655440004',
    field_name: 'total_amount',
    page_number: 1,
    raw_text: '$1,234.56',
    cleaned_text: '1234.56',
    confidence: 0.95,
    matched: true,
    validator_msg: 'Currency symbol removed',
    x_norm: 0.70,
    y_norm: 0.80,
    w_norm: 0.20,
    h_norm: 0.05,
  },
  {
    result_id: 'res5-a5b6c7d8-e9f0-1234-ef12-345678901234',
    run_id: 'r1a2b3c4-d5e6-7890-abcd-ef1234567890',
    field_id: '650e8400-e29b-41d4-a716-446655440005',
    field_name: 'tax_amount',
    page_number: 1,
    raw_text: '$123.45',
    cleaned_text: '123.45',
    confidence: 0.94,
    matched: true,
    validator_msg: 'Currency symbol removed',
    x_norm: 0.70,
    y_norm: 0.75,
    w_norm: 0.20,
    h_norm: 0.05,
  },
  {
    result_id: 'res6-a6b7c8d9-e0f1-2345-f123-456789012345',
    run_id: 'r1a2b3c4-d5e6-7890-abcd-ef1234567890',
    field_id: '650e8400-e29b-41d4-a716-446655440006',
    field_name: 'due_date',
    page_number: 1,
    raw_text: '02/15/2024',
    cleaned_text: '2024-02-15',
    confidence: 0.93,
    matched: true,
    validator_msg: 'Date format converted',
    x_norm: 0.15,
    y_norm: 0.25,
    w_norm: 0.25,
    h_norm: 0.05,
  },

  // Results for run 2 (Receipt Sample 001)
  {
    result_id: 'res7-b1c2d3e4-f5a6-7890-1234-567890abcdef',
    run_id: 'r2b3c4d5-e6f7-8901-bcde-f12345678901',
    field_id: '750e8400-e29b-41d4-a716-446655440001',
    field_name: 'receipt_number',
    page_number: 1,
    raw_text: 'REC-2024-12345',
    cleaned_text: 'REC-2024-12345',
    confidence: 0.97,
    matched: true,
    validator_msg: 'Format validated',
    x_norm: 0.20,
    y_norm: 0.10,
    w_norm: 0.30,
    h_norm: 0.04,
  },
  {
    result_id: 'res8-b2c3d4e5-f6a7-8901-2345-67890abcdef1',
    run_id: 'r2b3c4d5-e6f7-8901-bcde-f12345678901',
    field_id: '750e8400-e29b-41d4-a716-446655440002',
    field_name: 'receipt_date',
    page_number: 1,
    raw_text: '01/20/2024',
    cleaned_text: '2024-01-20',
    confidence: 0.95,
    matched: true,
    validator_msg: 'Date format converted',
    x_norm: 0.20,
    y_norm: 0.15,
    w_norm: 0.25,
    h_norm: 0.04,
  },
  {
    result_id: 'res9-b3c4d5e6-f7a8-9012-3456-7890abcdef12',
    run_id: 'r2b3c4d5-e6f7-8901-bcde-f12345678901',
    field_id: '750e8400-e29b-41d4-a716-446655440003',
    field_name: 'store_name',
    page_number: 1,
    raw_text: 'Retail Store Inc.',
    cleaned_text: 'Retail Store Inc.',
    confidence: 0.91,
    matched: true,
    validator_msg: null,
    x_norm: 0.20,
    y_norm: 0.05,
    w_norm: 0.35,
    h_norm: 0.04,
  },
  {
    result_id: 'res10-b4c5d6e7-f8a9-0123-4567-890abcdef123',
    run_id: 'r2b3c4d5-e6f7-8901-bcde-f12345678901',
    field_id: '750e8400-e29b-41d4-a716-446655440004',
    field_name: 'total_paid',
    page_number: 1,
    raw_text: '$89.99',
    cleaned_text: '89.99',
    confidence: 0.89,
    matched: true,
    validator_msg: 'Currency symbol removed',
    x_norm: 0.60,
    y_norm: 0.85,
    w_norm: 0.25,
    h_norm: 0.05,
  },
];

async function main() {
  console.log('🌱 Starting database seed...\n');

  try {
    // Clear existing data (in reverse order of dependencies)
    console.log('🗑️  Clearing existing data...');
    await prisma.ocr_field_result.deleteMany({});
    await prisma.ocr_run.deleteMany({});
    await prisma.file_store.deleteMany({});
    await prisma.template_field.deleteMany({});
    await prisma.template.deleteMany({});
    console.log('✅ Existing data cleared\n');

    // Seed Templates
    console.log('📄 Seeding templates...');
    for (const template of templates) {
      await prisma.template.create({
        data: template,
      });
      console.log(`  ✓ Created template: ${template.name}`);
    }
    console.log(`✅ ${templates.length} templates created\n`);

    // Seed Template Fields
    console.log('📝 Seeding template fields...');
    for (const field of templateFields) {
      await prisma.template_field.create({
        data: field,
      });
    }
    console.log(`✅ ${templateFields.length} template fields created\n`);

    // Seed File Store
    console.log('📦 Seeding file store...');
    for (const file of fileStores) {
      await prisma.file_store.create({
        data: file,
      });
      console.log(`  ✓ Created file: ${file.file_name}`);
    }
    console.log(`✅ ${fileStores.length} files created\n`);

    // Seed OCR Runs
    console.log('🔄 Seeding OCR runs...');
    for (const run of ocrRuns) {
      await prisma.ocr_run.create({
        data: run,
      });
      console.log(`  ✓ Created OCR run: ${run.run_id} (${run.status})`);
    }
    console.log(`✅ ${ocrRuns.length} OCR runs created\n`);

    // Seed OCR Field Results
    console.log('📊 Seeding OCR field results...');
    for (const result of ocrFieldResults) {
      await prisma.ocr_field_result.create({
        data: result,
      });
    }
    console.log(`✅ ${ocrFieldResults.length} OCR field results created\n`);

    // Summary
    console.log('🎉 Seeding completed successfully!\n');
    console.log('📈 Summary:');
    console.log(`   • ${templates.length} templates`);
    console.log(`   • ${templateFields.length} template fields`);
    console.log(`   • ${fileStores.length} files`);
    console.log(`   • ${ocrRuns.length} OCR runs`);
    console.log(`   • ${ocrFieldResults.length} OCR field results`);
    console.log('\n✨ Database is ready for testing!\n');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });




