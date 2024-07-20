// x_size_power + y_size_power + z_size_power should be <= 27 but >= 3
const x_size_power = 4
const y_size_power = 4
const z_size_power = 2
const x_size = 1 << (x_size_power)
const y_size = 1 << (y_size_power)
const z_size = 1 << (z_size_power)
const size_power = x_size_power + y_size_power + z_size_power
const size = 1 << size_power
const flat_size_power = x_size_power + y_size_power
const flat_size = 1 << flat_size_power
const z_bit_mask = size - flat_size
const y_bit_mask = flat_size - x_size
const x_bit_mask = x_size - 1

const CONSTRUCTOR_FLAG = 0b1
const UPDATE_FLAG = 0b10
const TICK_FLAG = 0b100
const DECONSTRUCTOR_FLAG = 0b1000

const totalSaveableBytes = size * (4 + 1 + 2 + 1 + 2)
const everythingSaveable = new ArrayBuffer(totalSaveableBytes)
const temperatures = new Uint32Array(everythingSaveable, 0, size).fill(2_000_000000) // consider increments of 1_000000 to be a single degree
const types = new Uint8Array(everythingSaveable, size * 4, size)
const data0 = new Uint8Array(everythingSaveable, size * (4 + 1), size) // more data arrays can be added and will work exactly as you exact as long as they are size size
const data1 = new Uint16Array(everythingSaveable, size * (4 + 1 + 1), size)
// const data2 = new Uint16Array(everythingSaveable, size*(4+1+1+2), size)

const tags = new Uint32Array(size)

const display = new Uint16Array(size) // 6 most significant bits are the orientation
let displayChangedQueue = new Uint32Array(16) // 16 is random choice - will be dynamically made larger when needed
// if needed i can add a dontDisplayQueue to only add things to the queue at most once. rn performance it doesn't seem worth the effort to add it
let displayQueuePosition = 0

// this manages the queue
// dontQueue is just bit for every cell in the world - if its high then its already queued (ensures that something can only be queued once)
// updateQueued is an array of all the cells that need updates. The most significant 2 bits represent the direction that the update came from (0-up, 1-right, 2-down, 3-left)
// queue position is the index in the queue where the next thing should be added at.
//every tick, the queue is processed - but if new things are added to it during that time they will not be (and will be moved to the front queue for the next tick)
let updateQueued = new Uint32Array(16) // 16 is random choice - will be dynamically made larger when needed
const dontQueue = new DataView(new ArrayBuffer(size >> 3)) // because 8 bits a byte, 2^3=8 so size>>3 bytes has size bits
let queuePosition = 0

/*
TODO:
test deconstructor
test display array
test 3d
test load and save to base 64
test add levels
load level callback
test	tick callback (return true when win)
test	base64 level data
test add tools
connect to godot
	add an array that keeps track of everything that changed its display
	in gdscript access that array, iterate through it, access display, use that as indices to set things
remake the pipe tool in this
test 3d temperature
*/


function saveToBase64() {
	const binaryString = String.fromCharCode.apply(null, new Uint8Array(everythingSaveable));
	return btoa(binaryString);
}

function loadFromBase64(base64) {
	const binaryString = atob(base64);
	const len = binaryString.length;
	if (len != totalSaveableBytes) return false
	const view = new Uint8Array(everythingSaveable);
	for (let i = 0; i < len; i++) {
		view[i] = binaryString.charCodeAt(i);
	}
}

function getQueuedByte(i) {
	const byteOffset = i >> 3// /8
	return dontQueue.getUint8(byteOffset)
}

function isQueued(i, queuedByte) {
	const bitPosition = i & 7// %8
	const maskBit = 1 << bitPosition
	return (queuedByte & maskBit) !== 0
}

function writeFalseQueued(i, queuedByte) {
	const byteOffset = i >> 3// /8
	const bitPosition = i & 7// %8
	const maskNotBit = ~(1 << bitPosition)
	dontQueue.setUint8(byteOffset, queuedByte & maskNotBit)
}

function writeTrueQueued(i, queuedByte) {
	const byteOffset = i >> 3// /8
	const bitPosition = i & 7// %8
	const maskBit = 1 << bitPosition
	dontQueue.setUint8(byteOffset, queuedByte | maskBit)
}

