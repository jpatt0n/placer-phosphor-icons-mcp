import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

export const WEIGHTS = ["regular", "duotone"] as const;
export const COMPOSITIONS = ["brand", "yellow", "coral", "teal", "dark", "outline"] as const;
export const SIZE_ALIASES = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  "2xl": 48
} as const;

export type Weight = (typeof WEIGHTS)[number];
export type Composition = (typeof COMPOSITIONS)[number];
export type SizeAlias = keyof typeof SIZE_ALIASES;

type CompositionSpec = {
  label: string;
  icon: string;
  background: string;
  border?: string;
  tokens: {
    icon: string;
    background: string;
    border?: string;
  };
};

export const COMPOSITION_SPECS: Record<Composition, CompositionSpec> = {
  brand: {
    label: "Default / Brand",
    icon: "#5E63E5",
    background: "#DEE6FD",
    tokens: {
      icon: "--placer-purple",
      background: "--placer-purple-tint-100"
    }
  },
  yellow: {
    label: "Yellow",
    icon: "#B05420",
    background: "#FFF3D6",
    tokens: {
      icon: "--seq-5",
      background: "--seq-1"
    }
  },
  coral: {
    label: "Coral",
    icon: "#B12B2B",
    background: "#F9DDDA",
    tokens: {
      icon: "--div-redpur-7-1",
      background: "--seq-pinkpur-6-1"
    }
  },
  teal: {
    label: "Teal",
    icon: "#00585A",
    background: "#D1EEEA",
    tokens: {
      icon: "--div-purteal-7-7",
      background: "--seq-teal-6-1"
    }
  },
  dark: {
    label: "Dark",
    icon: "#FFFFFF",
    background: "#333333",
    tokens: {
      icon: "white",
      background: "--placer-black"
    }
  },
  outline: {
    label: "Outline",
    icon: "#333333",
    background: "#FFFFFF",
    border: "#E5E5E5",
    tokens: {
      icon: "--placer-black",
      background: "white",
      border: "--placer-border-default"
    }
  }
};

const require = createRequire(import.meta.url);
const knownRegularIcon = require.resolve("@phosphor-icons/core/assets/regular/chart-line-up.svg");
const assetRoot = path.dirname(path.dirname(knownRegularIcon));

export type IconRecord = {
  name: string;
  slug: string;
  weights: Weight[];
};

let iconCatalog: IconRecord[] | undefined;

export function listCatalog(): IconRecord[] {
  if (iconCatalog) {
    return iconCatalog;
  }

  const regularDir = path.join(assetRoot, "regular");
  const icons = fs
    .readdirSync(regularDir)
    .filter((file) => file.endsWith(".svg"))
    .map((file) => {
      const slug = file.replace(/\.svg$/, "");
      return {
        name: titleCase(slug),
        slug,
        weights: WEIGHTS.filter((weight) => fs.existsSync(iconPath(slug, weight)))
      };
    })
    .filter((icon) => icon.weights.length > 0)
    .sort((a, b) => a.slug.localeCompare(b.slug));

  iconCatalog = icons;
  return icons;
}

export function searchIcons(query = "", limit = 25): IconRecord[] {
  const normalizedQuery = normalizeSearch(query);
  const boundedLimit = Math.max(1, Math.min(limit, 100));

  if (!normalizedQuery) {
    return listCatalog().slice(0, boundedLimit);
  }

  return listCatalog()
    .map((icon) => ({
      icon,
      score: scoreIcon(icon.slug, normalizedQuery)
    }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.icon.slug.localeCompare(b.icon.slug))
    .slice(0, boundedLimit)
    .map((result) => result.icon);
}

export function getIcon(slugOrName: string): IconRecord | undefined {
  const slug = slugifyIconName(slugOrName);
  return listCatalog().find((icon) => icon.slug === slug);
}

export function buildTileSvg(options: {
  icon: string;
  composition: Composition;
  weight: Weight;
  size: SizeAlias;
  tileSize: number;
  radius: number;
}): { svg: string; metadata: Record<string, unknown> } {
  const icon = getIcon(options.icon);
  if (!icon) {
    const suggestions = searchIcons(options.icon, 8).map((result) => result.slug);
    throw new Error(`Unknown Phosphor icon "${options.icon}". Suggestions: ${suggestions.join(", ") || "none"}`);
  }

  if (!icon.weights.includes(options.weight)) {
    throw new Error(`Icon "${icon.slug}" does not have the approved "${options.weight}" weight.`);
  }

  const composition = COMPOSITION_SPECS[options.composition];
  const iconSize = SIZE_ALIASES[options.size];
  const tileSize = clamp(options.tileSize, iconSize, 160);
  const radius = clamp(options.radius, 0, tileSize / 2);
  const offset = (tileSize - iconSize) / 2;
  const scale = iconSize / 256;
  const innerSvg = readPhosphorInnerSvg(icon.slug, options.weight);
  const border = composition.border
    ? ` stroke="${composition.border}" stroke-width="1"`
    : "";

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${tileSize}" height="${tileSize}" viewBox="0 0 ${tileSize} ${tileSize}" role="img" aria-label="${escapeXml(icon.name)} icon">`,
    `  <rect width="${tileSize}" height="${tileSize}" rx="${radius}" fill="${composition.background}"${border}/>`,
    `  <g color="${composition.icon}" transform="translate(${round(offset)} ${round(offset)}) scale(${round(scale)})">`,
    indent(innerSvg, 4),
    "  </g>",
    "</svg>"
  ].join("\n");

  return {
    svg,
    metadata: {
      icon: icon.slug,
      name: icon.name,
      weight: options.weight,
      composition: options.composition,
      compositionLabel: composition.label,
      size: options.size,
      iconSize,
      tileSize,
      radius,
      colors: {
        icon: composition.icon,
        background: composition.background,
        border: composition.border
      },
      tokens: composition.tokens
    }
  };
}

