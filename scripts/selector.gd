extends Node3D
var Result = load("res://scripts/utils/Result.gd")


var goal = Vector3(1,1,1)
const speed: float = 3.5
var view = false
const big_scale = Vector3(1,1,1)
const scale_speed = 15


func _process(delta):
	var goal_scale: Vector3
	if view:
		goal_scale = big_scale
	else: 
		goal_scale = Vector3.ZERO
	
	var scale_movement = goal_scale - self.scale
	self.scale = scale_movement * delta * scale_speed + self.scale
	
	if view:
		var movement = (goal - self.position)
		if movement.length() > 0.22:
			movement *= 3
		movement *= max(sqrt(movement.length()),0.25) + 0.75 # a lil speed boost when far away
		self.position = movement * delta * speed + self.position
#

func set_goal(position: Result):
	if position.is_ok():
		goal = position.unwrap()
		if !view:
			self.position = goal
			view = true
	else:
		view = false
