import { ToolCategory, ToolCategoryId, ToolDefinition } from "./types";
import { aiTools } from "./modules/ai";
import { downloaderTools } from "./modules/downloader";
import { scraperTools } from "./modules/scraper";
import { forgeTools } from "./modules/forge";
import { documentTools } from "./modules/document";
import { developerTools } from "./modules/developer";

export const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: "ai",
    name: "Void AI",
    subtitle: "Kecerdasan Buatan & Generator Cerdas",
    description: "Kumpulan alat AI generatif, penerjemah neural komik, dan asisten teks cerdas.",
    iconName: "Bot",
    accentColor: "#00E5FF",
    gradient: "from-cyan-500/20 via-blue-500/10 to-transparent",
    toolCount: aiTools.length,
  },
  {
    id: "downloader",
    name: "Void Downloader",
    subtitle: "Penyelamat Media & Unduhan Komik",
    description: "Pengunduh chapter manga, video stream, galeri gambar, dan file batch multi-thread.",
    iconName: "Download",
    accentColor: "#38BDF8",
    gradient: "from-sky-500/20 via-cyan-500/10 to-transparent",
    toolCount: downloaderTools.length,
  },
  {
    id: "scraper",
    name: "Void Scraper",
    subtitle: "Ekstraktor Data Web & Pemantau Server",
    description: "Scraper HTML selektif, penganalisis metadata, pembaca RSS feed, dan monitor uptime.",
    iconName: "Globe",
    accentColor: "#A855F7",
    gradient: "from-purple-500/20 via-pink-500/10 to-transparent",
    toolCount: scraperTools.length,
  },
  {
    id: "forge",
    name: "Void Forge",
    subtitle: "Manipulasi Gambar & Studio Grafis",
    description: "Pengompres gambar WebP, penghapus latar belakang, penambah resolusi, dan generator QR.",
    iconName: "Wrench",
    accentColor: "#F59E0B",
    gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
    toolCount: forgeTools.length,
  },
  {
    id: "document",
    name: "Void Document",
    subtitle: "Pengolah Dokumen & Konversi PDF",
    description: "Konversi gambar ke PDF, kompresi berkas, pembaca OCR teks, dan formatter Markdown.",
    iconName: "FileText",
    accentColor: "#10B981",
    gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
    toolCount: documentTools.length,
  },
  {
    id: "developer",
    name: "Void Developer",
    subtitle: "Perkakas Pengembang & Pengujian API",
    description: "Formatter JSON, penguji API, dekoder JWT, pembuat UUID, penguji RegEx, dan pembuat password.",
    iconName: "Terminal",
    accentColor: "#EC4899",
    gradient: "from-pink-500/20 via-rose-500/10 to-transparent",
    toolCount: developerTools.length,
  },
];

class ToolRegistry {
  private categories: Map<ToolCategoryId, ToolCategory> = new Map();
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {
    // Register categories
    for (const cat of TOOL_CATEGORIES) {
      this.categories.set(cat.id, cat);
    }

    // Register all default tools from modules
    const allInitialTools = [
      ...aiTools,
      ...downloaderTools,
      ...scraperTools,
      ...forgeTools,
      ...documentTools,
      ...developerTools,
    ];

    for (const tool of allInitialTools) {
      this.registerTool(tool);
    }
  }

  /**
   * Register a new tool dynamically (Plugin-like architecture)
   */
  registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.id, tool);
    const cat = this.categories.get(tool.categoryId);
    if (cat) {
      cat.toolCount = Array.from(this.tools.values()).filter(
        (t) => t.categoryId === tool.categoryId
      ).length;
    }
  }

  /**
   * Register a new category dynamically
   */
  registerCategory(category: ToolCategory): void {
    this.categories.set(category.id, category);
  }

  getCategories(): ToolCategory[] {
    return Array.from(this.categories.values());
  }

  getCategory(id: ToolCategoryId): ToolCategory | undefined {
    return this.categories.get(id);
  }

  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  getToolsByCategory(categoryId: ToolCategoryId): ToolDefinition[] {
    return Array.from(this.tools.values()).filter((t) => t.categoryId === categoryId);
  }

  getToolById(toolId: string): ToolDefinition | undefined {
    return this.tools.get(toolId);
  }

  searchTools(query: string, categoryId?: ToolCategoryId | "all"): ToolDefinition[] {
    const q = query.trim().toLowerCase();
    let list = this.getAllTools();

    if (categoryId && categoryId !== "all") {
      list = list.filter((t) => t.categoryId === categoryId);
    }

    if (!q) return list;

    return list.filter((t) => {
      const matchName = t.name.toLowerCase().includes(q);
      const matchDesc = t.description.toLowerCase().includes(q);
      const matchTags = t.tags.some((tag) => tag.toLowerCase().includes(q));
      return matchName || matchDesc || matchTags;
    });
  }

  getTotalToolCount(): number {
    return this.tools.size;
  }
}

// Global singleton instance
const globalForRegistry = global as unknown as { toolRegistry?: ToolRegistry };
export const toolRegistry = globalForRegistry.toolRegistry ?? new ToolRegistry();
if (process.env.NODE_ENV !== "production") globalForRegistry.toolRegistry = toolRegistry;