export function buildIconOnlySvg(options: {
  icon: string;
  composition: Composition;
  weight: Weight;
  size: SizeAlias;
}): { svg: string; metadata: Record<string, unknown> } {
  const icon = getIcon(options.icon);
  if (!icon) {
    const suggestions = searchIcons(options.icon, 8).map((result) => result.slug);
    throw new Error(`Unknown Phosphor icon "${options.icon}". Suggestions: ${suggestions.join(", ") || "none"}`);
  }

  const composition = COMPOSITION_SPECS[options.composition];
  const size = SIZE_ALIASES[options.size];
  const innerSvg = readPhosphorInnerSvg(icon.slug, options.weight);
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 256 256" color="${composition.icon}" role="img" aria-label="${escapeXml(icon.name)} icon">`,
    indent(innerSvg, 2),
    "</svg>"
  ].join("\n");

  return {
    svg,
    metadata: {
      icon: icon.slug,
      name: icon.name,
      weight: options.weight,
      composition: options.composition,
      size: options.size,
      iconSize: size,
      colors: {
        icon: composition.icon
      },
      tokens: {
        icon: composition.tokens.icon
      }
    }
  };
}

export function styleGuide() {
  return {
    approvedWeights: [
      {
        weight: "regular",
        usage: "Default UI icon weight, equivalent to a 1.5px stroke in the Placer system."
      },
      {
        weight: "duotone",
        usage: "Feature or active-state treatment, usually with brand tint."
      }
    ],
    disallowedWeights: ["thin", "light", "bold", "fill"],
    compositions: COMPOSITION_SPECS,
    sizes: SIZE_ALIASES
  };
}

function readPhosphorInnerSvg(slug: string, weight: Weight): string {
  const fullPath = iconPath(slug, weight);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing ${weight} SVG for "${slug}".`);
  }

  const source = fs.readFileSync(fullPath, "utf8").trim();
  const match = source.match(/^<svg\b[^>]*>([\s\S]*)<\/svg>$/);
  if (!match) {
    throw new Error(`Unable to parse SVG for "${slug}".`);
  }

  return match[1].trim();
}

function iconPath(slug: string, weight: Weight): string {
  const fileName = weight === "regular" ? `${slug}.svg` : `${slug}-${weight}.svg`;
  return path.join(assetRoot, weight, fileName);
}

function slugifyIconName(value: string): string {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/\.svg$/, "")
    .replace(/-(regular|duotone)$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeSearch(value: string): string {
  return slugifyIconName(value).replace(/-/g, " ");
}

function scoreIcon(slug: string, query: string): number {
  const searchable = slug.replace(/-/g, " ");
  if (searchable === query) {
    return 1000;
  }
  if (slug === query.replace(/\s+/g, "-")) {
    return 900;
  }
  if (searchable.startsWith(query)) {
    return 750;
  }
  if (searchable.includes(query)) {
    return 500;
  }

  const queryTerms = query.split(/\s+/).filter(Boolean);
  const matches = queryTerms.filter((term) => searchable.includes(term)).length;
  return matches ? matches * 100 : 0;
}

function titleCase(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function indent(value: string, spaces: number): string {
  const prefix = " ".repeat(spaces);
  return value
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
