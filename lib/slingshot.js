// A class to create our Slingshot model :)
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

    // Create the base of the slingshot and push other sections to it as children
    createSlingshot() {
        // Set all relative transformations to the base
        this.updateModelMatrix();
        let middleTransform = createModelMatrix(vec3(0, 3, 0), vec3(0, 0, 90), vec3(1, 1, 1));
        let bandTransform = createModelMatrix(vec3(0, 6, 0), vec3(0, 0, 0), vec3(1, 1, 1));
        let leftTopTransform = createModelMatrix(vec3(2, 3, 0), vec3(0, 0, -90), vec3(1, 1, 1));
        let rightTopTransform = createModelMatrix(vec3(2, -3, 0), vec3(0, 0, -90), vec3(1, 1, 1));

        // Create pieces of slingshot
        let base = new Block(this.modelMatrix);
        let middle = new Block(middleTransform);
        let leftTop = new Block(leftTopTransform);
        let rightTop = new Block(rightTopTransform);
        let band = new Band(bandTransform);

        //set up the hierarchy
        base.children.push(middle);
        base.children.push(band);
        middle.children.push(leftTop);
        middle.children.push(rightTop);

        this.base = base;
    }

    // Allows each block to render in the right order with a proper model matrix based on hierarchy
    hierarchy(block) {
        this.stack.push(this.hierarchyMatrix);
        this.hierarchyMatrix = mult(this.hierarchyMatrix, block.transformation);

        // If the node is a model, apply render to their model matrix
        // Render each block using the current hierarchy matrix
        block.render(this.hierarchyMatrix);

        // Continue for each child of the node
        for(let i = 0; i < block.children.length; i++) {
            this.hierarchy(block.children[i]);
        }

        // Remove transformation from hierarchy matrix once model is no longer on stack
        this.hierarchyMatrix = this.stack.pop();
    }

    render() {
        this.hierarchy(this.base);
    }
}

// A block that makes up the slingshot
class Block {
    constructor(transformation) {
        let block = setObjectPoints(0.5, 2.5, 0.5, [ 0.4, 0.2, 0.0, 1.0 ]);
        this.vertices = block[0];
        this.colors = block[1];
        this.normals = block[2];
        this.weights = block[3];

        this.pointBuffer = 0;
        this.normalBuffer = 0;
        this.colorBuffer = 0;
        this.weightBuffer = 0;

        this.children = [];
        this.transformation = transformation;
    }

    render(modelMatrix) {
        gl.uniformMatrix4fv(
            gl.getUniformLocation(program, "modelMatrix"),
            false,
            flatten(modelMatrix)
        );

        if (this.pointBuffer === 0) {
            this.pointBuffer = createBuffer(this.vertices);
            this.normalBuffer = createBuffer(this.normals);
            this.colorBuffer = createBuffer(this.colors);
            this.weightBuffer = createBuffer(this.weights);
        }

        pushData("vPosition", this.pointBuffer, 4);
        pushData("vNormal", this.normalBuffer, 3);
        pushData("vColor", this.colorBuffer, 4);
        pushData("vWeight", this.weightBuffer, 4);

        gl.drawArrays(gl.TRIANGLES, 0, this.vertices.length);
    }

}

// class for the Slingshot's rubber band that contorts with bone matrices in the html
// the rubber band of the slingshot
class Band {
    constructor(transformation) {
        let block = setBandPoints(2.5, 0.35, 0.5, [ 0.9, 0.8, 0.7, 1.0 ]); // The rubber band shape
        this.vertices = block[0]; 
        this.colors = block[1];
        this.normals = block[2];
        this.weights = block[3]; // To use with skeletal animation and bone matrices

        this.pointBuffer = 0;
        this.normalBuffer = 0;
        this.colorBuffer = 0;
        this.weightBuffer = 0;

        this.children = [];
        this.transformation = transformation;
    }

