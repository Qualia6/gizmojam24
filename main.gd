extends Node3D

func _init():
	var simulation = FileAccess.open("res://js/game.js", FileAccess.READ)
	JavaScriptBridge.eval(simulation.get_as_text())


# Called when the node enters the scene tree for the first time.
func _ready():
	pass # Replace with function body.


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta):
	pass
