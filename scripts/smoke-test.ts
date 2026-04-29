import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/server.js"],
  stderr: "pipe"
});

const client = new Client({
  name: "placer-phosphor-icons-smoke-test",
  version: "1.0.0"
});

await client.connect(transport);

const tools = await client.listTools();
const toolNames = tools.tools.map((tool) => tool.name);
if (!toolNames.includes("list_icons") || !toolNames.includes("get_icon_tile_svg")) {
  throw new Error(`Expected icon tools were not registered. Got: ${toolNames.join(", ")}`);
}

const resources = await client.listResources();
if (!resources.resources.some((resource) => resource.uri === "placer-icons://style-guide")) {
  throw new Error("Expected placer-icons://style-guide resource.");
}

const listResult = await client.callTool({
  name: "list_icons",
  arguments: {
    query: "chart line",
    limit: 3
  }
});

const tileResult = await client.callTool({
  name: "get_icon_tile_svg",
  arguments: {
    icon: "chart-line-up",
    composition: "brand",
    weight: "regular",
    size: "lg"
  }
});

const content = JSON.stringify(tileResult.content);
if (!content.includes("#5E63E5") || !content.includes("#DEE6FD") || !content.includes("<svg")) {
  throw new Error("Generated tile SVG did not include expected brand colors and SVG markup.");
}

console.log(
  JSON.stringify(
    {
      tools: toolNames,
      resources: resources.resources.map((resource) => resource.uri),
      listResult: listResult.structuredContent,
      tilePreview: tileResult.structuredContent
    },
    null,
    2
  )
);

await client.close();
