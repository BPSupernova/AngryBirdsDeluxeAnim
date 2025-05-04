//prepare for the launch using physically-based animation
function initializePhysics(model, verticalAngle, horizontalAngle) {
    let velocity = 2.5;

    let verticalRadius = verticalAngle * Math.PI / 180;
    let horizontalRadius = horizontalAngle * Math.PI / 180;
    model.position = vec3(0, 1.0, -1);
    //set initial velocity of blue bird
    physicsVelocity[0] = velocity * Math.cos(verticalRadius) * Math.cos(horizontalRadius);
    physicsVelocity[1] = velocity * Math.sin(verticalRadius);
    physicsVelocity[2] = velocity * Math.sin(verticalRadius) * Math.sin(horizontalRadius);
}

//updates position of model using physics based on current time
function updateModelOnPhysics(model, currentTime) {
    if (!isAnimatingWPhysics) return;

    //really small gravity so bird doesn't launch too fast
    let gravity = 0.4;

    const elapsedTime = (currentTime - physicsAnimStartTime) / 1000;

    let velPrime = physicsVelocity[1] - (gravity * elapsedTime);

    //update position using current position, velocity, and elapsed time
    model.position[0] = model.position[0] + (physicsVelocity[0] * elapsedTime);
    model.position[1] = model.position[1] + (physicsVelocity[1] * elapsedTime + (0.5 * gravity) * (elapsedTime ** 2));
    physicsVelocity[1] = velPrime;
    model.position[2] = model.position[2] + (physicsVelocity[2] * elapsedTime);

    //calculate if close to tower, knocks tower over if bird hits it
    let xDifference = Math.abs(model.position[0] - tower.position[0]);
    let zDifference = Math.abs(model.position[2] - tower.position[2]);
    if ((xDifference < 1) && (zDifference < 1) && (model.position[1] < 5.3) && !isTowerFalling) {
        console.log(model.position);
        collapseTower();
        killPig();
        //congratulate user on job well done
        if (showSuccessText === false) {
            prepareText();
            showSuccessText = true;
        }
    }

    //ends animation when bird hits ground
    if (model.position[1] < 0) {
        model.position[1] = 0;
        isAnimatingWPhysics = false;
        animationInProgress = false;
        //if tower didnt fall, show fail text
        if (showSuccessText === false && !isTowerFalling) {
            prepareText();
            showFailText = true;
        }
    }

    model.updateModelMatrix();

}