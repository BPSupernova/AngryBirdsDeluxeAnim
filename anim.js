let gl, program, canvas;
let modelMatrix, viewMatrix, projMatrix;
let models = [];
let lightPosition = vec4(5.0, 10.0, 5.0, 1.0)

// Variables for the tower
let tower;
let isTowerFalling = false;
let fallStartTime = 0;
const G = 9.8;

// Variables for spline
let splineData = null;
let splineAnimStartTime = null;
let isAnimatingWSpline = false;

// Variables for physically-based animation
let isAnimatingWPhysics = false;
let physicsAnimStartTime = null;
let physicsVelocity = vec3(0, 0, 0);

// Variables for pig
let deformPig = 0;
let pigIsDying = false;

// Variables for setting when birds are used
let redBird;
let blueBird;
let currentBird;
let currentBirdFunction;
let animationInProgress = false;

// Variables for the slingshot launching functionality
let slingshotBend = 0;
let launch = false;
let pullBack = true;
let fire = false;

// Variables for moving text
let divElement;
let failText;
let successText;
let failTextNode;
let successTextNode;
let textX = 0;
let textY = 0;
let textXChange = 4;
let textYChange = 3;
let showFailText = false;
let showSuccessText = false;

// Variables for changing angle of physics model
let verticalAngle = 45;
let horizontalAngle = 45;
let verticalAngleElement;
let verticalAngleNode;
let horizontalAngleElement;
let horizontalAngleNode;

// Variable for launch sound
let launchSound = new Audio('/Audio/angrybirdslaunch.mp3');

