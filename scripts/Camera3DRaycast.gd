extends Camera3D
var Result = load("res://scripts/utils/Result.gd")

func shoot_ray() -> Result:
	var mouse_position: Vector2 = get_viewport().get_mouse_position()
	var ray_length: float = 1000
	var from:Vector3 = project_ray_origin(mouse_position)
	var to:Vector3 = from + project_ray_normal(mouse_position) * ray_length
	var space: PhysicsDirectSpaceState3D = get_world_3d().direct_space_state
	var ray_query: PhysicsRayQueryParameters3D = PhysicsRayQueryParameters3D.create(from, to)
	var raycast_result: Dictionary = space.intersect_ray(ray_query)
	
	if raycast_result.size() == 0:
		return Result.error(0)

	var y = int(str(raycast_result.collider.get_parent().get_parent().name))

	var tile: Vector3i = Vector3i(floori(raycast_result.position[0]/2), y, floori(raycast_result.position[2]/2))
	
	if tile.x >= 10 or tile.z >= 10 or tile.x < 0 or tile.z < 0:
		return Result.error(0)
	
	return Result.ok(tile)

func _process(delta):
	var result: Result = shoot_ray()
	var selector: Node3D = get_node("../selector")
	selector.set_goal(result)
 
