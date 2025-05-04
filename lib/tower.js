// A class that serves as a single block in the Tower
// Named Node to go along with the Heirarcical Modeling
class Node {
    constructor(id, parent = null, position, size, color) {
        this.num = id;
        this.parent = parent;
        this.children = [];
        this.localPos = position;
        this.localRotation = vec3(0, 0, 0);
        this.size = size;
        this.color = color;
        this.velocity = vec3(0, 0, 0);
        this.angularVelocity = vec3(0, 0, 0);
        this.falling = false;
        this.fallStartTime = 0;
        this.originalPos = vec3(position);

        this.pointBuffer = 0;
        this.normalBuffer = 0;
        this.colorBuffer = 0;

        if (parent) parent.addChild(this);
    }

    addChild(child) {
        this.children.push(child);
        child.parent = this;
    }

    getWorldPos() {
        if (this.parent) {
            const parentPos = this.parent.getWorldPos();
            return add(parentPos, this.localPos);
        }
        return this.localPos;
    }

    getWorldRotation() {
        if (this.parent) {
            const parentRot = this.parent.getWorldRotation();
            return add(parentRot, this.localRotation);
        }
        return this.localRotation;
    }

    getModelMatrix() {
        let modelMatrix = mat4();
        
        if (this.parent) {
            modelMatrix = this.parent.getModelMatrix();
        }
        
        modelMatrix = mult(modelMatrix, translate(...this.localPos));
        modelMatrix = mult(modelMatrix, rotateZ(this.localRotation[2]));
        modelMatrix = mult(modelMatrix, rotateY(this.localRotation[1]));
        modelMatrix = mult(modelMatrix, rotateX(this.localRotation[0]));
        modelMatrix = mult(modelMatrix, scalem(...this.size));
        
        return modelMatrix;
    }

    updatePhysics(currentTime) {
        if (this.num == tower.blocks.length - 1 && !this.falling) {
            for (let i = 0; i < tower.blocks.length - 1; i++) {
                this.velocity = vec3(0, 0, 0);
                this.angularVelocity = vec3(0, 0, 0);
            }
            return;
        }

        const deltaTime = (currentTime - this.fallStartTime) / 1000;
        
        this.localPos[0] = this.originalPos[0] + this.velocity[0] * deltaTime;
        this.localPos[1] = this.originalPos[1] + this.velocity[1] * deltaTime - 0.5 * G * deltaTime * deltaTime;
        this.localPos[2] = this.originalPos[2] + this.velocity[2] * deltaTime;
        
        this.localRotation[0] = this.angularVelocity[0] * deltaTime;
        this.localRotation[1] = this.angularVelocity[1] * deltaTime;
        this.localRotation[2] = this.angularVelocity[2] * deltaTime;
        
        const worldPos = this.getWorldPos();
        if (worldPos[1] < 0) {
            this.localPos[1] -= worldPos[1];
            this.velocity = vec3(0, 0, 0);
            this.angularVelocity = vec3(0, 0, 0);
            this.falling = false;
            this.originalPos = vec3(this.localPos); 
        }
        

        this.children.forEach(child => child.updatePhysics(currentTime));
    }

    render() {
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "modelMatrix"), false, flatten(this.getModelMatrix()));

        const vertices = [
            vec4(-0.5, -0.5, 0.5, 1.0), vec4(0.5, -0.5, 0.5, 1.0), vec4(0.5, 0.5, 0.5, 1.0), vec4(-0.5, 0.5, 0.5, 1.0),
            vec4(-0.5, -0.5, -0.5, 1.0), vec4(0.5, -0.5, -0.5, 1.0), vec4(0.5, 0.5, -0.5, 1.0), vec4(-0.5, 0.5, -0.5, 1.0),
            vec4(-0.5, 0.5, -0.5, 1.0), vec4(0.5, 0.5, -0.5, 1.0), vec4(0.5, 0.5, 0.5, 1.0), vec4(-0.5, 0.5, 0.5, 1.0),
            vec4(-0.5, -0.5, -0.5, 1.0), vec4(0.5, -0.5, -0.5, 1.0), vec4(0.5, -0.5, 0.5, 1.0), vec4(-0.5, -0.5, 0.5, 1.0), 
            vec4(0.5, -0.5, -0.5, 1.0), vec4(0.5, 0.5, -0.5, 1.0), vec4(0.5, 0.5, 0.5, 1.0), vec4(0.5, -0.5, 0.5, 1.0),
            vec4(-0.5, -0.5, -0.5, 1.0), vec4(-0.5, 0.5, -0.5, 1.0), vec4(-0.5, 0.5, 0.5, 1.0), vec4(-0.5, -0.5, 0.5, 1.0) 
        ];

        const normals = [
            vec3(0, 0, 1), vec3(0, 0, 1), vec3(0, 0, 1), vec3(0, 0, 1),
            vec3(0, 0, -1), vec3(0, 0, -1), vec3(0, 0, -1), vec3(0, 0, -1),
            vec3(0, 1, 0), vec3(0, 1, 0), vec3(0, 1, 0), vec3(0, 1, 0),
            vec3(0, -1, 0), vec3(0, -1, 0), vec3(0, -1, 0), vec3(0, -1, 0),
            vec3(1, 0, 0), vec3(1, 0, 0), vec3(1, 0, 0), vec3(1, 0, 0),
            vec3(-1, 0, 0), vec3(-1, 0, 0), vec3(-1, 0, 0), vec3(-1, 0, 0)
        ]

        const colors = [];
        for (let i = 0; i < 24; i++) {
            colors.push(this.color);
        }

        if (this.pointBuffer === 0) {
            this.pointBuffer = createBuffer(vertices);
            this.normalBuffer = createBuffer(normals);
            this.colorBuffer = createBuffer(colors);
        }

        pushData("vPosition", this.pointBuffer, 4);
        pushData("vNormal", this.normalBuffer, 3);
        pushData("vColor", this.colorBuffer, 4);
        
        for (let j = 0; j < 6; j++) {
            gl.drawArrays(gl.TRIANGLE_FAN, j * 4, 4);
        }

        this.children.forEach(child => child.render());
    }
}

