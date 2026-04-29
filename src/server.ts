#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod/v3";
import {
  buildIconOnlySvg,
  buildTileSvg,
  COMPOSITIONS,
  listCatalog,
  searchIcons,
  SIZE_ALIASES,
  styleGuide,
  WEIGHTS
} from "./icon-system.js";

const compositionSchema = z.enum(COMPOSITIONS);
const weightSchema = z.enum(WEIGHTS);
const sizeSchema = z.enum(Object.keys(SIZE_ALIASES) as [keyof typeof SIZE_ALIASES, ...Array<keyof typeof SIZE_ALIASES>]);

const server = new McpServer({
  name: "placer-phosphor-icons",
  version: "1.0.0"
});

server.registerResource(
  "placer-icon-style-guide",
  "placer-icons://style-guide",
  {
    title: "Placer Icon Style Guide",
    description: "Approved Phosphor weights, Placer branded icon compositions, and size aliases.",
    mimeType: "application/json"
  },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(styleGuide(), null, 2)
      }
    ]
  })
);

server.registerTool(
  "list_icons",
  {
    title: "List Placer Phosphor Icons",
    description: "Search the available Phosphor icon catalog by name or slug. Only approved Placer weights are returned.",
    inputSchema: {
      query: z.string().optional().describe("Search term, for example chart, warning, store, map pin, target."),
      limit: z.number().int().min(1).max(100).default(25).describe("Maximum number of icons to return.")
    },
    annotations: {
      readOnlyHint: true,
      idempotentHint: true
    }
  },
  async ({ query = "", limit = 25 }) => {
    const icons = searchIcons(query, limit);
    const result = {
      totalAvailable: listCatalog().length,
      count: icons.length,
      icons
    };

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result
    };
  }
);

server.registerTool(
  "get_icon_tile_svg",
  {
    title: "Get Branded Icon Tile SVG",
    description: "Generate a Placer-branded icon tile SVG from a Phosphor icon.",
    inputSchema: {
      icon: z.string().describe("Phosphor icon name or slug, for example chart-line-up, warning, store, map-pin, target."),
      composition: compositionSchema.default("brand").describe("Placer tile composition."),
      weight: weightSchema.default("regular").describe("Approved Phosphor weight. Placer uses regular and duotone only."),
      size: sizeSchema.default("lg").describe("Icon size alias: sm=16, md=20, lg=24, xl=32, 2xl=48."),
      tileSize: z.number().int().min(16).max(160).default(56).describe("Outer square tile size in pixels."),
      radius: z.number().int().min(0).max(80).default(8).describe("Tile corner radius in pixels.")
    },
    annotations: {
      readOnlyHint: true,
      idempotentHint: true
    }
  },
  async ({ icon, composition = "brand", weight = "regular", size = "lg", tileSize = 56, radius = 8 }) => {
    try {
      const result = buildTileSvg({ icon, composition, weight, size, tileSize, radius });

      return {
        content: [
          {
            type: "text",
            text: [
              JSON.stringify(result.metadata, null, 2),
              "",
              "```svg",
              result.svg,
              "```"
            ].join("\n")
          }
        ],
        structuredContent: result
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }]
      };
    }
  }
);

server.registerTool(
  "get_icon_svg",
  {
    title: "Get Icon-Only SVG",
    description: "Generate an icon-only SVG using an approved Placer composition color, without the tile background.",
    inputSchema: {
      icon: z.string().describe("Phosphor icon name or slug."),
      composition: compositionSchema.default("brand").describe("Composition whose icon color should be applied."),
      weight: weightSchema.default("regular").describe("Approved Phosphor weight. Placer uses regular and duotone only."),
      size: sizeSchema.default("lg").describe("Icon size alias: sm=16, md=20, lg=24, xl=32, 2xl=48.")
    },
    annotations: {
      readOnlyHint: true,
      idempotentHint: true
    }
  },
  async ({ icon, composition = "brand", weight = "regular", size = "lg" }) => {
    try {
      const result = buildIconOnlySvg({ icon, composition, weight, size });

      return {
        content: [
          {
            type: "text",
            text: [
              JSON.stringify(result.metadata, null, 2),
              "",
              "```svg",
              result.svg,
              "```"
            ].join("\n")
          }
        ],
        structuredContent: result
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }]
      };
    }
  }
);

server.registerPrompt(
  "choose_placer_icon",
  {
    title: "Choose Placer Icon",
    description: "Prompt template for choosing a Placer-compliant Phosphor icon and composition.",
    argsSchema: {
      useCase: z.string().describe("The UI use case or feature concept."),
      tone: z.string().optional().describe("Optional visual tone, for example warning, success, neutral, active.")
    }
  },
  ({ useCase, tone }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: [
            `Choose a Placer-compliant Phosphor icon for: ${useCase}`,
            tone ? `Visual tone: ${tone}` : "",
            "Use list_icons to search, then get_icon_tile_svg for the final SVG.",
            "Respect the approved Placer weights: regular for default UI, duotone for feature or active states."
          ]
            .filter(Boolean)
            .join("\n")
        }
      }
    ]
  })
);

const transport = new StdioServerTransport();
await server.connect(transport);