function hasFlag(i, flag) {
	return (flags[types[i]] & flag) !== 0
}

function changeBlock(i, whatNewType, updateEvenIfSameType, evenIfInvalid, dontSendUpdates, dontSendGraphicsUpdates) {
	if (types[i] != i || updateEvenIfSameType) {
		let previousType = types[i]
		let valid = true
		if (hasFlag(i, DECONSTRUCTOR_FLAG)) {
			valid = deconstructorCallbacks[previousType](i)
		}
		if (valid) {
			types[i] = whatNewType
			if (hasFlag(i, CONSTRUCTOR_FLAG)) {
				valid = constructorCallbacks[whatNewType](i)
			}
			if (valid || evenIfInvalid) {
				if (!dontSendUpdates) sendAdjacentUpdates(i)
				if (!dontSendGraphicsUpdates) updateDisplay(i)
			} else {
				types[i] = previousType //if invalid - dont change the type
			}
		}
	}
}

function addUpdateToQueue(i, direction) {
	if (!hasFlag(i, UPDATE_FLAG)) return

	const byte = getQueuedByte(i)
	const dontQueue = isQueued(i, byte)
	if (dontQueue) return
	writeTrueQueued(i, byte)

	const valueToQueue = i | (direction << 27) // the 5 most significant bits are the direction the update came from

	try {
		updateQueued[queuePosition] = valueToQueue;
	} catch (e) { // if updateQueued is toooo smalll - make it bigger
		let newUpdateQueued = new Int32Array(updateQueued.length * 2);
		newUpdateQueued.set(updateQueued);
		updateQueued = newUpdateQueued
		updateQueued[queuePosition] = valueToQueue
	}

	queuePosition++;
}

function isNotPosXEdge(i) {
	return (~i) & x_bit_mask
}

function isNotNegXEdge(i) {
	return i & x_bit_mask
}

function isNotPosYEdge(i) {
	return (~i) & y_bit_mask
}

function isNotNegYEdge(i) {
	return i & y_bit_mask
}

function isNotPosZEdge(i) {
	return (~i) & z_bit_mask
}

function isNotNegZEdge(i) {
	return i & z_bit_mask
}


function movePosX(i) {
	return i + 1
}

function moveNegX(i) {
	return i - 1
}

function movePosY(i) {
	return i + x_size
}

function moveNegY(i) {
	return i - x_size
}

function movePosZ(i) {
	return i + flat_size
}

function moveNegZ(i) {
	return i - flat_size
}

function getPosition(x, y, z) {
	return x + (y << x_size_power) + (z << flat_size_power)
}


function dirIsFaceAdjacent(dir) {
	return dir & 3 === 0 // 00
}

function dirIsEdgeAdjacent(dir) {
	return dir & 1 //_1
}

function dirIsVertAdjacent(dir) {
	return dir & 3 === 2 // 10
}

const dirPosX = 4 * 0
const dirPosXPosY = 1 + 4 * 0
const dirPosY = 4 * 1
const dirNegXPosY = 1 + 4 * 0 + 2
const dirNegX = 4 * 2
const dirNegXNegY = 1 + 4 * 1
const dirNegY = 4 * 3
const dirPosXNegY = 1 + 4 * 1 + 2

const dirPosXPosZ = 1 + 4 * 2
const dirPosXPosYPosZ = 2 + 4 * 0
const dirPosYPosZ = 1 + 4 * 2 + 2
const dirNegXPosYPosZ = 2 + 4 * 1
const dirNegXPosZ = 1 + 4 * 3
const dirNegXNegYPosZ = 2 + 4 * 2
const dirNegYPosZ = 1 + 4 * 3 + 2
const dirPosXNegYPosZ = 2 + 4 * 3

const dirPosZ = 4 * 4

const dirPosXNegZ = 1 + 4 * 4
const dirPosXPosYNegZ = 2 + 4 * 4
const dirPosYNegZ = 1 + 4 * 4 + 2
const dirNegXPosYNegZ = 2 + 4 * 5
const dirNegXNegZ = 1 + 4 * 5
const dirNegXNegYNegZ = 2 + 4 * 6
const dirNegYNegZ = 1 + 4 * 5 + 2
const dirPosXNegYNegZ = 2 + 4 * 7

