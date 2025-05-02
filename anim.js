let gl, program, canvas;
let modelMatrix, viewMatrix, projMatrix;
let models = [];
let lightPosition = vec4(5.0, 10.0, 5.0, 1.0)

let tower;
let isTowerFalling = false;
let fallStartTime = 0;
const G = 9.8;

let splineData = null;
let splineAnimStartTime = null;
let isAnimatingWSpline = false;
let currentSplinePoint = 0;

let isAnimatingWPhysics = false;
let physicsAnimStartTime = null;
let physicsVelocity = vec3(0, 0, 0);

let deformPig = 0;
let pigIsDying = false;

//variables for setting when birds are used
let redBird;
let blueBird;
let currentBird;
let currentBirdFunction;
let animationInProgress = false;

//variables for moving text
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

//variables for changing angle of physics model
let verticalAngle = 45;
let horizontalAngle = 45;
let verticalAngleElement;
let verticalAngleNode;
let horizontalAngleElement;
let horizontalAngleNode;

//variables for skybox
let skybox;

let launchSound = new Audio('/Audio/angrybirdslaunch.mp3');

class Model {
    constructor(objPath, mtlPath, name, colorOverride = null) {
        this.vertices = [];
        this.normals = [];
        this.colors = [];
        this.weights = [];
        this.name = name;
        this.loaded = false;

        this.pointBuffer = 0;
        this.normalBuffer = 0;
        this.colorBuffer = 0;
        this.weightBuffer = 0;

        this.colorOverride = colorOverride;

        // Materials and groups
        this.materials = {};
        this.materialGroups = [];
        
        // Model transforms
        this.position = vec3(0, 0, 0);
        this.rotation = vec3(0, 0, 0);
        this.scale = vec3(1, 1, 1);
        this.originalRot = vec3(0, 0, 0);

        this.modelMatrix = mat4();

        this.useQuaternion = false;
        this.tempQuaternion = [0, 1, 0, 0];
        
        // Store the obj/mtl paths
        this.objPath = objPath;
        this.mtlPath = mtlPath;
        
        // Load the model
        this.loadModel();
    }


    updateModelMatrix() {
        if (this.useQuaternion) {
            // Convert quaternion to rotation matrix only when flag is set
            const [w, x, y, z] = this.tempQuaternion;
            const rotationMat = mat4(
                1 - 2*y*y - 2*z*z, 2*x*y - 2*z*w,     2*x*z + 2*y*w,     0,
                2*x*y + 2*z*w,     1 - 2*x*x - 2*z*z, 2*y*z - 2*x*w,     0,
                2*x*z - 2*y*w,     2*y*z + 2*x*w,     1 - 2*x*x - 2*y*y, 0,
                0,                 0,                 0,                 1
            );
            
            this.modelMatrix = mult(
                translate(this.position[0], this.position[1], this.position[2]),
                mult(
                    rotationMat,
                    scalem(this.scale[0], this.scale[1], this.scale[2])
                )
            );
        } else {
            // Default to Euler angles
            this.modelMatrix = mult(
                translate(this.position[0], this.position[1], this.position[2]),
                mult(
                    rotateZ(this.rotation[2]),
                    mult(
                        rotateY(this.rotation[1]),
                        mult(
                            rotateX(this.rotation[0]),
                            scalem(this.scale[0], this.scale[1], this.scale[2])
                        )
                    )
                )
            );
        }
    }

    //add given values to the current position
    addPosition(x, y, z) {
        let newX = this.position[0] + x;
        let newY = this.position[1] + y;
        let newZ = this.position[2] + z;
        this.position = vec3(newX, newY, newZ);
        this.updateModelMatrix();
    }

    async loadModel() {
        try {
            // Load MTL first to get materials
            const mtlResponse = await fetch(this.mtlPath);
            if (!mtlResponse.ok) throw new Error(`Failed to load MTL: ${mtlResponse.status}`);
            const mtlData = await mtlResponse.text();
            this.parseMtl(mtlData);
            
            // Then load OBJ
            const objResponse = await fetch(this.objPath);
            if (!objResponse.ok) throw new Error(`Failed to load OBJ: ${objResponse.status}`);
            const objData = await objResponse.text();
            this.parseObj(objData);
            
            this.updateModelMatrix();
            this.loaded = true;
            console.log("Model loaded successfully");
        } catch (error) {
            console.error("Error loading model:", error);
        }
    }

    parseMtl(mtlData) {
        const lines = mtlData.split('\n');
        let currentMaterial = null;
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine.startsWith('#')) continue;
            
