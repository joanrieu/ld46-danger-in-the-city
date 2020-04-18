extends VehicleBody

func _physics_process(delta):
	self.engine_force = 3000 if Input.is_action_pressed("car_accelerate") else 0
	self.brake = 30 if Input.is_action_pressed("car_brake") else 0
	var left = .5 if Input.is_action_pressed("car_left") else 0
	var right = -.5 if Input.is_action_pressed("car_right") else 0
	self.steering = left + right
