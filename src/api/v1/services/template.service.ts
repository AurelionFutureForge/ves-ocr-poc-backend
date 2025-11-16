import prisma from "@prismaClient";
import { AppError } from "@/v1/middlewares";
import logger from "@/v1/utils/logger";
import * as OcrService from "@/v1/services/ocr.service";

export const getAllTemplates = async (limit: number = 10, cursor?: string, q?: string) => {
  try {
    // Build where clause with optional search functionality
    let whereClause: any = {};

    // Add search filter if searchQuery is provided
    if (q) {
      whereClause = {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } }
        ]
      };
    }

    const templates = await prisma.template.findMany({
      where: whereClause,
      include: {
        fields: {
          select: {
            field_id: true,
            field_name: true,
            label: true,
            page_number: true,
          },
        },
        _count: {
          select: {
            fields: true,
            ocr_runs: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      take: limit + 1,
      ...(cursor
        ? {
          cursor: { template_id: cursor },
          skip: 1,
        }
        : {}),
    });

    const hasNextPage = templates.length > limit;
    const result = templates.slice(0, limit).map((template) => ({
      template_id: template.template_id,
      name: template.name,
      description: template.description,
      pdf_url: template.pdf_url,
      created_at: template.created_at,
      updated_at: template.updated_at,
      fields_count: template._count.fields,
      ocr_runs_count: template._count.ocr_runs,
      fields: template.fields,
    }));

    const nextCursor = hasNextPage ? result[result.length - 1]?.template_id : null;

    return {
      status: 200,
      success: true,
      message: "Templates retrieved successfully.",
      data: {
        data: result,
        meta: {
          pagination: {
            next_cursor: nextCursor,
            has_next_page: hasNextPage,
            limit,
          }
        }
      },
    };
  } catch (error) {
    logger.error("❌ Error in getAllTemplates:", error);
    throw error;
  }
};

export const getTemplateById = async (template_id: string) => {
  try {
    const template = await prisma.template.findUnique({
      where: { template_id },
      include: {
        fields: {
          orderBy: {
            page_number: "asc",
          },
        },
        _count: {
          select: {
            ocr_runs: true,
          },
        },
      },
    });

    if (!template) {
      throw new AppError("Template not found", 404);
    }

    return {
      status: 200,
      success: true,
      message: "Template retrieved successfully.",
      data: {
        template_id: template.template_id,
        name: template.name,
        description: template.description,
        pdf_url: template.pdf_url,
        created_at: template.created_at,
        updated_at: template.updated_at,
        ocr_runs_count: template._count.ocr_runs,
        fields: template.fields,
      },
    };
  } catch (error) {
    logger.error("❌ Error in getTemplateById:", error);
    throw error;
  }
};

export const updateTemplate = async (
  template_id: string,
  name?: string,
  description?: string,
  pdf_url?: string,
) => {
  try {
    // Step 1: Check if the template exists
    const existingTemplate = await prisma.template.findUnique({
      where: { template_id },
    });

    if (!existingTemplate) {
      throw new AppError("Template not found", 404);
    }

    // Step 2: Check if name is being updated to an existing name
    if (name && name !== existingTemplate.name) {
      const duplicateTemplate = await prisma.template.findUnique({
        where: { name },
      });

      if (duplicateTemplate) {
        throw new AppError("Template name already exists", 409);
      }
    }

    // Step 3: Update the template
    const updatedTemplate = await prisma.template.update({
      where: { template_id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(pdf_url !== undefined && { pdf_url }),
      },
      include: {
        fields: true,
        _count: {
          select: {
            ocr_runs: true,
          },
        },
      },
    });

    return {
      status: 200,
      success: true,
      message: "Template updated successfully.",
      data: {
        template_id: updatedTemplate.template_id,
        name: updatedTemplate.name,
        description: updatedTemplate.description,
        pdf_url: updatedTemplate.pdf_url,
        created_at: updatedTemplate.created_at,
        updated_at: updatedTemplate.updated_at,
        ocr_runs_count: updatedTemplate._count.ocr_runs,
        fields: updatedTemplate.fields,
      },
    };
  } catch (error) {
    logger.error("❌ Error in updateTemplate:", error);
    throw error;
  }
};

export const addTemplateField = async (
  template_id: string,
  field_name: string,
  label: string | undefined,
  page_number: number,
  x_norm: number,
  y_norm: number,
  w_norm: number,
  h_norm: number,
  sample_value?: string,
  sample_extracted_value?: string,
  confidence_score?: number,
  field_status?: string,
  notes?: string,
) => {
  try {
    // Step 1: Check if the template exists
    const existingTemplate = await prisma.template.findUnique({
      where: { template_id },
    });

    if (!existingTemplate) {
      throw new AppError("Template not found", 404);
    }

    // Step 2: Create the new template field
    const newField = await prisma.template_field.create({
      data: {
        template_id,
        field_name,
        label,
        page_number,
        x_norm,
        y_norm,
        w_norm,
        h_norm,
        sample_value,
        sample_extracted_value,
        confidence_score,
        field_status,
        notes,
      },
    });

    return {
      status: 201,
      success: true,
      message: "Template field added successfully.",
      data: {
        field_id: newField.field_id,
        template_id: newField.template_id,
        field_name: newField.field_name,
        label: newField.label,
        page_number: newField.page_number,
        x_norm: newField.x_norm,
        y_norm: newField.y_norm,
        w_norm: newField.w_norm,
        h_norm: newField.h_norm,
        sample_value: newField.sample_value,
        sample_extracted_value: newField.sample_extracted_value,
        confidence_score: newField.confidence_score,
        field_status: newField.field_status,
        notes: newField.notes,
        created_at: newField.created_at,
        updated_at: newField.updated_at,
      },
    };
  } catch (error) {
    logger.error("❌ Error in addTemplateField:", error);
    throw error;
  }
};

export const updateTemplateField = async (
  template_id: string,
  field_id: string,
  field_name?: string,
  label?: string,
  page_number?: number,
  x_norm?: number,
  y_norm?: number,
  w_norm?: number,
  h_norm?: number,
  sample_value?: string,
  sample_extracted_value?: string
) => {
  try {
    // Step 1: Check if the template exists
    const existingTemplate = await prisma.template.findUnique({
      where: { template_id },
    });

    if (!existingTemplate) {
      throw new AppError("Template not found", 404);
    }

    // Step 2: Check if the field exists and belongs to this template
    const existingField = await prisma.template_field.findUnique({
      where: { field_id },
    });

    if (!existingField) {
      throw new AppError("Field not found", 404);
    }

    if (existingField.template_id !== template_id) {
      throw new AppError("Field does not belong to this template", 400);
    }

    // Step 3: Update the field
    const updatedField = await prisma.template_field.update({
      where: { field_id },
      data: {
        ...(field_name !== undefined && { field_name }),
        ...(label !== undefined && { label }),
        ...(page_number !== undefined && { page_number }),
        ...(x_norm !== undefined && { x_norm }),
        ...(y_norm !== undefined && { y_norm }),
        ...(w_norm !== undefined && { w_norm }),
        ...(h_norm !== undefined && { h_norm }),
        ...(sample_value !== undefined && { sample_value }),
        ...(sample_extracted_value !== undefined && { sample_extracted_value })
      },
    });

    return {
      status: 200,
      success: true,
      message: "Template field updated successfully.",
      data: {
        field_id: updatedField.field_id,
        template_id: updatedField.template_id,
        field_name: updatedField.field_name,
        label: updatedField.label,
        page_number: updatedField.page_number,
        x_norm: updatedField.x_norm,
        y_norm: updatedField.y_norm,
        w_norm: updatedField.w_norm,
        h_norm: updatedField.h_norm,
        sample_value: updatedField.sample_value,
        sample_extracted_value: updatedField.sample_extracted_value,
        confidence_score: updatedField.confidence_score,
        field_status: updatedField.field_status,
        notes: updatedField.notes,
        created_at: updatedField.created_at,
        updated_at: updatedField.updated_at,
      },
    };
  } catch (error) {
    logger.error("❌ Error in updateTemplateField:", error);
    throw error;
  }
};



export const deleteTemplateField = async (
  template_id: string,
  field_id: string,
) => {
  try {
    // Step 1: Check if the template exists
    const existingTemplate = await prisma.template.findUnique({
      where: { template_id },
    });

    if (!existingTemplate) {
      throw new AppError("Template not found", 404);
    }

    // Step 2: Check if the field exists and belongs to this template
    const existingField = await prisma.template_field.findUnique({
      where: { field_id },
    });

    if (!existingField) {
      throw new AppError("Field not found", 404);
    }

    if (existingField.template_id !== template_id) {
      throw new AppError("Field does not belong to this template", 400);
    }

    // Step 3: Delete the field
    const deletedField = await prisma.template_field.delete({
      where: { field_id },
    });

    return {
      status: 200,
      success: true,
      message: "Template field deleted successfully.",
      data: {
        field_id: deletedField.field_id,
        template_id: deletedField.template_id,
        field_name: deletedField.field_name,
      },
    };
  } catch (error) {
    logger.error("❌ Error in deleteTemplateField:", error);
    throw error;
  }
};

export const extractOcrFromTemplate = async (
  template_id: string,
  imageBuffer: Buffer,
  aggressive?: boolean,
) => {
  try {
    // Step 1: Check if template exists and get all fields
    const template = await prisma.template.findUnique({
      where: { template_id },
      include: {
        fields: {
          orderBy: {
            page_number: "asc",
          },
        },
      },
    });

    if (!template) {
      throw new AppError("Template not found", 404);
    }

    if (template.fields.length === 0) {
      throw new AppError("No fields defined for this template", 400);
    }

    // Step 2: Extract text from each field region
    const extractionResults: any[] = [];
    
    for (const field of template.fields) {
      try {
        // Extract the region of interest based on normalized coordinates
        const extractedData = await OcrService.extractTextFromRegion(
          imageBuffer,
          {
            x_norm: field.x_norm,
            y_norm: field.y_norm,
            w_norm: field.w_norm,
            h_norm: field.h_norm,
            page_number: field.page_number,
          },
          aggressive
        );

        // Determine field status based on confidence
        let fieldStatus = "pending";
        if (extractedData.confidence !== null && extractedData.confidence !== undefined) {
          if (extractedData.confidence >= 85 && extractedData.text.trim().length > 0) {
            fieldStatus = "good";
          } else if (extractedData.confidence >= 50 && extractedData.text.trim().length > 0) {
            fieldStatus = "low_confidence";
          } else if (extractedData.text.trim().length === 0) {
            fieldStatus = "no_data";
          }
        }

        // Step 4: Update the field with OCR results
        const updatedField = await prisma.template_field.update({
          where: { field_id: field.field_id },
          data: {
            sample_extracted_value: extractedData.text || null,
            confidence_score: extractedData.confidence || null,
            field_status: fieldStatus,
            notes: extractedData.notes || null,
          },
        });

        extractionResults.push({
          field_id: updatedField.field_id,
          field_name: updatedField.field_name,
          extracted_value: updatedField.sample_extracted_value,
          confidence_score: updatedField.confidence_score,
          field_status: updatedField.field_status,
          notes: updatedField.notes,
        });
      } catch (fieldError) {
        logger.warn(`⚠️ Error extracting field ${field.field_name}:`, fieldError);
        extractionResults.push({
          field_id: field.field_id,
          field_name: field.field_name,
          error: "Failed to extract",
          extracted_value: null,
          confidence_score: null,
          field_status: "no_data",
        });
      }
    }

    return {
      status: 200,
      success: true,
      message: "OCR extraction completed for all template fields",
      data: {
        template_id,
        template_name: template.name,
        total_fields: template.fields.length,
        extracted_fields: extractionResults.filter((r) => !r.error),
        failed_fields: extractionResults.filter((r) => r.error),
        extraction_results: extractionResults,
      },
    };
  } catch (error) {
    logger.error("❌ Error in extractOcrFromTemplate:", error);
    throw error;
  }
};