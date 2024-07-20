extends Node3D

var x_size: int
var y_index: int
var z_size: int

func set_size(x,z):
	y_index = int(str(name))
	x_size = x
	z_size = z
	var box = BoxShape3D.new()
	box.extents.x = x
	box.extents.y = 1
	box.extents.z = z
	$StaticBody3D/CollisionShape3D.shape = box
	$StaticBody3D.position = Vector3(x,0,z)
	
func set_cell(x,z, display):
	print(str(x) + " " + str(z) + " " + str(display))
	var item = (display & 0b1111111111) - 1
	var orientation = display >> 10
	$GridMap.set_cell_item(Vector3i(x,0,z), item, orientation)

# Called when the node enters the scene tree for the first time.
#func _ready():
	#pass # Replace with function body.

func display_all(jsDisplay):
	print("displaying " + name)
	var flat_size: int = x_size * z_size
	var start_index: int = flat_size * y_index
	var stop_index: int = start_index + flat_size
	for i in range(start_index, stop_index):
		var x: int = i % x_size
		var z: int = (i % flat_size) / x_size
		var display:int = jsDisplay.decode_u16(i)
		set_cell(x,z,display)

# Called every frame. 'delta' is the elapsed time since the previous frame.
#func _process(delta):
	#pass