function main() {
    canvas = document.getElementById('webgl');
    gl = WebGLUtils.setupWebGL(canvas);
    
    if (!gl) {
        alert("WebGL isn't available");
        return;
    }
    
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.2, 0.2, 0.2, 1.0);
    gl.enable(gl.DEPTH_TEST);
    
    // Initialize shaders with the updated versions
    program = initShaders(gl, "vshader", "fshader");
    gl.useProgram(program);
    
    // Set up matrices
    viewMatrix = lookAt(vec3(5, 5, 15), vec3(5, 3, 0), vec3(0, 1, 0));
    projMatrix = perspective(45, canvas.width/canvas.height, 0.1, 400);
    
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "viewMatrix"), false, flatten(viewMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "projMatrix"), false, flatten(projMatrix));
    
    // Set up lighting
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));
    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten([0.2, 0.2, 0.2, 1.0]));
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten([1.0, 1.0, 1.0, 1.0]));
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten([1.0, 1.0, 1.0, 1.0]));
    gl.uniform1f(gl.getUniformLocation(program, "shininess"), 100.0);

    // Set boolean to mark that what is drawn is not the slingshot band or pig
    gl.uniform1i(gl.getUniformLocation(program, "isBand"), 0);
    gl.uniform1i(gl.getUniformLocation(program, "isPig"), 0);

    // Create model for red bird
    const red = new Model(
        "RedAngryBird/12260_Bird_Toucan_v3_l2.obj",
        "RedAngryBird/12260_Bird_Toucan_v3_l2.mtl",
        "Red",
        [1.0, 0.2, 0.2, 1.0]
    );

    red.position = vec3(3.0, -1.0, 3.0);
    red.scale = vec3(0.12, 0.12, 0.12);
    red.rotation = vec3(270, 200, 0);
    red.updateModelMatrix();
    models.push(red);
    redBird = red;
    red.originalRot = red.rotation;

    // Create model for blue bird
    const blue = new Model(
        "BlueAngryBird/12248_Bird_v1_L2.obj",
        "BlueAngryBird/12248_Bird_v1_L2.mtl",
        "Blue",
        [0.2, 0.0, 1.0, 1.0]
    );

    // Create model for second bird
    blue.position = vec3(-3, 0.0, -2);
    blue.rotation = vec3(270, 135, 0);
    blue.scale = vec3(0.05, 0.05, 0.05);
    blue.updateModelMatrix();
    models.push(blue);
    blueBird = blue;
    blue.originalRot = blue.rotation;

    // Sets bird to be launched
    currentBird = blue;
    currentBirdFunction = launchBlueBird;

    // Create a model for the cool pig
    const pig = new Model(
        "Pig/16433_Pig.obj",
        "Pig/Blank.mtl",
        "Pig",
        [0.2, 1.0, 0.2, 1.0]
    );

    pig.position = vec3(10.0, 4.9, -6);
    pig.rotation = vec3(-90, -45, 0);
    pig.scale = vec3(1.5, 1.5, 1.5);
    pig.updateModelMatrix();
    models.push(pig);

    pig.falling = false;
    pig.fallStartTime = 0;
    pig.velocity = vec3(0, 0, 0);
    pig.angularVelocity = vec3(0, 0, 0);
    pig.originalPos = vec3(pig.position);

    // Set up the tower & associate the pig w/it so that fall together
    tower = new Tower(5, vec3(12, 0, -6), pig);

    // Create the slingshot model
    const slingshot = new Slingshot(vec3(0, 0, 0), vec3(0, -45, 0), vec3(0.4, 0.4, 0.4));
    slingshot.createSlingshot();
    models.push(slingshot);

    // Load the spline for the red bird
    loadSpline("spline.txt").then(data => {
        if (data) {
            console.log("Spline loaded successfully");
            splineData = data;
            splineData.printSpline();
        }
    });

    // Add event listener for launching the birds
    window.addEventListener('keydown', (event) => {
        if (event.code === "Space" && !animationInProgress) {
            launchSlingshot(currentBird, currentBirdFunction);
        }
        else if (event.code === "KeyF" && !animationInProgress) {
            currentBird = blueBird;
            currentBirdFunction = launchBlueBird;
        }
        else if (event.code === 'KeyG' && !animationInProgress) {
            currentBird = redBird;
            currentBirdFunction = launchRedBird;
        }
    });

    // Prepare text to be shown on screen
    prepareText();

    // Set elements to show angle values
    verticalAngleElement = document.querySelector("#verticalAngle");
    horizontalAngleElement = document.querySelector("#horizontalAngle");
    verticalAngleNode = document.createTextNode("");
    horizontalAngleNode = document.createTextNode("");
    verticalAngleElement.appendChild(verticalAngleNode);
    horizontalAngleElement.appendChild(horizontalAngleNode);

    // Event listeners for angles
    document.getElementById("verticalAngleSlider").addEventListener("input", e => verticalAngle = parseFloat(e.target.value));
    document.getElementById("horizontalAngleSlider").addEventListener("input", e => horizontalAngle = parseFloat(e.target.value));

    // Maintain slider values from last reload
    verticalAngle = parseInt(document.getElementById("verticalAngleSlider").value);
    horizontalAngle = parseInt(document.getElementById("horizontalAngleSlider").value);

    // Play Angry Birds theme song
    let theme = new Audio('/Audio/angrybirdstheme.mp3');
    theme.loop = true;
    theme.volume = 0.5;
    theme.play();

    // Animation loop
    function render(currentTime = 0) {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Update boneMatrix1 if launching has been triggered
        updateSlingshot(currentBird);
        // Set bone matrices for bending slingshot
        let boneMatrix0 = mat4();
        let boneMatrix1 = mult(translate(0, -slingshotBend/2, slingshotBend), boneMatrix0);
        let boneMatrix2 = mat4();

        setUniformMatrix("boneMatrix0", boneMatrix0);
        setUniformMatrix("boneMatrix1", boneMatrix1);
        setUniformMatrix("boneMatrix2", boneMatrix2);

        //update the positions for animations if they're playing
        if (isAnimatingWSpline && models[0] && models[0].loaded) {
            updateModelOnSpline(models[0], currentTime);
        }
        if (isAnimatingWPhysics && models[1] && models[1].loaded) {
            updateModelOnPhysics(models[1], currentTime);
        }
        if (isTowerFalling) tower.update(currentTime);
        tower.render();

        // Render text if fail or success happens
        if (showFailText) {
            renderText(failText, failTextNode, "EPIC FAIL");
        }
        else if (showSuccessText) {
            renderText(successText, successTextNode, "WOOOO YOU DID IT");
        }

        // Show vertical and horizontal angle values to user
        verticalAngleNode.nodeValue = verticalAngle;
        horizontalAngleNode.nodeValue = horizontalAngle + 90;

        // Render all models
        for (const model of models) {
            // Only apply shape deformation if model is pig
            if (model.name === "Pig") {
                if (deformPig < 2.5 && pigIsDying) {
                    deformPig += 0.02;
                }
                gl.uniform1i(gl.getUniformLocation(program, "isPig"), 1);
                gl.uniform3fv(gl.getUniformLocation(program, "pigPosition"), flatten(model.position));
                gl.uniform1f(gl.getUniformLocation(program, "deformPig"), deformPig);
                model.render();
                gl.uniform1i(gl.getUniformLocation(program, "isPig"), 0);
            }
            else {
                model.render();
            }
        }

        requestAnimationFrame(render);
    }
    
    render();
}