class Tower {
    constructor(height = 5, position = vec3(0, 0, -5), pigModel = null) {
        this.root = null;
        this.blocks = [];
        this.height = height;
        this.position = position;
        this.pigModel = pigModel;
        this.buildTower();
    }

    buildTower() {
        const blockSize = vec3(1, 1, 1);
        const blockSpacing = 0.1;
        const colors = [
            vec4(1, 0, 1, 1),  
            vec4(1, 0, 1, 1),   
            vec4(1, 0, 1, 1),   
            vec4(1, 0, 1, 1),   
            vec4(1, 0, 1, 1)    
        ];

        this.root = new Node(0, null, this.position, blockSize, colors[0]);
        this.blocks.push(this.root);

        let parent = this.root;
        for (let i = 1; i < this.height; i++) {
            const block = new Node(i, parent, vec3(0, blockSize[1] + blockSpacing, 0), blockSize, colors[i % colors.length]);
            this.blocks.push(block);
            parent = block;
        }
    }

    collapse(startTime) {
        for (let i = this.blocks.length - 1; i >= 0; i--) {
            const block = this.blocks[i];
            block.falling = true;
            block.fallStartTime = startTime + (this.blocks.length - 1 - i) * 100;

            const forceFactor = (this.blocks.length - i) / this.blocks.length;
            block.velocity = vec3(
                (Math.random() - 0.5) * 2 * forceFactor,
                Math.random() * 2 * forceFactor,
                (Math.random() - 0.5) * forceFactor
            );
            block.angularVelocity = vec3(
                Math.random() * 2 * forceFactor,
                Math.random() * 2 * forceFactor,
                Math.random() * 2 * forceFactor
            );
        }

        // Make pig fall too if it exists
        if (this.pigModel) {
            this.pigModel.falling = true;
            this.pigModel.fallStartTime = startTime;
            this.pigModel.velocity = vec3(
                (Math.random() - 0.5) * 2,
                Math.random() * 2,
                (Math.random() - 0.5)
            );
            this.pigModel.angularVelocity = vec3(
                Math.random() * 2,
                Math.random() * 2,
                Math.random() * 2
            );
            this.pigModel.originalPos = vec3(this.pigModel.position);
        }
    }

    update(currentTime) {
        this.root.updatePhysics(currentTime);
        
        // Update pig physics if it exists and is falling
        if (this.pigModel && this.pigModel.falling) {
            const deltaTime = (currentTime - this.pigModel.fallStartTime) / 1000;
            
            this.pigModel.position[0] = this.pigModel.originalPos[0] + this.pigModel.velocity[0] * deltaTime;
            this.pigModel.position[1] = this.pigModel.originalPos[1] + this.pigModel.velocity[1] * deltaTime - 0.5 * G * deltaTime * deltaTime;
            this.pigModel.position[2] = this.pigModel.originalPos[2] + this.pigModel.velocity[2] * deltaTime;
            
            this.pigModel.rotation[0] = this.pigModel.angularVelocity[0] * deltaTime;
            this.pigModel.rotation[1] = this.pigModel.angularVelocity[1] * deltaTime;
            this.pigModel.rotation[2] = this.pigModel.angularVelocity[2] * deltaTime;
            
            if (this.pigModel.position[1] < 0) {
                this.pigModel.position[1] = 0;
                this.pigModel.velocity = vec3(0, 0, 0);
                this.pigModel.angularVelocity = vec3(0, 0, 0);
                this.pigModel.falling = false;
                this.pigModel.originalPos = vec3(this.pigModel.position);
            }
            
            this.pigModel.updateModelMatrix();
        }
    }

    render() {
        this.root.render();
    }
}

function collapseTower() {
    if (isTowerFalling) return;
    isTowerFalling = true;
    fallStartTime = performance.now();
    tower.collapse(fallStartTime);
}