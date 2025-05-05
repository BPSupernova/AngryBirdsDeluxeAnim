let modelMatrixLoc;
let vPosition, vTexCoord; // Store attribute locations globally

/**
 * 
 * @param a A vertice of the cube
 * @param b A vertice of the cube
 * @param c A vertice of the cube
 * @param d A vertice of the cube
 */
function quadSky(a, b, c, d) {
    let minT = 0.0;
    let maxT = 1.0;

    let texCoord = [
        vec2(minT, minT),
        vec2(minT, maxT),
        vec2(maxT, maxT),
        vec2(maxT, minT),
    ];

    let cubeVertices = [
        vec4(-0.5, -0.5, -0.5, 1.0), 
        vec4(-0.5, 0.5, -0.5, 1.0),
        vec4(0.5, 0.5, -0.5, 1.0),
        vec4(0.5, -0.5, -0.5, 1.0),
        vec4(-0.5, -0.5, 0.5, 1.0),
        vec4(-0.5, 0.5, 0.5, 1.0),
        vec4(0.5, 0.5, 0.5, 1.0),
        vec4(0.5, -0.5, 0.5, 1.0),
    ];

    skyboxPoints.push(cubeVertices[a]);
    skyboxTextures.push(texCoord[0]);

    skyboxPoints.push(cubeVertices[b]);
    skyboxTextures.push(texCoord[1]);

    skyboxPoints.push(cubeVertices[c]);
    skyboxTextures.push(texCoord[2]);

    skyboxPoints.push(cubeVertices[a]);
    skyboxTextures.push(texCoord[0]);

    skyboxPoints.push(cubeVertices[c]);
    skyboxTextures.push(texCoord[2]);

    skyboxPoints.push(cubeVertices[d]);
    skyboxTextures.push(texCoord[3]);
}

/**
 * Creates the cube structure and relationship between the 
 * vertices and points for the skybox
 */
function fillCube() {
    quadSky(1, 0, 3, 2);
    quadSky(2, 3, 7, 6);
    quadSky(0, 4, 7, 3);
    quadSky(5, 1, 2, 6);
    quadSky(6, 7, 4, 5);
    quadSky(5, 4, 0, 1);
}

/**
 * Configures a default texture for the cubeMap/skybox upon loading the scene
 */
function configureDefaultCubeMap() {
    cubeMap = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);

    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Create a square red texture (2x2) to ensure width == height
    let red = new Uint8Array([
        255, 0, 0, 255, 255, 0, 0, 255,
        255, 0, 0, 255, 255, 0, 0, 255
    ]);

    // Use 2x2 texture for all cube faces
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, red);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, red);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, red);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, red);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, red);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, red);

    gl.uniform1i(gl.getUniformLocation(program, "texMap"), 1);
}

/**
 * This function configures the cubeMap that the skybox uses
 * @param images An array of 6 ImageBitmaps, one per each face of the cubeMap 
 */
function configureSkybox(images) {
    modelMatrixLoc = gl.getUniformLocation(program, "modelMatrix");
    
    // Store attribute locations for later use
    vPosition = gl.getAttribLocation(program, "vPosition");
    vTexCoord = gl.getAttribLocation(program, "vTexCoord");

    cubeMap = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);

    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    let targets = [
        gl.TEXTURE_CUBE_MAP_POSITIVE_X, gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
        gl.TEXTURE_CUBE_MAP_POSITIVE_Y, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
        gl.TEXTURE_CUBE_MAP_POSITIVE_Z, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
    ];

    // Create a canvas to resize images if needed
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    images.forEach((image, i) => {
        // Check if image is square
        if (image.width !== image.height) {
            // Resize to square using the larger dimension
            const size = Math.max(image.width, image.height);
            canvas.width = size;
            canvas.height = size;
            
            // Clear and draw image centered
            ctx.clearRect(0, 0, size, size);
            ctx.drawImage(
                image, 
                (size - image.width) / 2, 
                (size - image.height) / 2,
                image.width,
                image.height
            );
            
            // Use the canvas content
            gl.texImage2D(targets[i], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
        } else {
            // Use original image if already square
            gl.texImage2D(targets[i], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        }
    });

    gl.uniform1i(gl.getUniformLocation(program, "texMap"), 1);
}

/**
 * This function renders the skybox into the scene using the skyboxPoints and skyboxTextures stored earlier
 */
function drawSkyBox() {
    gl.depthMask(false);

    // Enable skybox shader settings
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap); 
    gl.uniform1i(gl.getUniformLocation(program, "texMap"), 1);
    gl.uniform1i(gl.getUniformLocation(program, "isSkybox"), 1);

    // Only attempt to set attributes if the locations are valid
    if (vPosition !== undefined && vPosition !== -1) {
        let vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(skyboxPoints), gl.STATIC_DRAW);
        gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);
    } else {
        console.warn("vPosition attribute location is invalid");
        vPosition = gl.getAttribLocation(program, "vPosition");
    }

    if (vTexCoord !== undefined && vTexCoord !== -1) {
        let textureBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(skyboxTextures), gl.STATIC_DRAW);
        gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vTexCoord);
    } else {
        console.warn("vTexCoord attribute location is invalid");
        vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    }

    // Apply scaling to make the skybox large
    modelMatrix = translate(3.8, 5.3, 11);
    modelMatrix = mult(modelMatrix, scalem(5, 5, 5));
    gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(modelMatrix));
    modelMatrix = mat4();

    // Draw the skybox if we have points
    if (skyboxPoints.length > 0) {
        gl.drawArrays(gl.TRIANGLES, 0, skyboxPoints.length);
    }

    // Reset shader settings
    gl.uniform1i(gl.getUniformLocation(program, "isSkybox"), 0);
    gl.activeTexture(gl.TEXTURE0); // Reset active texture to unit 0

    gl.depthMask(true);
}