            const parts = trimmedLine.split(/\s+/);
            const command = parts[0].toLowerCase();
            
            if (command === 'newmtl') {
                currentMaterial = parts[1];
                this.materials[currentMaterial] = {
                    ambient: [0.2, 0.2, 0.2, 1.0],
                    diffuse: [0.8, 0.8, 0.8, 1.0],
                    specular: [0.2, 0.2, 0.2, 1.0],
                    shininess: 10.0
                };
            } else if (command === 'ka' && currentMaterial) {
                this.materials[currentMaterial].ambient = [
                    parseFloat(parts[1]),
                    parseFloat(parts[2]),
                    parseFloat(parts[3]),
                    1.0
                ];
            } else if (command === 'kd' && currentMaterial) {
                this.materials[currentMaterial].diffuse = [
                    parseFloat(parts[1]),
                    parseFloat(parts[2]),
                    parseFloat(parts[3]),
                    1.0
                ];
            } else if (command === 'ks' && currentMaterial) {
                this.materials[currentMaterial].specular = [
                    parseFloat(parts[1]),
                    parseFloat(parts[2]),
                    parseFloat(parts[3]),
                    1.0
                ];
            } else if (command === 'ns' && currentMaterial) {
                this.materials[currentMaterial].shininess = parseFloat(parts[1]);
            }
        }
    }

    parseObj(objData) {
        const lines = objData.split('\n');
        
        // Temporary storage for the data as we parse it
        const tempVertices = [];
        const tempNormals = [];
        
        let currentMaterial = null;
        let currentGroup = { material: null, startIndex: 0, count: 0 };
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine.startsWith('#')) continue;
            
            const parts = trimmedLine.split(/\s+/);
            const command = parts[0].toLowerCase();
            
            if (command === 'v') {
                tempVertices.push(vec4(
                    parseFloat(parts[1]),
                    parseFloat(parts[2]),
                    parseFloat(parts[3]),
                    1.0
                ));
            } else if (command === 'vn') {
                tempNormals.push(vec3(
                    parseFloat(parts[1]),
                    parseFloat(parts[2]),
                    parseFloat(parts[3])
                ));
            } else if (command === 'usemtl') {
                // If we're changing materials, store the current group and start a new one
                if (currentGroup.count > 0) {
                    this.materialGroups.push(currentGroup);
                }
                
                currentMaterial = parts[1];
                currentGroup = {
                    material: currentMaterial,
                    startIndex: this.vertices.length,
                    count: 0
                };
            } else if (command === 'f') {
                // Process face - triangulate if needed
                const vertCount = this.processFace(parts, tempVertices, tempNormals, currentMaterial);
                currentGroup.count += vertCount;
            }
        }
        
        // Add the last material group if it hasn't been added yet
        if (currentGroup.count > 0) {
            this.materialGroups.push(currentGroup);
        }
        
        console.log(`Loaded ${this.vertices.length} vertices in ${this.materialGroups.length} material groups`);
    }

    processFace(parts, vertices, normals, material) {
        // Parse all vertex data
        const faceVertices = [];
        const faceNormals = [];
        
        for (let i = 1; i < parts.length; i++) {
            const indices = parts[i].split('/');
            
            // OBJ indices are 1-based, so subtract 1
            const vertexIndex = parseInt(indices[0]) - 1;
            if (vertexIndex >= 0 && vertexIndex < vertices.length) {
                faceVertices.push(vertices[vertexIndex]);
            }
            
            // Handle normals if present
            if (indices.length > 2 && indices[2]) {
                const normalIndex = parseInt(indices[2]) - 1;
                if (normalIndex >= 0 && normalIndex < normals.length) {
                    faceNormals.push(normals[normalIndex]);
                }
            }
        }
        
        // If we don't have enough vertices or normals, skip this face
        if (faceVertices.length < 3 || 
            (faceNormals.length > 0 && faceNormals.length !== faceVertices.length)) {
            return 0;
        }
        
        // If we don't have normals, calculate a face normal
        if (faceNormals.length === 0) {
            const normal = this.calculateFaceNormal(faceVertices[0], faceVertices[1], faceVertices[2]);
            for (let i = 0; i < faceVertices.length; i++) {
                faceNormals.push(normal);
            }
        }
        
        // Get material color
        let materialColor;
        if (this.colorOverride) {
            materialColor = this.colorOverride;
        } else if (material && this.materials[material]) {
            materialColor = this.materials[material].diffuse;
        } else {
            materialColor = [0.8, 0.8, 0.8, 1.0]; // default gray
        }
        
        // Triangulate the face (assuming convex)
        let vertCount = 0;
        for (let i = 1; i < faceVertices.length - 1; i++) {
            // Add the three vertices of this triangle
            this.vertices.push(faceVertices[0]);
            this.vertices.push(faceVertices[i]);
            this.vertices.push(faceVertices[i+1]);
            
            // Add their normals
            this.normals.push(faceNormals[0]);
            this.normals.push(faceNormals[i]);
            this.normals.push(faceNormals[i+1]);
            
            // Add their colors
            this.colors.push(materialColor);
            this.colors.push(materialColor);
            this.colors.push(materialColor);

            //Add dummy weights
            this.weights.push(vec4(0.0, 0.0, 0.0, 0.0));
            this.weights.push(vec4(0.0, 0.0, 0.0, 0.0));
            this.weights.push(vec4(0.0, 0.0, 0.0, 0.0));

            vertCount += 3;
        }
        
        return vertCount;
    }
    
    calculateFaceNormal(v1, v2, v3) {
        // Convert from vec4 to vec3 by dropping w component
        const p1 = vec3(v1[0], v1[1], v1[2]);
        const p2 = vec3(v2[0], v2[1], v2[2]);
        const p3 = vec3(v3[0], v3[1], v3[2]);
        
        // Calculate two edges
        const e1 = subtract(p2, p1);
        const e2 = subtract(p3, p1);
        
        // Cross product gives normal
        const normal = normalize(cross(e1, e2));
        return normal;
    }

    render() {
        if (!this.loaded || this.vertices.length === 0) return;
        
        // Set model matrix for this model's transforms
        gl.uniformMatrix4fv(
            gl.getUniformLocation(program, "modelMatrix"), 
            false, 
            flatten(this.modelMatrix)
        );

        //populate buffers the first time this is ran
        if (this.pointBuffer === 0) {
            this.pointBuffer = createBuffer(this.vertices);
            this.normalBuffer = createBuffer(this.normals);
            this.colorBuffer = createBuffer(this.colors);
            this.weightBuffer = createBuffer(this.weights);
        }

        //push all buffer data to shaders
        pushData("vPosition", this.pointBuffer, 4);
        pushData("vNormal", this.normalBuffer, 3);
        pushData("vColor", this.colorBuffer, 4);
        pushData("vWeight", this.weightBuffer, 4);
        
        // Draw the model
        gl.drawArrays(gl.TRIANGLES, 0, this.vertices.length);
    }
}

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

    //set boolean to mark that what is drawn is not the slingshot band, pig, or skybox
    gl.uniform1i(gl.getUniformLocation(program, "isBand"), 0);
    gl.uniform1i(gl.getUniformLocation(program, "isPig"), 0);
    gl.uniform1i(gl.getUniformLocation(program, "isSkybox"), 0);

    //set up the tower
    tower = new Tower(5, vec3(12, 0, -6));

    // Create model for first bird
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

    const blue = new Model(
        "BlueAngryBird/12248_Bird_v1_L2.obj",
        "BlueAngryBird/12248_Bird_v1_L2.mtl",
        "Blue",
        [0.2, 0.0, 1.0, 1.0]
    );
    blue.position = vec3(-3, 0.0, -2);
    blue.rotation = vec3(270, 135, 0);
    blue.scale = vec3(0.05, 0.05, 0.05);
    blue.updateModelMatrix();
    models.push(blue);
    blueBird = blue;
    blue.originalRot = blue.rotation;

    //sets bird to be launched
    currentBird = blue;
    currentBirdFunction = launchBlueBird;

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

    const slingshot = new Slingshot(vec3(0, 0, 0), vec3(0, -45, 0), vec3(0.4, 0.4, 0.4));
    slingshot.createSlingshotBase();
    models.push(slingshot);

    //create skybox
    skybox = new Skybox();
    skybox.scale = vec3(110, 110, 110);
    skybox.updateModelMatrix();

    //load the spline for the red bird
    loadSpline("spline.txt").then(data => {
        if (data) {
            console.log("Spline loaded successfully");
            splineData = data;
            splineData.printSpline();
        }
    });

    //add event listener for launching the birds
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

    //prepare text to be shown on screen
    prepareText();

    //set elements to show angle values
    verticalAngleElement = document.querySelector("#verticalAngle");
    horizontalAngleElement = document.querySelector("#horizontalAngle");
    verticalAngleNode = document.createTextNode("");
    horizontalAngleNode = document.createTextNode("");
    verticalAngleElement.appendChild(verticalAngleNode);
    horizontalAngleElement.appendChild(horizontalAngleNode);
    //event listeners for angles
    document.getElementById("verticalAngleSlider").addEventListener("input", e => verticalAngle = parseFloat(e.target.value));
    document.getElementById("horizontalAngleSlider").addEventListener("input", e => horizontalAngle = parseFloat(e.target.value));

    //maintain slider values from last reload
    verticalAngle = parseInt(document.getElementById("verticalAngleSlider").value);
    horizontalAngle = parseInt(document.getElementById("horizontalAngleSlider").value);

    //play theme song
    let theme = new Audio('/Audio/angrybirdstheme.mp3');
    theme.loop = true;
    theme.volume = 0.5;
    theme.play();

    // Animation loop
    function render(currentTime = 0) {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        //update boneMatrix1 if launching has been triggered
        updateSlingshot(currentBird);
        //set bone matrices for bending slingshot
        let boneMatrix0 = mat4();
        let boneMatrix1 = mult(translate(0, -slingshotBend/2, slingshotBend), boneMatrix0);
        let boneMatrix2 = mat4();

        setUniformMatrix("boneMatrix0", boneMatrix0);
        setUniformMatrix("boneMatrix1", boneMatrix1);
        setUniformMatrix("boneMatrix2", boneMatrix2);


        if (isAnimatingWSpline && models[0] && models[0].loaded) {
            updateModelOnSpline(models[0], currentTime);
        }

        if (isAnimatingWPhysics && models[1] && models[1].loaded) {
            updateModelOnPhysics(models[1], currentTime);
        }

        if (isTowerFalling) tower.update(currentTime);
        tower.render();

        skybox.render();

        //render text if fail or success happens
        if (showFailText) {
            renderText(failText, failTextNode, "EPIC FAIL");
        }
        else if (showSuccessText) {
            renderText(successText, successTextNode, "WOOOO YOU DID IT");
        }

        //show vertical and horizontal angle values to user
        verticalAngleNode.nodeValue = verticalAngle;
        horizontalAngleNode.nodeValue = horizontalAngle + 90;

        // Render all models
        for (const model of models) {
            //only apply shape deformation if model is pig
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

function revivePig() {
    deformPig = 0;
    pigIsDying = false;
}

function killPig() {
    pigIsDying = true;
}

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

    //set text back to default position
    textX = 200;
    textY = 200;
}

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

let slingshotBend = 0;
let launch = false;
let pullBack = true;
let fire = false;

function updateSlingshot(bird) {
    //slingshot has been triggered
    if (launch === true) {
        //slingshot is pulled back
        if (pullBack === true) {
            //get rid of any text
            failText.remove();
            successText.remove();
            showFailText = false;
            showSuccessText = false;

            slingshotBend += 0.1;
            //move bird back with slingshot
            bird.addPosition(-0.007, -0.0035, 0.007);
            revivePig();
            if (slingshotBend >= 8) {
                pullBack = false;
                animationInProgress = false;
            }
        }
        //slingshot is fired
        else if (fire === true) {
            slingshotBend -= 1;
            if (slingshotBend <= 0) {
                launch = false;
                //set for next launch
                pullBack = true;
                slingshotBend = 0;
                //pig died
                killPig();
            }
        }
    }
}

function launchSlingshot(bird, launchBird) {
    animationInProgress = true;
    //set slingshot to fire mode
    if (pullBack === false && fire === false) {
        launchSound.play();
        launchBird();
        launch = true;
        fire = true;
    }
    //set slingshot to pullback mode
    else {
        bird.position = vec3(0, 1.0, -1);
        bird.rotation = bird.originalRot;
        launch = true;
        fire = false;
        pullBack = true;
    }
}

function launchRedBird() {
    console.log("Starting spline animation");
    const initialPoint = splineData.pointsData[0];
    redBird.position = vec3(initialPoint.pos.x, initialPoint.pos.y, initialPoint.pos.z);
    redBird.rotation = redBird.originalRot; // Make sure we start with the original rotation
    redBird.updateModelMatrix();
    
    isAnimatingWSpline = true;
    splineAnimStartTime = performance.now();
}

function launchBlueBird() {
    console.log("starting physics animation");

    //set original velocity for physics bird
    initializePhysics(models[1], verticalAngle, horizontalAngle);

    isAnimatingWPhysics = true;
    physicsAnimStartTime = performance.now();
}

//creates model matrix based on given transformations
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

function pushData(attName, buffer, size) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    let attrib = gl.getAttribLocation(program, attName);
    gl.vertexAttribPointer(attrib, size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attrib);
}

//Create buffer for data
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
