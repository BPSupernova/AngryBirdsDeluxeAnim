// A class to represent the obj formatted 3D models we are importing into our project
// These models do not have textures
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

            // Add dummy weights
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

        // Populate buffers the first time this is ran
        if (this.pointBuffer === 0) {
            this.pointBuffer = createBuffer(this.vertices);
            this.normalBuffer = createBuffer(this.normals);
            this.colorBuffer = createBuffer(this.colors);
            this.weightBuffer = createBuffer(this.weights);
        }

        // Push all buffer data to shaders
        pushData("vPosition", this.pointBuffer, 4);
        pushData("vNormal", this.normalBuffer, 3);
        pushData("vColor", this.colorBuffer, 4);
        pushData("vWeight", this.weightBuffer, 4);
        
        // Draw the model
        gl.drawArrays(gl.TRIANGLES, 0, this.vertices.length);
    }
}
