extends Node3D
var Result = load("res://scripts/utils/Result.gd")

func _init():
	var simulation = FileAccess.open("res://js/game.js", FileAccess.READ)
	JavaScriptBridge.eval(simulation.get_as_text())

var jsSimulation

func _ready():
	jsSimulation = JavaScriptBridge.get_interface("Simulation")
	$Grids.resetToSize(jsSimulation.x_size(), jsSimulation.y_size(), jsSimulation.z_size())
	$Camera3D.rotation_center = Vector3(jsSimulation.x_size(), 10, jsSimulation.z_size())
	$Camera3D.rotation_distance = sqrt(pow(jsSimulation.x_size(),2) + pow(jsSimulation.y_size(),2)) * 2
	

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta):
	
	jsSimulation.tick()
	var raycast_result = $Camera3D.shoot_ray()
	if raycast_result.is_ok():
		var raycast_position = raycast_result.unwrap()
		#$Selector.view = true
		$Selector.set_goal(Result.ok(Vector3(raycast_position.x*2+1,$Grids.convertY(raycast_position.y),raycast_position.z*2+1)))
		
		var i = jsSimulation.getPosition(raycast_position.x, raycast_position.z, raycast_position.y)
		#print(i)
		var tool = jsSimulation.tickTool(Input.is_action_pressed("mb_left"), Input.is_action_pressed("z"), Input.is_action_pressed("x"), i)
	else:
		$Selector.set_goal(Result.error(0))
