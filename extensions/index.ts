import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Common es.exe installation locations
const DEFAULT_ES_PATHS: string[] = [
  process.env.EVERYTHING_ES_PATH ?? "",
  "C:\\Program Files\\Everything\\es.exe",
  "C:\\Program Files (x86)\\Everything\\es.exe",
  // User local bin (common for scoop, manual install)
  process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}\\bin\\es.exe` : "",
  process.env.USERPROFILE ? `${process.env.USERPROFILE}\\.local\\bin\\es.exe` : "",
].filter(Boolean);

// Find es.exe executable
async function findEsExe(): Promise<string | null> {
  for (const path of DEFAULT_ES_PATHS) {
    try {
      await execFileAsync(path, ["-version"]);
      return path;
    } catch {
      continue;
    }
  }
  return null;
}

export default function (pi: ExtensionAPI) {
  let esPath: string | null = null;

  pi.on("session_start", async () => {
    esPath = await findEsExe();
  });

  pi.registerTool({
    name: "everything_search",
    label: "Everything Search",
    description:
      "Search for files and folders using Everything (超快的 Windows 文件搜索工具). " +
      "支持通配符: * 匹配任意字符, ? 匹配单个字符. " +
      "示例: '*.ts' 找所有 TypeScript 文件, 'report*' 找以 report 开头的文件. " +
      "Windows 用户需要先安装 Everything 并启用 HTTP/IPC 服务器，或下载 es.exe 命令行工具。",
    promptSnippet: "Search files instantly using Everything index",
    promptGuidelines: [
      "Use this tool for fast file searches when the user needs to find files by name or pattern.",
      "This tool is much faster than `find` for Windows because it uses Everything's pre-built index.",
    ],
    parameters: Type.Object({
      query: Type.String({
        description:
          "搜索关键词或模式。支持通配符: * (任意字符) 和 ? (单个字符)。例如: '*.ts', 'report*', 'data?.csv'",
      }),
      max_results: Type.Optional(
        Type.Number({
          description: "最大返回结果数 (默认 100)",
          default: 100,
        })
      ),
      path_filter: Type.Optional(
        Type.String({
          description: "限定搜索路径，例如 'C:\\Users\\kkk\\projects'",
        })
      ),
      case_sensitive: Type.Optional(
        Type.Boolean({
          description: "是否区分大小写 (默认 false)",
          default: false,
        })
      ),
      regex: Type.Optional(
        Type.Boolean({
          description: "使用正则表达式搜索 (默认 false)",
          default: false,
        })
      ),
      folders_only: Type.Optional(
        Type.Boolean({
          description: "只返回文件夹 (默认 false)",
          default: false,
        })
      ),
      files_only: Type.Optional(
        Type.Boolean({
          description: "只返回文件 (默认 false)",
          default: false,
        })
      ),
    }),
    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      // Check if running on Windows
      if (process.platform !== "win32") {
        return {
          content: [
            {
              type: "text",
              text: "Everything 搜索工具仅支持 Windows 系统。",
            },
          ],
          isError: true,
        };
      }

      // Find es.exe
      if (!esPath) {
        esPath = await findEsExe();
      }

      if (!esPath) {
        return {
          content: [
            {
              type: "text",
              text:
                "❌ 未找到 es.exe 命令行工具。\n\n" +
                "请按以下步骤安装:\n" +
                "1. 下载 es.exe: https://www.voidtools.com/support/everything/command_line_interface/\n" +
                "2. 将 es.exe 放到 Everything 安装目录 (如 C:\\Program Files\\Everything\\)\n" +
                "3. 或者设置环境变量 EVERYTHING_ES_PATH 指向 es.exe 的完整路径\n\n" +
                "确保 Everything 正在运行。",
            },
          ],
          isError: true,
        };
      }

      // Build command arguments
      const args: string[] = [];

      // Result count limit
      args.push("-n", String(params.max_results ?? 100));

      // Path filter - convert backslashes to forward slashes to avoid Node.js argument parsing issues
      if (params.path_filter) {
        args.push("-path", params.path_filter.replace(/\\/g, "/"));
      }

      // Case sensitive
      if (params.case_sensitive) {
        args.push("-case");
      }

      // Regex mode
      if (params.regex) {
        args.push("-regex");
      }

      // Build search query using Everything search syntax
      let searchQuery = params.query;

      // Use search syntax instead of command line flags (more reliable)
      if (params.folders_only) {
        searchQuery = `folder:${searchQuery}`;
      }
      if (params.files_only) {
        searchQuery = `file:${searchQuery}`;
      }

      // Add search query
      args.push(searchQuery);

      try {
        const { stdout, stderr } = await execFileAsync(esPath, args, {
          signal,
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          timeout: 30000, // 30s timeout
        });

        if (stderr && !stdout) {
          return {
            content: [{ type: "text", text: `搜索错误: ${stderr}` }],
            isError: true,
          };
        }

        const results = stdout
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);

        if (results.length === 0) {
          return {
            content: [
              { type: "text", text: `未找到匹配 "${params.query}" 的结果。` },
            ],
          };
        }

        // Format output
        const output =
          `🔍 Everything 搜索结果 (查询: "${params.query}")\n` +
          `找到 ${results.length} 个结果:\n\n` +
          results.map((r) => `  ${r}`).join("\n");

        return {
          content: [{ type: "text", text: output }],
          details: {
            query: params.query,
            count: results.length,
            results: results.slice(0, 1000), // Limit details size
          },
        };
      } catch (error: any) {
        if (error.name === "AbortError") {
          return {
            content: [{ type: "text", text: "搜索已取消。" }],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: "text",
              text: `搜索失败: ${error.message}\n\n请确保 Everything 正在运行。`,
            },
          ],
          isError: true,
        };
      }
    },
  });

  // Register convenience command
  pi.registerCommand("es", {
    description: "使用 Everything 快速搜索文件",
    handler: async (args, ctx) => {
      if (!args) {
        ctx.ui.notify("用法: /es <搜索词>", "info");
        return;
      }
      // Send to agent for processing
      pi.sendUserMessage(`使用 everything_search 工具搜索: ${args}`);
    },
  });
}