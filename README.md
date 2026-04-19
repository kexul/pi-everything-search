# pi-everything-search

[Everything](https://www.voidtools.com/) search extension for [pi](https://github.com/badlogic/pi-mono) coding agent.

Lightning fast file search on Windows using Everything's pre-built index.

## Installation

### Prerequisites

1. Install [Everything](https://www.voidtools.com/) (free)
2. Download [es.exe](https://www.voidtools.com/support/everything/command_line_interface/) (command line interface)
3. Place `es.exe` in one of these locations:
   - `C:\Program Files\Everything\es.exe`
   - `%LOCALAPPDATA%\bin\es.exe`
   - `%USERPROFILE%\.local\bin\es.exe`
   - Or set `EVERYTHING_ES_PATH` environment variable

4. Ensure Everything is running with IPC server enabled:
   - Everything → Tools → Options → HTTP/IPC Server
   - Enable "IPC server"

### Install via pi

```bash
pi install git:github.com/kexul/pi-everything-search
```

Or install from npm after publishing:

```bash
pi install npm:pi-everything-search
```

## Usage

The extension registers the `everything_search` tool and `/es` command.

### Tool Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | required | Search pattern (supports `*` and `?` wildcards) |
| `max_results` | number | 100 | Maximum results to return |
| `path_filter` | string | - | Limit search to specific path |
| `case_sensitive` | boolean | false | Case sensitive search |
| `regex` | boolean | false | Use regex instead of wildcards |
| `folders_only` | boolean | false | Only return folders |
| `files_only` | boolean | false | Only return files |

### Examples

```bash
# In pi, ask the agent:
"搜索所有 TypeScript 文件"                    # → *.ts
"找一下 C:\projects 下的 README 文件"          # → path_filter + README*
"只找文件夹，名叫 node_modules"                # → folders_only
```

### Command

```bash
/es *.ts              # Quick search via command
/es --help            # Show usage
```

## Why Everything?

| Tool | Speed | Index |
|------|-------|-------|
| `find` | Slow (scans disk) | No index |
| Everything | Instant | Pre-built index |

Everything indexes all files on your drive and updates in real-time. Searches complete in milliseconds, even across millions of files.

## License

MIT