# Placer Phosphor Icons MCP Server

This is a local MCP server for Claude Code that exposes Placer-branded SVG compositions built from Phosphor Icons.

It gives Claude Code three tools:

- `list_icons`: search Phosphor icon names/slugs.
- `get_icon_tile_svg`: generate a Placer tile SVG with background, icon color, optional border, and approved sizing.
- `get_icon_svg`: generate an icon-only SVG using a Placer composition color.

It also exposes `placer-icons://style-guide` as a read-only MCP resource with approved weights, colors, tokens, and sizes.

## Design Rules

Approved Phosphor weights:

- `regular`: default UI weight.
- `duotone`: feature or active states.

Disallowed weights: `thin`, `light`, `bold`, and `fill`.

Compositions:

| Composition | Icon | Background | Border |
| --- | --- | --- | --- |
| `brand` | `#5E63E5` / `--placer-purple` | `#DEE6FD` / `--placer-purple-tint-100` | |
| `yellow` | `#FFBE5E` / `--placer-yellow` | `#FFF3D6` / `--seq-1` | |
| `coral` | `#CA562C` / `--div-1` | `#FDE0E0` / coral tint | |
| `teal` | `#007F80` / `--div-7` | `#D1EEEA` / `--seq-teal-6-1` | |
| `dark` | `#FFFFFF` | `#333333` / `--placer-black` | |
| `outline` | `#333333` / `--placer-black` | `#FFFFFF` | `#E5E5E5` / `--placer-border-default` |

Sizes:

| Alias | Pixels |
| --- | ---: |
| `sm` | 16 |
| `md` | 20 |
| `lg` | 24 |
| `xl` | 32 |
| `2xl` | 48 |

## Build

```bash
npm install
npm run build
npm run smoke
```

## Add To Claude Code

For your own machine, install it as a user-scoped stdio server:

```bash
claude mcp add --transport stdio --scope user placer-icons -- node "/Users/james.patton/Documents/New project/dist/server.js"
```

## Add To Claude Desktop

Run the installer command, then fully quit and reopen Claude Desktop:

```bash
npx -y github:jpatt0n/placer-phosphor-icons-mcp placer-icons-install-claude-desktop
```

The installer preserves your existing Claude Desktop preferences and MCP servers, and adds this entry to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "placer-icons": {
      "command": "npx",
      "args": [
        "--yes",
        "--package",
        "github:jpatt0n/placer-phosphor-icons-mcp",
        "placer-phosphor-icons-mcp"
      ]
    }
  }
}
```

Once the package is published to npm, anyone can install it without cloning the repo:

```bash
claude mcp add --transport stdio --scope user placer-icons -- npx -y @jpatt0n/placer-phosphor-icons-mcp
```

Before npm publishing, users can install directly from GitHub:

```bash
claude mcp add --transport stdio --scope user placer-icons -- npx -y github:jpatt0n/placer-phosphor-icons-mcp
```

Then verify it inside Claude Code:

```text
/mcp
```

Example Claude Code prompts:

```text
Use the placer-icons MCP server to find a target icon and return the outline tile SVG.
```

```text
Use placer-icons to create a teal duotone map-pin tile at lg size.
```

## Project-Scoped Config

For team use in a repository, commit a `.mcp.json` that points at a stable install path or at a published npm package.

Local path example:

```json
{
  "mcpServers": {
    "placer-icons": {
      "type": "stdio",
      "command": "node",
      "args": ["${PLACER_ICONS_MCP_PATH}/dist/server.js"]
    }
  }
}
```

Each user would set:

```bash
export PLACER_ICONS_MCP_PATH="/path/to/placer-phosphor-icons-mcp"
```

Published package example:

```json
{
  "mcpServers": {
    "placer-icons": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@jpatt0n/placer-phosphor-icons-mcp"]
    }
  }
}
```

Claude Code prompts users to approve project-scoped MCP servers before first use.

## How It Works

The server reads SVG assets from `@phosphor-icons/core`, filters the catalog to the two approved weights, and wraps the selected icon paths in Placer color/tile SVG markup. All tools are read-only and deterministic.

The MCP transport is stdio because this is a local asset utility. If you later want a hosted icon service with auth or analytics, convert the server to Streamable HTTP and add OAuth or API-token checks.