const dirNegZ = 4 * 5

function sendAdjacentUpdates(i) {
	if (isNotPosXEdge(i)) {
		addUpdateToQueue(movePosX(i), dirPosX)
		// if (isNotPosYEdge(i)) {
		// 	addUpdateToQueue(movePosX(movePosY(i)),dirPosXPosY)
		// 	if (isNotPosZEdge(i)) {
		// 		addUpdateToQueue(movePosX(movePosY(movePosZ(i))),dirPosXPosYPosZ)
		// 	}
		// 	if (isNotNegZEdge(i)) {
		// 		addUpdateToQueue(movePosX(movePosY(moveNegZ(i))),dirPosXPosYNegZ)
		// 	}
		// }
		// if (isNotNegYEdge(i)) {
		// 	addUpdateToQueue(movePosX(moveNegY(i)),dirPosXNegY)
		// 	if (isNotPosZEdge(i)) {
		// 		addUpdateToQueue(movePosX(moveNegY(movePosZ(i))),dirPosXNegYPosZ)
		// 	}
		// 	 if (isNotNegZEdge(i)) {
		// 		addUpdateToQueue(movePosX(moveNegY(moveNegZ(i))),dirPosXNegYNegZ)
		// 	}
		// }
	}
	if (isNotNegXEdge(i)) {
		addUpdateToQueue(moveNegX(i), dirNegX)
		// if (isNotPosYEdge(i)) {
		// 	addUpdateToQueue(moveNegX(movePosY(i)),dirNegXPosY)
		// 	if (isNotPosZEdge(i)) {
		// 		addUpdateToQueue(moveNegX(movePosY(movePosZ(i))),dirNegXPosYPosZ)
		// 	}
		// 	if (isNotNegZEdge(i)) {
		// 		addUpdateToQueue(moveNegX(movePosY(moveNegZ(i))),dirNegXPosYNegZ)
		// 	}
		// }
		// if (isNotNegYEdge(i)) {
		// 	addUpdateToQueue(moveNegX(moveNegY(i)),dirNegXNegY)
		// 	if (isNotPosZEdge(i)) {
		// 		addUpdateToQueue(moveNegX(moveNegY(movePosZ(i))),dirNegXNegYPosZ)
		// 	}
		// 	if (isNotNegZEdge(i)) {
		// 		addUpdateToQueue(moveNegX(moveNegY(moveNegZ(i))),dirNegXNegYNegZ)
		// 	}
		// }
	}
	if (isNotPosYEdge(i)) {
		addUpdateToQueue(movePosY(i), dirPosY)
		// if (isNotPosZEdge(i)) {
		// 	addUpdateToQueue(movePosY(movePosZ(i)),dirPosYPosZ)
		// }
		// if (isNotNegZEdge(i)) {
		// 	addUpdateToQueue(movePosY(moveNegZ(i)),dirPosYNegZ)
		// }
	}
	if (isNotNegYEdge(i)) {
		addUpdateToQueue(moveNegY(i), dirNegY)
		// if (isNotPosZEdge(i)) {
		// 	addUpdateToQueue(moveNegY(movePosZ(i)),dirNegYPosZ)
		// }
		// if (isNotNegZEdge(i)) {
		// 	addUpdateToQueue(moveNegY(moveNegZ(i)),dirNegYNegZ)
		// }
	}
	if (isNotPosZEdge(i)) {
		addUpdateToQueue(movePosZ(i), dirPosZ)
	}
	if (isNotNegZEdge(i)) {
		addUpdateToQueue(moveNegZ(i), dirNegZ)
	}
}

// should return true if a block is placed
// false if it is not valid to place there
const constructorCallbacks = []
const updateCallbacks = []
const tickCallbacks = []
const displayCallbacks = []
const flags = []
const deconstructorCallbacks = []

