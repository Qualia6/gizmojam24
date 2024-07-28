## Setup

- Godot blender imports
  - Settings: Set blender path, RPC Port: 6011 (default), PRC Server Uptime: 5s (default)
  - [Godot fails to import blend files from Blender 4.2 · Issue #92365 · godotengine/godot](https://github.com/godotengine/godot/issues/92365)
  - CONCLUSION: Downgrade to Blender 4.1 until fixed in Godot
  - Fixed in Godot 4.3.x
- Building and running
  - Building: Project -> Export... -> Web (download if necessary)
  - Running: Remote Debug -> Run in Browser
