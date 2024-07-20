extends Node3D
var grid_better = preload("res://gird_better.tscn")

func resetToSize(x, y, z):
	var children = get_children()
	for child in children:
		remove_child(child)
	for i in range(y):
		var child = grid_better.instantiate()
		child.position.y = i * 4
		child.name = str(i)
		child.set_size(x,z)
		add_child(child)

func display_single(x, y, z, display):
	get_child(y).set_cell(x, z, display)

func display_all():
	print("starting display all")
	var children = get_children()
	for child in children:
		child.display_all(jsData.display)

var jsData

func _ready():
	jsData = JavaScriptBridge.get_interface("Simulation")
	print(str(jsData.size_x))
	resetToSize(jsData.size_x, jsData.size_y, jsData.size_z)
	display_all()
	#$grid_better1.set_size(4,4)
	#$grid_better1.set_cell(0,0,0)
	#$grid_better1.set_cell(0,1,1)
	#$grid_better1.set_cell(0,2,2)
	#$grid_better1.set_cell(0,3,1026)
	#$grid_better1.set_cell(1,0,1025)
	#display_single(0,0,0,1)
	#display_single(0,0,1,2)
	#display_single(0,1,0,1026)
	#display_single(3,0,0,1025)
	#display_single(15,2,15,1026)

#
#var grids = 4
#const ideal_height = 0
#const padding_spacing = 4 # when forces against eachother start
#const acounted_spacing = 3 # how much space it should hav in the end
#const blocked_spacing = 2 # below this and then instantainous vecolity transfer
#const max_spacing = 20
#var selected = 0
#const padding_speed = 20
#const pry_speed = 4
#
#
#func _ready():
	#grids = get_child_count()

	#
	#
#
## Called every frame. 'delta' is the elapsed time since the previous frame.
#func _process(delta):
	#var ceiling = (ideal_height + (grids - selected - 1) * acounted_spacing + max_spacing)
	#var floor = (ideal_height - selected * acounted_spacing)
	#
	#for i in range(4):
		#var grid = get_child(i)
		#
		#var bottom: float
		#if i != 0:
			#var grid_below = get_child(i-1)
			#bottom = grid_below.position.y
		#else:
			#bottom = floor
		#var spacing_below = grid.position.y - bottom
		#
		#var  top:float
		#if i != grids - 1:
			#var grid_above = get_child(i+1)
			#top = grid_above.position.y
		#else:
			#top = ceiling
		#var spacing_above = top - grid.position.y
		#
		#var padding_push = min(spacing_above - padding_spacing,0) + max(padding_spacing - spacing_below,0)
		#
		#padding_push *= (abs(padding_push) + 1) * (abs(padding_push) + 1)
		#
		#grid.modify_velocity(padding_push * delta * padding_speed)
		#
		#if i == selected:
			#var ideal_location = ideal_height
			#var pry_push = ideal_location - grid.position.y
			#pry_push *= abs(pry_push) + 1
			#pry_push = min(pry_push, 0)
			#grid.modify_velocity(pry_push * delta * pry_speed)
			##
		#if i - 1== selected:
			#var ideal_location = ideal_height + max_spacing
			#var pry_push = ideal_location - grid.position.y
			#pry_push *= abs(pry_push) + 1
			#pry_push = max(pry_push, 0)
			#grid.modify_velocity(pry_push * delta * pry_speed)
			#
		#if spacing_below < blocked_spacing and i != 0:
			##grid.position.y = bottom + blocked_spacing
			#var grid_below = get_child(i-1)
			#var v = grid_below.get_velocity()
			#var v2 = grid.get_velocity()
			#grid_below.set_velocity(min(v,v2))
			#grid.set_velocity(max(v,v2))
			#get_node("../ScrollSound").play()
		#
		#if spacing_above < blocked_spacing and i != grids - 1:
			##grid.position.y = top - blocked_spacing
			#var grid_above = get_child(i+1)
			#var v = grid_above.get_velocity()
			#var v2 = grid.get_velocity()
			#grid_above.set_velocity(max(v,v2))
			#grid.set_velocity(min(v,v2))
			#get_node("../ScrollSound").play()
#
#func _input(event):
	#if event.is_action_pressed("scroll_up") and selected + 1 < grids:
		#selected+=1
		##get_node("../ScrollSound").play()
	#elif event.is_action_pressed("scroll_down") and selected > 0:
		#selected-=1
		#get_node("../ScrollSound").play()
