extends CanvasLayer

const dummy_tools = [
	{"id": 0, "name": "pipetool", "display_name": "Pipe", "icon": "pipe_galvanized"},
	{"id": 1, "name": "sandtool", "display_name": "Sand", "icon": "sand"},
	{"id": 2, "name": "copy", "display_name": "Copy", "icon": "clipboard_empty"},
	{"id": 3, "name": "paste", "display_name": "Paste", "icon": "clipboard_papers"}
]

func make_tool(tool_dict):
	var container = PanelContainer.new()
	var margin = MarginContainer.new()
	var vbox = VBoxContainer.new()
	var tool = TextureButton.new()
	var label = Label.new()

	container.custom_minimum_size.x = 80
	container.custom_minimum_size.y = 80
	tool.texture_normal = load("res://ui/%s.png" % tool_dict.icon)
	tool.size_flags_vertical = Control.SIZE_EXPAND_FILL
	tool.stretch_mode = tool.STRETCH_KEEP_ASPECT_CENTERED
	label.text = tool_dict.display_name
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.alignment = vbox.ALIGNMENT_CENTER

	vbox.add_child(tool)
	vbox.add_child(label)
	margin.add_child(vbox)
	container.add_child(margin)
	return container

func populate_toolbox(tools_dict):
	for tool_dict in tools_dict:
		var tool = make_tool(tool_dict)
		$Toolbox/HBox_Toolbox.add_child(tool)

func _ready() -> void:
	populate_toolbox(dummy_tools)

func _process(delta: float) -> void:
	pass
