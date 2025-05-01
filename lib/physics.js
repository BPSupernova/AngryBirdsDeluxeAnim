function initializePhysics(model) {
    let velocity = 2.5;
    let verticalAngle = 45;
    let horizontalAngle = -35;

    let verticalRadius = verticalAngle * Math.PI / 180;
    let horizontalRadius = horizontalAngle * Math.PI / 180;
    model.position = vec3(0, 1.0, -1);
    physicsVelocity[0] = velocity * Math.cos(verticalRadius) * Math.cos(horizontalRadius);
    physicsVelocity[1] = velocity * Math.sin(verticalRadius);
    physicsVelocity[2] = velocity * Math.sin(verticalRadius) * Math.sin(horizontalRadius);
}

function updateModelOnPhysics(model, currentTime) {
    if (!isAnimatingWPhysics) return;

    let gravity = 0.4;

    const elapsedTime = (currentTime - physicsAnimStartTime) / 1000;

    let velPrime = physicsVelocity[1] - (gravity * elapsedTime);

    model.position[0] = model.position[0] + (physicsVelocity[0] * elapsedTime);

    model.position[1] = model.position[1] + (physicsVelocity[1] * elapsedTime + (0.5 * gravity) * (elapsedTime ** 2));
    physicsVelocity[1] = velPrime;

    model.position[2] = model.position[2] + (physicsVelocity[2] * elapsedTime);

    if (model.position[1] < 0) {
        isAnimatingWPhysics = false;
    }

    model.updateModelMatrix();

}