function updateDisplay(i) {
	let newValue = displayCallbacks[types[i]](i)
	if (newValue === display[i]) return
	display[i] = newValue

	try {
		displayChangedQueue[displayQueuePosition] = i;
	} catch (e) { // if updateQueued is toooo smalll - make it bigger
		let newDisplayChangedQueue = new Int32Array(displayChangedQueue.length * 2);
		newDisplayChangedQueue.set(displayChangedQueue);
		displayChangedQueue = newDisplayChangedQueue
		displayChangedQueue[displayQueuePosition] = i
	}

	displayQueuePosition++;
}

function createDisplay(z, x, y, index) {
	return z << 10 + x << 12 + y << 14 + index
}

const temp = new Int32Array(size)
const temp2 = new Int32Array(size)
function spread(array) { // convolves over the entire thing with a kernel of 121 242 121   242 484 242   121 242 121
	for (let x = 0; x < x_size; x++) { // z axis
		for (let y = 0; y < y_size; y++) {
			let A = array[getPosition(x, y, 1)] >> 6 // do the division now
			let B = array[getPosition(x, y, 0)] >> 6
			let C = 0
			temp[getPosition(x, y, 0)] = A + (B << 1) + B
			for (let z = 1; z < z_size - 1; z++) {
				C = B
				B = A
				A = array[getPosition(x, y, z + 1)] >> 6
				temp[getPosition(x, y, z)] = A + (B << 1) + C
			}
			C = B
			B = A
			temp[getPosition(x, y, z_size - 1)] = B + (B << 1) + C
		}
	}
	for (let x = 0; x < x_size; x++) { // y axis
		for (let z = 0; z < z_size; z++) {
			let A = temp[getPosition(x, 1, z)]
			let B = temp[getPosition(x, 0, z)]
			let C = 0
			temp2[getPosition(x, 0, z)] = A + (B << 1) + B
			for (let y = 1; y < y_size - 1; y++) {
				C = B
				B = A
				A = temp[getPosition(x, y + 1, z)]
				temp2[getPosition(x, y, z)] = A + (B << 1) + C
			}
			C = B
			B = A
			temp2[getPosition(x, y_size - 1, z)] = B + (B << 1) + C
		}
	}
	for (let y = 0; y < y_size; y++) { // x axis
		for (let z = 0; z < z_size; z++) {
			let A = temp2[getPosition(1, y, z)]
			let B = temp2[getPosition(0, y, z)]
			let C = 0
			array[getPosition(0, y, z)] = A + (B << 1) + B + (array[getPosition(0, y, z)] & 0b111111) // to make up for truncating earlier
			for (let x = 1; x < x_size - 1; x++) {
				C = B
				B = A
				A = temp2[getPosition(x + 1, y, z)]
				array[getPosition(x, y, z)] = A + (B << 1) + C + (array[getPosition(x, y, z)] & 0b111111)
			}
			C = B
			B = A
			temp2[getPosition(x_size - 1, y, z)] = B + (B << 1) + C + (array[getPosition(x_size - 1, y, z)] & 0b111111)
		}
	}

}




// let i = 0
// let A = 0
// let B = 0
// let C = 0
// while (i < size) {
// 	A = array[i + 1]
// 	B = array[i]
// 	temp[i] = A + (B<<1) + B
// 	const stopLoop = i + cols - 2
// 	while (i < stopLoop) {
// 		++i
// 		C = B
// 		B = A
// 		A = array[i + 1]
// 		temp[i] = A + (B<<1) + C
// 	}
// 	++i
// 	C = B
// 	B = A
// 	temp[i] = B + (B<<1) + C
// 	++i
// }
// const lastRow = size - cols
// i = 0
// while (i < cols) {
// 	A = temp[i + cols]
// 	B = temp[i]
// 	temp2[i] = roundingDivideBySixteen(A + (B<<1) + B)
// 	const stopLoop = lastRow - cols
// 	while (i < stopLoop) {
// 		i += cols
// 		C = B
// 		B = A
// 		A = temp[i + cols]
// 		temp2[i] = roundingDivideBySixteen(A + (B<<1) + C)
// 	}
// 	i += cols
// 	C = B
// 	B = A
// 	temp2[i] = roundingDivideBySixteen(B + (B<<1) + C)
// 	i -= lastRow - 1
// }
// }