    render(modelMatrix) {
        // Mark that this is the rubber band so that shader can handle it differently
        gl.uniform1i(gl.getUniformLocation(program, "isBand"), 1);

        gl.uniformMatrix4fv(
            gl.getUniformLocation(program, "modelMatrix"),
            false,
            flatten(modelMatrix)
        );

        if (this.pointBuffer === 0) {
            this.pointBuffer = createBuffer(this.vertices);
            this.normalBuffer = createBuffer(this.normals);
            this.colorBuffer = createBuffer(this.colors);
            this.weightBuffer = createBuffer(this.weights);
        }

        pushData("vPosition", this.pointBuffer, 4);
        pushData("vNormal", this.normalBuffer, 3);
        pushData("vColor", this.colorBuffer, 4);
        pushData("vWeight", this.weightBuffer, 4);

        gl.drawArrays(gl.TRIANGLES, 0, this.vertices.length);

        gl.uniform1i(gl.getUniformLocation(program, "isBand"), 0);
    }
}


let points = [];
let colors = [];
let normals = [];
let weights = [];
function setBandPoints(x, y, z, color)
{
    points = [];
    colors = [];
    normals = [];
    weights = [];

    // First section
    quadSet(-x/2, y, z, -x, -y, -z, color);
    // Second section
    quadSet(0, y, z, -x/2, -y, -z, color);
    // Third section
    quadSet(x/2, y, z, 0, -y, -z, color);
    // Fourth section
    quadSet(x, y, z, x/2, -y, -z, color);

    // Return all info needed to draw cube
    return [points, colors, normals, weights];
}

// A function to make subsections of the band using quad functions
function quadSet(x, y, z, nX, nY, nZ, color) {
    quad( 1, 0, 3, 2, x, y, z, nX, nY, nZ, color);
    quad( 2, 3, 7, 6, x, y, z, nX, nY, nZ, color);
    quad( 3, 0, 4, 7, x, y, z, nX, nY, nZ, color);
    quad( 6, 5, 1, 2, x, y, z, nX, nY, nZ, color);
    quad( 4, 5, 6, 7, x, y, z, nX, nY, nZ, color);
    quad( 5, 4, 0, 1, x, y, z, nX, nY, nZ, color);
}

// Populates the arrays for an object
function setObjectPoints(x, y, z, color)
{
    points = [];
    colors = [];
    normals = [];
    weights = [];
    quadSet(x, y, z, -x, -y, -z, color);

    return [points, colors, normals, weights];
}

// Draws a quadrilateral based on given points
function quad(a, b, c, d, x, y, z, nX, nY, nZ, color)
{
    let vertices = [
        vec4( nX, nY,  z, 1.0 ),
        vec4( nX,  y,  z, 1.0 ),
        vec4(  x,  y,  z, 1.0 ),
        vec4(  x, nY,  z, 1.0 ),
        vec4( nX, nY, nZ, 1.0 ),
        vec4( nX,  y, nZ, 1.0 ),
        vec4(  x,  y, nZ, 1.0 ),
        vec4(  x, nY, nZ, 1.0 )
    ];

    // Weights for the band's bones
    let vertexWeights = [
        vec4(0.1, 0.0, 0.0, 0.0),
        vec4(0.5, 0.5, 0.0, 0.0),
        vec4(0.2, 0.6, 0.2, 0.0),
        vec4(0.0, 0.5, 0.5, 0.0),
        vec4(0.0, 0.0, 1.0, 0.0)
    ]

    let indices = [ a, b, c, a, c, d ];

    for ( let i = 0; i < indices.length; ++i ) {
        points.push( vertices[indices[i]] );
        colors.push(color);
    }

    // Add normals
    for (let i = 0; i < indices.length; i += 3) {
        let v1 = vertices[indices[i]];
        let v2 = vertices[indices[i + 1]];
        let v3 = vertices[indices[i + 2]];

        const p1 = vec3(v1[0], v1[1], v1[2]);
        const p2 = vec3(v2[0], v2[1], v2[2]);
        const p3 = vec3(v3[0], v3[1], v3[2]);

        const e1 = subtract(p2, p1);
        const e2 = subtract(p3, p1);

        const normal = normalize(cross(e1, e2));

        normals.push(normal);
        normals.push(normal);
        normals.push(normal);
    }


    // Sets weights, this only matters for the band
    for ( let i = 0; i < indices.length; ++i ) {
        let x = vertices[indices[i]][0];
        if (x < 0) {
            if (x < -2) {
                weights.push(vertexWeights[0]);
            }
            else {
                weights.push(vertexWeights[1]);
            }

        }
        else if (x > 0) {
            if (x > 2) {
                weights.push(vertexWeights[4]);
            }
            else {
                weights.push(vertexWeights[3]);
            }
        }
        else {
            weights.push(vertexWeights[2]);
        }
    }
}

