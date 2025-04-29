let gl, program, canvas;
let modelMatrix, viewMatrix, projMatrix;
let models = [];
let lightPosition = vec4(5.0, 10.0, 5.0, 1.0)
let tower;
let isTowerFalling = false;
let fallStartTime = 0;
const G = 9.8;


class Slingshot{
    constructor(position, rotation, scale) {
        this.position = position;
        this.rotation = rotation;
        this.scale = scale;
        this.modelMatrix = mat4();

        this.vertices = [];
        this.colors = [];
        this.normals = [];

        this.hierarchyMatrix = mat4();
        this.stack = [];
        this.base = [];
    }


    updateModelMatrix() {
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





    createSlingshotBase() {
        this.updateModelMatrix();
        let middleTransform = createModelMatrix(vec3(0, 3, 0), vec3(0, 0, 90), vec3(1, 1, 1));
        let leftTopTransform = createModelMatrix(vec3(2, 3, 0), vec3(0, 0, -90), vec3(1, 1, 1));
        let rightTopTransform = createModelMatrix(vec3(2, -3, 0), vec3(0, 0, -90), vec3(1, 1, 1));

        let base = new Block(this.modelMatrix);
        let middle = new Block(middleTransform);
        let leftTop = new Block(leftTopTransform);
        let rightTop = new Block(rightTopTransform);

        base.children.push(middle);
        middle.children.push(leftTop);
        middle.children.push(rightTop);

        this.base = base;
    }

    hierarchy(block) {
        this.stack.push(this.hierarchyMatrix);
        this.hierarchyMatrix = mult(this.hierarchyMatrix, block.transformation);

        //If node is a model, apply to model matrix
        block.render(this.hierarchyMatrix);

        //Continue for each child of the node
        for(let i = 0; i < block.children.length; i++) {
            this.hierarchy(block.children[i]);
        }

        //Remove transformation from hierarchy matrix once model is no longer on stack
        this.hierarchyMatrix = this.stack.pop();
    }

    render() {
        this.hierarchy(this.base);
    }
}

class Block {
    constructor(transformation) {
        let block = setCubePoints();
        this.vertices = block[0];
        this.colors = block[1];
        this.normals = block[2];
        this.children = [];
        this.transformation = transformation;
    }

    render(modelMatrix) {
        // Set model matrix for this model's transforms
        gl.uniformMatrix4fv(
            gl.getUniformLocation(program, "modelMatrix"),
            false,
            flatten(modelMatrix)
        );

        // Set up buffers
        this.setupBuffer('vPosition', this.vertices, 4);
        this.setupBuffer('vNormal', this.normals, 3);
        this.setupBuffer('vColor', this.colors, 4);

        // Draw the model
        gl.drawArrays(gl.TRIANGLES, 0, this.vertices.length);
    }

    setupBuffer(attributeName, data, size) {
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(data), gl.STATIC_DRAW);

        const location = gl.getAttribLocation(program, attributeName);
        gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(location);
    }

}



class Model {
    constructor(objPath, mtlPath) {
        this.vertices = [];
        this.normals = [];
        this.colors = [];
        this.loaded = false;
        
        // Materials and groups
        this.materials = {};
        this.materialGroups = [];
        
        // Model transforms
        this.position = vec3(0, 0, 0);
        this.rotation = vec3(0, 0, 0);
        this.scale = vec3(1, 1, 1);
        this.modelMatrix = mat4();
        
        // Store the obj/mtl paths
        this.objPath = objPath;
        this.mtlPath = mtlPath;
        
        // Load the model
        this.loadModel();
    }


    updateModelMatrix() {
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
        const materialColor = material && this.materials[material] ? 
                              this.materials[material].diffuse : 
                              [0.8, 0.8, 0.8, 1.0];
        
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
        
        // Set up buffers
        this.setupBuffer('vPosition', this.vertices, 4);
        this.setupBuffer('vNormal', this.normals, 3);
        this.setupBuffer('vColor', this.colors, 4);
        
        // Draw the model
        gl.drawArrays(gl.TRIANGLES, 0, this.vertices.length);
    }

    setupBuffer(attributeName, data, size) {
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(data), gl.STATIC_DRAW);
        
        const location = gl.getAttribLocation(program, attributeName);
        gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(location);
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
    initShaders();
    gl.useProgram(program);
    