function preformUpdate(queueIndex) {
	const value = updateQueued[queueIndex]
	const fiveMostSignificantBitsMask = ~(0b11111 << 27)
	const i = value & fiveMostSignificantBitsMask
	const direction = value >> 27
	const byte = getQueuedByte(i)
	writeFalseQueued(i, byte) // remove queue mark (important top do this first so that anything else that triggers this to be updated again puts it in the queue to be updated again - next tick)

	if (hasFlag(i, UPDATE_FLAG)) { // incase the block changed since it got queued
		console.log(i, types[i])
		updateCallbacks[types[i]](i, direction)
	}
}

function fulfillUpdateQueue() {
	let stopDoingUpdates = queuePosition // if new updates are added after this point they will be pushed to next tick
	for (let queueIndex = 0; queueIndex < stopDoingUpdates; queueIndex++) {
		preformUpdate(queueIndex)
	}
	// move new updates down so that they are starting at the begining for next tick
	for (let queueIndex = stopDoingUpdates; queueIndex < queuePosition; queueIndex++) {
		updateQueued[queueIndex - stopDoingUpdates] = updateQueued[queueIndex]
	}
	queuePosition -= stopDoingUpdates
}

function tickCells() {
	for (let i = 0; i < size; i++) {
		let type = types[i]
		if (hasFlag(i, TICK_FLAG)) {
			tickCallbacks[type](i)
		}
	}
}

let current_level = -1
const levelData = []
const levelTickCallbacks = []
const levelTitle = []
const levelInstructions = []
const levelLoadCallbacks = []

function tickLevel() {
	if (current_level != -1) {
		return levelTickCallbacks[current_level]()
	} else {
		return false
	}
}

function getLevelTitle() {
	if (current_level != -1) {
		return levelTitle[current_level]
	} else {
		return "Level -1"
	}
}

function getLevelInstructions() {
	if (current_level != -1) {
		return levelInstructions[current_level]
	} else {
		return "meow :3 meow :3 meow :3 meow :3 meow :3 meow :3 meow :3 meow :3 meow :3 meow :3 meow :3 meow :3 meow :3 meow :3 meow :3 meow :3 meow :3 meow :3 meow :3 meow :3 meow :3 "
	}
}

function loadLevel(id) {
	current_level = id
	if (current_level != -1) {
		loadFromBase64(levelData[current_level])
		levelLoadCallbacks[current_level]()
	}
}

function tick() {
	// spread(temperatures)
	tickCells()
	fulfillUpdateQueue()
	return tickLevel()
}

let selectedTool = -1
let availableTools = [] // which tool ids te user has access to
const tools = []

function inputMouseDown(input) {
	return input & 1
}

function inputMouseDownPrevious(input) {
	return input & 2
}

function inputMouseTriggered(input) {
	return inputMouseDown(input) && !inputMouseDownPrevious(input)
}

function inputMouseReleased(input) {
	return !inputMouseDown(input) && inputMouseDownPrevious(input)
}

function inputKeyDown(input) {
	return input & 3
}

function inputKeyDownPrevious(input) {
	return input & 4
}

function inputKeyTriggered(input) {
	return inputKeyDown(input) && !inputKeyDownPrevious(input)
}

function inputKeyReleased(input) {
	return !inputKeyDown(input) && inputKeyDownPrevious(input)
}

class Tool {
	constructor() {
		self.mouse = false
		self.key = false
		self.key2 = false
		self.prev_mouse = false
		self.prev_key = false
		self.prev_key2 = false
		self.prevI = -1
	}
	get mousePressed() {
		return self.mouse && !self.prev_mouse
	}

	get mouseReleased() {
		return !self.mouse && self.prev_mouse
	}

	get keyPressed() {
		return self.key && !self.prev_key
	}

	get keyReleased() {
		return !self.key && self.prev_key
	}

	get key2Pressed() {
		return self.key2 && !self.prev_key2
	}

	get key2Released() {
		return !self.key2 && self.prev_key2
	}

	get moved() {
		return self.i != self.prevI
	}