//revive the pig
function revivePig() {
    deformPig = 0;
    pigIsDying = false;
}

//kill the pig
function killPig() {
    pigIsDying = true;
}

//prepare text to be shown on screen
function prepareText() {
    divElement = document.querySelector("#divcontainer");

    failText = document.createElement("div");
    successText = document.createElement("div");

    failText.className = "floating-div-fail";
    successText.className = "floating-div-success";

    failTextNode = document.createTextNode("");
    failText.appendChild(failTextNode);
    successTextNode = document.createTextNode("");
    successText.appendChild(successTextNode);

    divElement.appendChild(failText);
    divElement.appendChild(successText);

    // Set text back to default position
    textX = 200;
    textY = 200;
}

//show text on screen
function renderText(text, textNode, textValue) {
    textX += textXChange;
    textY += textYChange;
    if (textX < 0 || textX > gl.canvas.width - text.offsetWidth) {
        textXChange = -textXChange;
    }
    if (textY < 0 || textY > gl.canvas.height - text.offsetHeight) {
        textYChange = -textYChange;
    }

    text.style.left = Math.floor(textX) + "px";
    text.style.top  = Math.floor(textY) + "px";
    textNode.nodeValue = textValue;
}

//update the position of the slingshot and all applicable variables
function updateSlingshot(bird) {
    // Slingshot has been triggered
    if (launch === true) {
        // Slingshot is pulled back
        if (pullBack === true) {
            // Get rid of any text
            failText.remove();
            successText.remove();
            showFailText = false;
            showSuccessText = false;

            slingshotBend += 0.1;
            // Move bird back with slingshot
            bird.addPosition(-0.007, -0.0035, 0.007);
            revivePig();
            if (slingshotBend >= 8) {
                pullBack = false;
                animationInProgress = false;
            }
        }
        
        // Slingshot is fired
        else if (fire === true) {
            slingshotBend -= 1;
            if (slingshotBend <= 0) {
                launch = false;
                // Set up for next launch
                pullBack = true;
                slingshotBend = 0;
                killPig();
            }
        }
    }
}

//trigger launch animation
function launchSlingshot(bird, launchBird) {
    animationInProgress = true;
    // Set slingshot to fire mode
    if (pullBack === false && fire === false) {
        launchSound.play();
        launchBird();
        launch = true;
        fire = true;
    }
    // Set slingshot to pullback mode
    else {
        bird.position = vec3(0, 1.0, -1);
        bird.rotation = bird.originalRot;
        launch = true;
        fire = false;
        pullBack = true;
    }
}

//begin launch of the red bird
function launchRedBird() {
    console.log("Starting spline animation");
    const initialPoint = splineData.pointsData[0];
    redBird.position = vec3(initialPoint.pos.x, initialPoint.pos.y, initialPoint.pos.z);
    redBird.rotation = redBird.originalRot; // Making sure we start with the original rotation
    redBird.updateModelMatrix();
    
    isAnimatingWSpline = true;
    splineAnimStartTime = performance.now();
}

//begin launch of the blue bird
function launchBlueBird() {
    console.log("starting physics animation");

    // Set original velocity for physics bird
    initializePhysics(models[1], verticalAngle, horizontalAngle);

    isAnimatingWPhysics = true;
    physicsAnimStartTime = performance.now();
}

// Creates model matrix based on given transformations
function createModelMatrix(position, rotation, scale) {
    return mult(
        translate(position[0], position[1], position[2]),
        mult(
            rotateZ(rotation[2]),
            mult(
                rotateY(rotation[1]),
                mult(
                    rotateX(rotation[0]),
                    scalem(scale[0], scale[1], scale[2])
                )
            )
        )
    );
}

/* -------- General helper functions for managing data in this project --------- */

function pushData(attName, buffer, size) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    let attrib = gl.getAttribLocation(program, attName);
    gl.vertexAttribPointer(attrib, size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attrib);
}

// Create buffer for data
function createBuffer(data) {
    let buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(data), gl.STATIC_DRAW);
    return buffer;
}

function setUniformMatrix(name, data) {
    let matrixLoc = gl.getUniformLocation(program, name);
    gl.uniformMatrix4fv(matrixLoc, false, flatten(data));
}
