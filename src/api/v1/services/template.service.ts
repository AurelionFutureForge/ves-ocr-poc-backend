import prisma from "@prismaClient";
import { AppError } from "@/v1/middlewares";
import logger from "@/v1/utils/logger";

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