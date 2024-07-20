extends Node3D
#var Result = load("res://scripts/utils/Result.gd")
#
## Called when the node enters the scene tree for the first time.
#func _ready():
	#pass # Replace with function body.
#
#var tile = Vector3i(0,0,0)
#var grid = null
#var goal = Vector3i(1,1,1)
#const speed: float = 3.5
#var view = false
#const big_scale = Vector3(1,1,1)
#const scale_speed = 15
#var previous = Result.error(0)
#
#func update_goal():
	#if view:
		#goal = Vector3(tile.x, 0, tile.z) * 2 + Vector3(1,1 + grid.position.y,1)
#
## Called every frame. 'delta' is the elapsed time since the previous frame.
#func _process(delta):
	#update_goal()
	#
	#var goal_scale: Vector3
	#if view:
		#goal_scale = big_scale
	#else: 
		#goal_scale = Vector3.ZERO
	#
	#var scale_movement = goal_scale - self.scale
	#self.scale = scale_movement * delta * scale_speed + self.scale
	#
	#
	#if view:
		#var movement = (goal - self.position)
		#if movement.length() > 0.22:
			#movement *= 3
		##movement *= max(sqrt(movement.length()),0.25) + 0.75 # a lil speed boost when far away
		#self.position = movement * delta * speed + self.position
#
#func set_goal(position: Result):
	#if position.is_ok():
		#tile = position.unwrap()
		#grid = get_node("../Grids").get_child(tile.y)
		#update_goal()
		#if !view:
			#self.position = goal
			#view = true
			#
		#if previous.is_err() or previous.unwrap() != tile:
			##if Input.is_action_pressed("mb_left"):
				##grid.modify(tile, previous)
				##previous = Result.ok(tile)
			##else:
				#if previous.is_ok():
					#previous = Result.error(0)
	#else:
		#if view:
			#previous = Result.error(0)
			#view = false
			#grid = null