    // Set up matrices
    viewMatrix = lookAt(vec3(0, 5, 10), vec3(0, 3, 0), vec3(0, 1, 0));
    projMatrix = perspective(45, canvas.width/canvas.height, 0.1, 400);
    
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "viewMatrix"), false, flatten(viewMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "projMatrix"), false, flatten(projMatrix));
    
    // Set up lighting
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));
    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten([0.2, 0.2, 0.2, 1.0]));
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten([1.0, 1.0, 1.0, 1.0]));
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten([1.0, 1.0, 1.0, 1.0]));
    gl.uniform1f(gl.getUniformLocation(program, "shininess"), 100.0);
    
    createTower();
    canvas.addEventListener('click', collapseTower);

    // Create model
    const red = new Model(
        "RedAngryBird/The_red_angry_bird_0428193917_texture.obj",
        "RedAngryBird/The_red_angry_bird_0428193917_texture.mtl"
    );
    models.push(red);
    
    // Example of creating a second model with different transforms
    const car2 = new Model(
        "Pig/16433_Pig.obj",
        "Pig/Blank.mtl"
    );
    car2.position = vec3(2, 4.8, -5);
    car2.rotation = vec3(-90, 0, 0);
    car2.scale = vec3(0.8, 0.8, 0.8);
    car2.updateModelMatrix();
    models.push(car2);

    const slingShot = new Slingshot(vec3(-3, -1, 0), vec3(0, 0, 0), vec3(0.4, 0.4, 0.4));
    slingShot.createSlingshotBase();
    models.push(slingShot);


    
    // Animation loop
    function render(currentTime = 0) {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        if (isTowerFalling) tower.update(currentTime);
        tower.render();

        // Render all models
        for (const model of models) {
            model.render();
        }
        
        // Animate the first car (if loaded)
        if (models[0] && models[0].loaded) {
            models[0].rotation[1] += 0.2; // Rotate Y axis
            models[0].updateModelMatrix();
        }
        
        requestAnimationFrame(render);
    }
    
    render();
}

let points = [];
let colors = [];
let normals = [];

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

//create a cube
function setCubePoints()
{
    points = [];
    colors = [];
    normals = [];
    quad( 1, 0, 3, 2 );
    quad( 2, 3, 7, 6 );
    quad( 3, 0, 4, 7 );
    quad( 6, 5, 1, 2 );
    quad( 4, 5, 6, 7 );
    quad( 5, 4, 0, 1 );

    //return all info needed to draw cube
    return [points, colors, normals];
}

function quad(a, b, c, d)
{
    let vertices = [
        vec4( -0.5, -2.5,  0.5, 1.0 ),
        vec4( -0.5,  2.5,  0.5, 1.0 ),
        vec4(  0.5,  2.5,  0.5, 1.0 ),
        vec4(  0.5, -2.5,  0.5, 1.0 ),
        vec4( -0.5, -2.5, -0.5, 1.0 ),
        vec4( -0.5,  2.5, -0.5, 1.0 ),
        vec4(  0.5,  2.5, -0.5, 1.0 ),
        vec4(  0.5, -2.5, -0.5, 1.0 )
    ];

    let indices = [ a, b, c, a, c, d ];

    for ( let i = 0; i < indices.length; ++i ) {
        points.push( vertices[indices[i]] );
        colors.push([ 0.4, 0.2, 0.0, 1.0 ]);
        normals.push(vec3(vertices[indices[i]][0], vertices[indices[i]][1], vertices[indices[i]][2]))
    }
}



// Initialize shaders with new versions that include lighting
function initShaders() {
    const vertexShader = `
        attribute vec4 vPosition;
        attribute vec3 vNormal;
        attribute vec4 vColor;
        
        uniform mat4 modelMatrix;
        uniform mat4 viewMatrix;
        uniform mat4 projMatrix;
        uniform vec4 lightPosition;
        
        varying vec3 fNormal;
        varying vec3 fLight;
        varying vec3 fView;
        varying vec4 fColor;
        
        void main() {
            // Transform vertex and normal to world coordinates
            vec4 worldPos = modelMatrix * vPosition;
            fNormal = (modelMatrix * vec4(vNormal, 0.0)).xyz;
            
            // Calculate light and view directions
            fLight = lightPosition.xyz - worldPos.xyz;
            fView = -worldPos.xyz;
            
            // Pass color to fragment shader
            fColor = vColor;
            
            // Apply view and projection transforms
            gl_Position = projMatrix * viewMatrix * worldPos;
        }
    `;
    
    const fragmentShader = `
        precision mediump float;
        
        varying vec3 fNormal;
        varying vec3 fLight;
        varying vec3 fView;
        varying vec4 fColor;
        
        uniform vec4 ambientProduct;
        uniform vec4 diffuseProduct;
        uniform vec4 specularProduct;
        uniform float shininess;
        
        void main() {
            // Normalize vectors
            vec3 N = normalize(fNormal);
            vec3 L = normalize(fLight);
            vec3 V = normalize(fView);
            vec3 H = normalize(L + V);
            
            // Calculate lighting components
            float Kd = max(dot(L, N), 0.0);
            vec4 diffuse = Kd * diffuseProduct * fColor;
            
            float Ks = pow(max(dot(N, H), 0.0), shininess);
            vec4 specular = Ks * specularProduct;
            
            vec4 ambient = ambientProduct * fColor;
            
            // Combine lighting components
            gl_FragColor = ambient + diffuse + specular;
            gl_FragColor.a = 1.0;
        }
    `;
    
    // Compile shaders
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vertexShader);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error("VS error: " + gl.getShaderInfoLog(vs));
        return;
    }
    
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fragmentShader);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.error("FS error: " + gl.getShaderInfoLog(fs));
        return;
    }
    
    // Create program
    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Program link error: " + gl.getProgramInfoLog(program));
        return;
    }
}


function pushData(attName) {
    let attrib = gl.getAttribLocation(program, attName);
    gl.vertexAttribPointer(attrib, 4, gl.FLOAT, false, 0, 0);
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