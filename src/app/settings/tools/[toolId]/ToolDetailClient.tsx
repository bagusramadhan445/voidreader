"use client";

import React from "react";
import { notFound } from "next/navigation";
import { toolRegistry } from "@/lib/tools/registry";
import { ToolDetail } from "@/components/tools/ToolDetail";

interface ToolDetailClientProps {
  toolId: string;
}

export function ToolDetailClient({ toolId }: ToolDetailClientProps) {
  const tool = toolRegistry.getToolById(toolId);

  if (!tool) {
    notFound();
  }

  const category = toolRegistry.getCategory(tool.categoryId);
  if (!category) {
    notFound();
  }

  const relatedTools = toolRegistry
    .getToolsByCategory(tool.categoryId)
    .filter((t) => t.id !== tool.id);

  return (
    <ToolDetail
      tool={tool}
      category={category}
      relatedTools={relatedTools}
    />
  );
}
