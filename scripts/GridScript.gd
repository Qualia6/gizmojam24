extends GridMap

var velocity = 0
var sound_going = false
var remove_last = false

func _ready():
	velocity = 0
	
func modify_velocity(amount):
	velocity += amount
	
func set_velocity(value):
	velocity = value

func get_velocity():
	return velocity

func _process(delta):
	if abs(velocity) > 20 != sound_going:
		sound_going = abs(velocity) > 20
		if sound_going:
			$WindSound.play()
		else:
			$WindSound.stop()
	if sound_going:
		$WindSound.pitch_scale = abs(velocity) / 100
	
	
	if abs(velocity) > 300:
		velocity /= abs(velocity)
	position.y += velocity * delta
	#velocity = 0
	velocity /= exp(delta * 8)

func set_item(where, what):
	set_cell_item(where, what[0], what[1])
	
const EMPTY = [-1,-1]
const X_END = [0,0]
const Z_END = [0,20]
const NEG_X_END = [0,2]
const NEG_Z_END = [0,17]
const ACE = [3,0]
const X_STRAIGHT = [1,8]
const Z_STRAIGHT = [1,20]
const X_BI = [2,20]
const Z_BI = [2,2]
const NEG_X_BI = [2,22]
const NEG_Z_BI = [2,8]
const GAY = [4,18]
const X_GAY = [4,8]
const Z_GAY = [4,2]
const X_Z_GAY = [4,20]

func can_affect_X(_tile, state):
	if state == NEG_X_BI:
		return false
	return true
	
func can_affect_NEG_Z(_tile, state):
	if state == Z_BI:
		return false
	return true
	
func can_affect_Z(_tile, state):
	if state == NEG_Z_BI:
		return false
	return true
	
func can_affect_NEG_X(_tile, state):
	if state == X_BI:
		return false
	return true

func affect_X(tile, state):
	if state == EMPTY:
		set_item(tile, NEG_X_END)
	elif state == X_END:
		set_item(tile, X_STRAIGHT)
	elif state == NEG_Z_END:
		set_item(tile, X_Z_GAY)
	elif state == Z_END:
		set_item(tile, X_GAY)
	elif state == Z_STRAIGHT: 
		set_item(tile, X_BI)
	elif state == GAY:
		set_item(tile, NEG_Z_BI)
	elif state == Z_GAY:
		set_item(tile, Z_BI)
	else:
		remove_last = true
	# remove
		if state == X_STRAIGHT:
			set_item(tile, X_END)
		elif state == NEG_X_END:
			set_item(tile, EMPTY)
		elif state == X_Z_GAY:
			set_item(tile, NEG_Z_END)
		elif state == X_GAY:
			set_item(tile, Z_END)
		elif state == X_BI:
			set_item(tile, Z_STRAIGHT)
		elif state == NEG_Z_BI:
			set_item(tile, GAY)
		elif state == Z_BI:
			set_item(tile, Z_GAY)
	
func affect_Z(tile, state):
	# add
	if state == EMPTY:
		set_item(tile, NEG_Z_END)
	elif state == Z_END:
		set_item(tile, Z_STRAIGHT)
	elif state == NEG_X_END:
		set_item(tile, X_Z_GAY)
	elif state == X_END:
		set_item(tile, Z_GAY)
	elif state == X_STRAIGHT:
		set_item(tile, Z_BI)
	elif state == GAY:
		set_item(tile, NEG_X_BI)
	elif state == X_GAY:
		set_item(tile, X_BI)
	# remove
	else:
		remove_last = true
		if state == Z_STRAIGHT:
			set_item(tile, Z_END)
		elif state == NEG_Z_END:
			set_item(tile, EMPTY)
		elif state == X_Z_GAY:
			set_item(tile, NEG_X_END)
		elif state == Z_GAY:
			set_item(tile, X_END)
		elif state == Z_BI:
			set_item(tile, X_STRAIGHT)
		elif state == NEG_X_BI:
			set_item(tile, GAY)
		elif state == X_BI:
			set_item(tile, X_GAY)
	
