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
        let bandTransform = createModelMatrix(vec3(0, 6, 0), vec3(0, 0, 0), vec3(1, 1, 1));
        let leftTopTransform = createModelMatrix(vec3(2, 3, 0), vec3(0, 0, -90), vec3(1, 1, 1));
        let rightTopTransform = createModelMatrix(vec3(2, -3, 0), vec3(0, 0, -90), vec3(1, 1, 1));

        let base = new Block(this.modelMatrix);
        let middle = new Block(middleTransform);
        let leftTop = new Block(leftTopTransform);
        let rightTop = new Block(rightTopTransform);
        let band = new Band(bandTransform);

        base.children.push(middle);
        base.children.push(band);
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
        let block = setObjectPoints(0.5, 2.5, 0.5, [ 0.4, 0.2, 0.0, 1.0 ]);
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
        setupBuffer('vPosition', this.vertices, 4);
        setupBuffer('vNormal', this.normals, 3);
        setupBuffer('vColor', this.colors, 4);

        // Draw the model
        gl.drawArrays(gl.TRIANGLES, 0, this.vertices.length);
    }

}

class Band {
    constructor(transformation) {
        let block = setObjectPoints(2.5, 0.35, 0.5, [ 0.9, 0.8, 0.7, 1.0 ]);
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
        setupBuffer('vPosition', this.vertices, 4);
        setupBuffer('vNormal', this.normals, 3);
        setupBuffer('vColor', this.colors, 4);

        // Draw the model
        gl.drawArrays(gl.TRIANGLES, 0, this.vertices.length);
    }
}


let points = [];
let colors = [];
let normals = [];

function setObjectPoints(x, y, z, color)
{
    points = [];
    colors = [];
    normals = [];
    quad( 1, 0, 3, 2, x, y, z, color);
    quad( 2, 3, 7, 6, x, y, z, color);
    quad( 3, 0, 4, 7, x, y, z, color);
    quad( 6, 5, 1, 2, x, y, z, color);
    quad( 4, 5, 6, 7, x, y, z, color);
    quad( 5, 4, 0, 1, x, y, z, color);

    //return all info needed to draw cube
    return [points, colors, normals];
}

function quad(a, b, c, d, x, y, z, color)
{
    let vertices = [
        vec4( -x, -y,  z, 1.0 ),
        vec4( -x,  y,  z, 1.0 ),
        vec4(  x,  y,  z, 1.0 ),
        vec4(  x, -y,  z, 1.0 ),
        vec4( -x, -y, -z, 1.0 ),
        vec4( -x,  y, -z, 1.0 ),
        vec4(  x,  y, -z, 1.0 ),
        vec4(  x, -y, -z, 1.0 )
    ];

    let indices = [ a, b, c, a, c, d ];

    for ( let i = 0; i < indices.length; ++i ) {
        points.push( vertices[indices[i]] );
        colors.push(color);
        normals.push(vec3(vertices[indices[i]][0], vertices[indices[i]][1], vertices[indices[i]][2]))
    }
}