	_tick(actual_mouse, actual_key, actual_key2, i) {
		self.mouse = actual_mouse
		self.key = actual_key
		self.key2 = actual_key2
		self.i = i
		if (i == -1) {
			self.mouse = false
			self.key = false
			self.key2 = false
		}
		self.tick()
		if (i != self.prevI) {
			self.prevI = i
		}

		self.prev_mouse = mouse
		self.prev_key = key
		self.prev_key2 = key2
	}

	getName() { return "unnamed tool" }
	tick() { }
}

function createLevel(data, tick, title, instructions) {
	levelData.push(data)
	levelTickCallbacks.push(tick)
	levelTitle.push(title)
	if (instructions) {
		levelInstructions.push(instructions)
	} else {
		levelInstructions.push("")
	}
}

function createType(id, display, constructor, update, tick, deconstructor) {
	if (flags[id] !== undefined) {
		throw "Tried to make two types with same id " + id
	}
	let flag = 0
	displayCallbacks[id] = display
	if (constructor) {
		flag |= CONSTRUCTOR_FLAG
		constructorCallbacks[id] = constructor
	}
	if (update) {
		flag |= UPDATE_FLAG
		updateCallbacks[id] = update
	}
	if (tick) {
		flag |= TICK_FLAG
		tickCallbacks[id] = tick
	}
	if (deconstructor) {
		flag |= DECONSTRUCTOR_FLAG
		deconstructorCallbacks[id] = deconstructor
	}

	flags[id] = flag
}


/*
>=====|createType|=====<
===REQUIRED===
id is an identification number for this specific type
	references to this type use this number
	it must be unique
	it must fit in a u8 (integer between 0-255)
	it should ideally be near zero
display is a callback that
	is used to determine what to actually show this voxel
	should not modify state
	passed i
	should return
		createDisplay(z, x, y, index)
		where z, x, y are 90deg rotations around those axises denoted by 0, 1, 2, or 3 (dont give it a value thats not 0,1,2,3)
		index is the index of the thing u wanna rotate
===OPTIONAL=== (anything falsy can work as substitute)
constructor is a callback that
	is called when the block is created
	types[i] is already modified for you
	one recommended use is to set the initial values of data variables
	passed i
	should return true if it was successful
		returning true does as you expect
		return false prevent the block to actually being placed and change the type back
update is a callback that
	is called when a block adjacent to this block is changed (if the block during update phase, then it will be delayed to the next tick)
	for stuff thats gonna be receiving an update like >75% of ticks, just use tick instead
	passed i and direction
		direction is an integer that should be used by
		being be compared to dirPosX and similar
		passed into dirIsFaceAdjacent(direction) and similar
	nothing to return
tick is a callback that
	is called every tick
	only use if necessary cause its the slowest
	passed i
	nothing to return
deconstructor is a callback that
	is called when the block is about to be removed (before the types constructor)
	types[i] will be modified for you if successful
	passed i and newType
		newType is the new type of block incoming
	should return if its ok to remove it
		returning true will go onto call the new types constructor and then potentially place that new block
		return false prevent the block to actually being placed

>=====|createLevel|=====<
===REQUIRED===
data is base64 encoded level data as a string
	obtained by using saveToBase64() in the console then copy and pasting what it spits out
tick is a callback that
	is called every tick that the level is being played
	should return true when the level is beaten
title is string that is the title of the level
===OPTIONAL===
instructions is string that is the level specific instructions

>=====|Tool|=====<
make a class that extends Tool
implement getName()
	return a string
implement tick()
*/

class CopyPasteTool extends Tool {
	constructor() {
		super()
		self.picked_type = 0
		self.picked_data0 = 0
	}
	getName() { return "Copy Paste Tool" }
	tick() {
		if (self.keyPressed) {
			self.picked_type = types[self.i]
			self.picked_data0 = data0[self.i]
		} else if (self.mouse || self.mouseReleased) {
			types[self.i] = self.picked_type
			data0[self.i] = self.picked_data0
			updateDisplay(self.i)
		}
	}
}