func affect_NEG_X(tile, state):
	# ad
	if state == EMPTY:
		set_item(tile, X_END)
	elif state == NEG_X_END:
		set_item(tile, X_STRAIGHT)
	elif state == NEG_Z_END:
		set_item(tile, Z_GAY)
	elif state == Z_END:
		set_item(tile, GAY)
	elif state == Z_STRAIGHT:
		set_item(tile, NEG_X_BI)
	elif state == X_GAY:
		set_item(tile, NEG_Z_BI)
	elif state == X_Z_GAY:
		set_item(tile, Z_BI)
	# remove
	else:
		remove_last = true
		if state == X_STRAIGHT:
			set_item(tile, NEG_X_END)
		elif state == X_END:
			set_item(tile, EMPTY)
		elif state == Z_GAY:
			set_item(tile, NEG_Z_END)
		elif state == GAY:
			set_item(tile, Z_END)
		elif state == NEG_X_BI:
			set_item(tile, Z_STRAIGHT)
		elif state == NEG_Z_BI:
			set_item(tile, X_GAY)
		elif state == Z_BI:
			set_item(tile, X_Z_GAY)
	
func affect_NEG_Z(tile, state):
	# add
	if state == EMPTY:
		set_item(tile, Z_END)
	elif state == NEG_Z_END:
		set_item(tile, Z_STRAIGHT)
	elif state == NEG_X_END:
		set_item(tile, X_GAY)
	elif state == X_END:
		set_item(tile, GAY)
	elif state == X_STRAIGHT:
		set_item(tile, NEG_Z_BI)
	elif state == Z_GAY:
		set_item(tile, NEG_X_BI)
	elif state == X_Z_GAY:
		set_item(tile, X_BI)
	# remove
	else:
		remove_last = true
		if state == Z_STRAIGHT:
			set_item(tile, NEG_Z_END)
		elif state == Z_END:
			set_item(tile, EMPTY)
		elif state == X_GAY:
			set_item(tile, NEG_X_END)
		elif state == GAY:
			set_item(tile, X_END)
		elif state == NEG_Z_BI:
			set_item(tile, X_STRAIGHT)
		elif state == NEG_X_BI:
			set_item(tile, Z_GAY)
		elif state == X_BI:
			set_item(tile, X_Z_GAY)



func modify(fake_tile: Vector3i, previous: Result):
	var tile = fake_tile
	tile.y = 0
	var curr = [get_cell_item(tile),get_cell_item_orientation(tile)]
	
	if previous.is_err():
		return
	
	var prev_tile: Vector3i = previous.unwrap()
	prev_tile.y = 0
	var translation = tile - prev_tile
	
	var prev = [get_cell_item(prev_tile), get_cell_item_orientation(prev_tile)]

	remove_last = false

	if translation == Vector3i(1,0,0):
		if can_affect_NEG_X(tile, curr) and can_affect_X(prev_tile, prev):
			$PipeSound.play()
			affect_NEG_X(tile,curr)
			affect_X(prev_tile, prev)
		
	elif translation == Vector3i(-1,0,0):
		if can_affect_X(tile, curr) and can_affect_NEG_X(prev_tile, prev):
			$PipeSound.play()
			affect_X(tile,curr)
			affect_NEG_X(prev_tile, prev)
		
	elif translation == Vector3i(0,0,1):
		if can_affect_NEG_Z(tile, curr) and can_affect_Z(prev_tile, prev):
			$PipeSound.play()
			affect_NEG_Z(tile,curr)
			affect_Z(prev_tile, prev)
		
	elif translation == Vector3i(0,0,-1):
		if can_affect_Z(tile, curr) and can_affect_NEG_Z(prev_tile, prev):
			$PipeSound.play()
			affect_Z(tile,curr)
			affect_NEG_Z(prev_tile, prev)
			
			
	print ("remove last: " +str(remove_last))
	print(name)
	print(translation)
	if remove_last:
		$PipeSound.pitch_scale = 1.1
	else:
		$PipeSound.pitch_scale = 0.9

func _input(event):
	if event.is_action_pressed("clear"):
		for x in range(10): for z in range(10):
			set_item(Vector3i(x,0,z), EMPTY)
