import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { toolRegistry } from "@/lib/tools/registry";
import { ToolDetailClient } from "./ToolDetailClient";

interface PageProps {
  params: Promise<{ toolId: string }>;
}

export async function generateStaticParams() {
  return toolRegistry.getAllTools().map((tool) => ({
    toolId: tool.id,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { toolId } = await params;
  const tool = toolRegistry.getToolById(toolId);

  if (!tool) {
    return {
      title: "Alat Tidak Ditemukan | Void Tools",
      description: "Alat yang diminta tidak ditemukan di Void Tools Hub.",
    };
  }

  const category = toolRegistry.getCategory(tool.categoryId);
  const categoryName = category ? category.name : "Void Tools";

  return {
    title: `${tool.name} - ${categoryName} | VoidVerse Tools`,
    description: tool.description,
    keywords: [
      tool.name,
      categoryName,
      "void tools",
      "voidverse utilities",
      ...tool.tags,
    ],
    openGraph: {
      title: `${tool.name} | Void Tools`,
      description: tool.description,
      type: "website",
    },
  };
}

export default async function ToolPage({ params }: PageProps) {
  const { toolId } = await params;
  const tool = toolRegistry.getToolById(toolId);

  if (!tool) {
    notFound();
  }

  return <ToolDetailClient toolId={toolId} />;
}