class ChangeTypeTool extends Tool {
	constructor() {
		super()
		self.part = 0
	}
	getName() { return "Change Type" }
	getArrayConsidered() {
		switch (self.part) {
			case 0:
				return types
			case 1:
				return data0
			case 2:
				return data1
		}
	}
	tick() {
		if (self.key2Pressed) {
			self.part = (self.part + 1) % 3
		}
		if (self.mousePressed) {
			if (self.key) {
				self.getArrayConsidered()[self.i]++
			} else {
				self.getArrayConsidered()[self.i]--
			}
		}
	}
}

class PipeTool extends Tool {
	getName() { return "Pipe" }
	tick() { } // TODO
}

createType(0,
	i => 0
) // does nothing


const PIPE_EDGE_PX = 0
const PIPE_EDGE_PY = 0
const PIPE_EDGE_PZ = 0
const PIPE_EDGE_NX = 0
const PIPE_EDGE_NY = 0
const PIPE_EDGE_NZ = 0
const PIPE_STRAI_X = 0
const PIPE_STRAI_Y = 0
const PIPE_STRAI_Z = 0
const PIPE_B_PX_PY = 0
const PIPE_B_NX_NY = 0
const PIPE_B_NX_PY = 0
const PIPE_B_PX_NY = 0
const PIPE_B_PX_PZ = 0
const PIPE_B_PY_PZ = 0
const PIPE_B_NX_PZ = 0
const PIPE_B_NY_PZ = 0
const PIPE_B_PX_NZ = 0
const PIPE_B_PY_NZ = 0
const PIPE_B_NX_NZ = 0
const PIPE_B_NY_NZ = 0
const PIPE_TJ_X_PY = 0
const PIPE_TJ_Y_NX = 0
const PIPE_TJ_X_NY = 0
const PIPE_TJ_Y_PX = 0
const PIPE_TJ_X_PZ = 0
const PIPE_TJ_X_NZ = 0
const PIPE_TJ_Y_PZ = 0
const PIPE_TJ_Y_NZ = 0
const PIPE_TJ_Z_PX = 0
const PIPE_TJ_Z_PY = 0
const PIPE_TJ_Z_NX = 0
const PIPE_TJ_Z_NY = 0
const PIPE_INVALID = 0
const PIPE_DISPLAY_ARRAY = new Uint8Array([
	//            +X            -X            +X -X
	PIPE_INVALID, PIPE_EDGE_PX, PIPE_EDGE_NX, PIPE_STRAI_X, //
	PIPE_EDGE_PY, PIPE_B_PX_PY, PIPE_B_NX_PY, PIPE_TJ_X_PY, // +Y
	PIPE_EDGE_NY, PIPE_B_PX_NY, PIPE_B_NX_NY, PIPE_TJ_X_NY, // -Y
	PIPE_STRAI_Y, PIPE_TJ_Y_PX, PIPE_TJ_Y_NX, PIPE_INVALID, // +Y -Y
	PIPE_EDGE_PZ, PIPE_B_PX_PZ, PIPE_B_NX_PZ, PIPE_TJ_X_PZ, // +Z
	PIPE_B_PY_PZ, PIPE_INVALID, PIPE_INVALID, PIPE_INVALID, // +Y +Z
	PIPE_B_NY_PZ, PIPE_INVALID, PIPE_INVALID, PIPE_INVALID, // -Y +Z
	PIPE_TJ_Y_PZ, PIPE_INVALID, PIPE_INVALID, PIPE_INVALID, // +Y -Y +Z
	PIPE_EDGE_NZ, PIPE_B_PX_NZ, PIPE_B_NX_NZ, PIPE_TJ_X_NZ, // -Z
	PIPE_B_PY_NZ, PIPE_INVALID, PIPE_INVALID, PIPE_INVALID, // +Y -Z
	PIPE_B_NY_NZ, PIPE_INVALID, PIPE_INVALID, PIPE_INVALID, // -Y -Z
	PIPE_TJ_Y_NZ, PIPE_INVALID, PIPE_INVALID, PIPE_INVALID, // +Y -Y -Z
	PIPE_STRAI_Z, PIPE_TJ_Z_PX, PIPE_TJ_Z_NX, PIPE_INVALID, // +Z -Z
	PIPE_TJ_Z_PY, PIPE_INVALID, PIPE_INVALID, PIPE_INVALID, // +Y +Z -Z
	PIPE_TJ_Z_NY, PIPE_INVALID, PIPE_INVALID, PIPE_INVALID, // -Y +Z -Z
	PIPE_INVALID, PIPE_INVALID, PIPE_INVALID, PIPE_INVALID, // +Y -Y +Z -Z
])
createType(10,//pipe
	i => { PIPE_DISPLAY_ARRAY[data0[i]] },
	i => {
		data0[i] = 0 // shape
		data1[i] = 0 // fluid
	},
	false,
	i => {

	},
	false
)

