class_name Result
var value
var state: bool

static func ok(value):
	var result = Result.new()
	result.value = value
	result.state = true
	return result
	
static func error(value):
	var result = Result.new()
	result.value = value
	result.state = false
	return result
	
func unwrap():
	return value
	
func is_ok() -> bool:
	return state

func is_err() -> bool:
	return !state
