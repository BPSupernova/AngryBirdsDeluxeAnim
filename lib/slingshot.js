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