/*
bits:
1  - +X
2  - -X
4  - +Y
8  - -Y
16 - +Z
32 - -Z


End X
End Y
End Z
End -X
End -Y
End -Z
Straight X
Straight Y
Straight Z
Bent X Y
Bent -X Y
Bent -X -Y
Bent X -Y
Bent X Z
Bent Y Z
Bent -X Z
Bent -Y Z
Bent X -Z
Bent Y -Z
Bent -X -Z
Bent -Y -Z
T X Y
T Y -X
T X -Y
T Y X
T X Z
T X -Z
T Y Z
T Y -Z
T Z X
T Z Y
T Z -X
T Z -Y
*/













// createType(1, // heats up
// 	i => 1,
// 	false,
// 	false,
// 	i => {
// 		temperatures[i] += 100
// 	}
// )
// createType(2, // cant be place next to left or right edge & swaps heat on the left and right
// 	i => 2,
// 	i => {
// 		if (!isNotLeft(i) || !isNotRight(i)) {
// 			return false
// 		}
// 		return true
// 	},
// 	false,
// 	i => {
// 		trans = temperatures[i + 1]
// 		temperatures[i + 1] = temperatures[i - 1]
// 		temperatures[i - 1] = trans
// 	}
// )
// createType(3, // combusts at temperature >2_100_000000
// 	i => {

// 	},
// 	i => {
// 		data0[i] = 10
// 		return true
// 	},
// 	false,
// 	i => {
// 		if (temperatures[i] > 2_100_000000) {
// 			temperatures[i] += 200_000000
// 			data0[i]--
// 			if (data0[i] == 0) {
// 				changeBlock(i, 0)
// 			}
// 		}
// 	}
// )
// createType(4, // after 50 tick converts to type 1
// 	i => {
// 		data0[i] = 0
// 		return true
// 	},
// 	false,
// 	i => {
// 		data0[i]++
// 		if (data0[i] == 50) {
// 			changeBlock(i, 0)
// 		}
// 	}
// )
// createType(5, // falling sand - switches to 6 when it lands
// 	false,
// 	false,
// 	i => {
// 		if (isNotBottom(i) && types[i - rows] == 0) {
// 			changeBlock(i - rows, 5)
// 			changeBlock(i, 0)
// 		} else {
// 			changeBlock(i, 6)
// 		}
// 	}
// )
// createType(6, //sand waiting to fall (no longer ticking) (is receiving updates and if it triggers to fall again will switch to type 5 again)
// 	i => {
// 		if (isNotBottom(i) && types[i - rows] == 0) {
// 			types[i] = 5 // normally use changeBlock, but in the constructor this is the only kinda ok place to do this
// 		}
// 		return true
// 	},
// 	(i, direction) => { //direction 2 is down
// 		if (/* direction == 2 &&  */isNotBottom(i) && types[i - rows] == 0) {
// 			changeBlock(i, 5)
// 		}
// 	},
// 	false
// )


// function debug_display(array) {
// 	if (typeof (array) == Function) {
// 		let result = ""
// 		let i = 0
// 		while (i < size) {
// 			const stopLoop = i + cols
// 			while (i < stopLoop) {
// 				result += array(i) + " "
// 				++i
// 			}
// 			result += "\n"
// 		}
// 		console.log(result)
// 	} else {
// 		let result = ""
// 		let i = 0
// 		while (i < size) {
// 			const stopLoop = i + cols
// 			while (i < stopLoop) {
// 				result += array[i] + " "
// 				++i
// 			}
// 			result += "\n"
// 		}
// 		console.log(result)
// 	}

// }

