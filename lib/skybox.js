class Skybox {
    constructor() {
        this.position = vec3(0, 0, 0);
        this.rotation = vec3(0, 0, 0);
        this.scale = vec3(1, 1, 1);
        this.modelMatrix = mat4();

        this.points = [];
        this.normals = [];
        this.colors = [];
        this.weights = [];
        this.texCoords = [];

        this.pointBuffer = 0;
        this.normalBuffer = 0;
        this.colorBuffer = 0;
        this.weightBuffer = 0;
        this.texCoordBuffer = 0;


        this.createSkybox();
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

    createSkybox() {
        this.points = [];
        this.texCoords = [];
        this.quadSkybox( 1, 0, 3, 2);
        this.quadSkybox( 2, 3, 7, 6);
        this.quadSkybox( 0, 4, 7, 3);
        this.quadSkybox( 5, 1, 2, 6);
        this.quadSkybox( 6, 7, 4, 5);
        this.quadSkybox( 5, 4, 0, 1);

        // this.pointBuffer = createBuffer(this.points);
        //this.texCoordBuffer = createBuffer(this.texCoords);

        let imageNegX = new Image();
        let imageNegY = new Image();
        let imageNegZ = new Image();
        let imagePosX = new Image();
        let imagePosY = new Image();
        let imagePosZ = new Image();
        imageNegX.crossOrigin = "";
        imageNegY.crossOrigin = "";
        imageNegZ.crossOrigin = "";
        imagePosX.crossOrigin = "";
        imagePosY.crossOrigin = "";
        imagePosZ.crossOrigin = "";
        imageNegX.src = "Images/angrybirdsbackground.png";
        imageNegY.src = "Images/angrybirdsbackground.png";
        imageNegZ.src = "Images/angrybirdsbackground.png";
        imagePosX.src = "Images/angrybirdsbackground.png";
        imagePosY.src = "Images/angrybirdsbackground.png";
        imagePosZ.src = "Images/angrybirdsbackground.png";
        imagePosZ.onload = function() {
            configureCubeMap(imageNegX, imageNegY, imageNegZ, imagePosX, imagePosY, imagePosZ);
        }
    }

    quadSkybox(a, b, c, d) {
        let minT = 0.0;
        let maxT = 1.0;

        let texCoord = [
            vec3(minT, minT, maxT),
            vec3(minT, maxT, maxT),
            vec3(maxT, maxT, maxT),
            vec3(maxT, minT, maxT)
        ];

        let vertices = [
            vec4( -0.5, -0.5,  0.5, 1.0 ),
            vec4( -0.5,  0.5,  0.5, 1.0 ),
            vec4( 0.5,  0.5,  0.5, 1.0 ),
            vec4( 0.5, -0.5,  0.5, 1.0 ),
            vec4( -0.5, -0.5, -0.5, 1.0 ),
            vec4( -0.5,  0.5, -0.5, 1.0 ),
            vec4( 0.5,  0.5, -0.5, 1.0 ),
            vec4( 0.5, -0.5, -0.5, 1.0 )
        ];

        this.points.push(vertices[a]);
        this.texCoords.push(texCoord[0]);

        this.points.push(vertices[b]);
        this.texCoords.push(texCoord[1]);

        this.points.push(vertices[c]);
        this.texCoords.push(texCoord[2]);

        this.points.push(vertices[a]);
        this.texCoords.push(texCoord[0]);

        this.points.push(vertices[c]);
        this.texCoords.push(texCoord[2]);

        this.points.push(vertices[d]);
        this.texCoords.push(texCoord[3]);

        //fill other lists with dummy data
        for (let i = 0; i < 6; i++) {
            this.colors.push(vec4(0.8, 0.8, 0.8, 1.0));
            this.normals.push(vec4(0.0, 0.0, 0.0, 0.0));
            this.weights.push(vec4(0.0, 0.0, 0.0, 0.0));
        }
    }

    render() {
        gl.uniform1i(gl.getUniformLocation(program, "isSkybox"), 1);
        gl.disable(gl.CULL_FACE);


        // Set model matrix for this model's transforms
        gl.uniformMatrix4fv(
            gl.getUniformLocation(program, "modelMatrix"),
            false,
            flatten(this.modelMatrix)
        );


        //populate buffers the first time this is ran
        if (this.pointBuffer === 0) {
            this.pointBuffer = createBuffer(this.points);
            this.normalBuffer = createBuffer(this.normals);
            this.colorBuffer = createBuffer(this.colors);
            this.weightBuffer = createBuffer(this.weights);
            //this.texCoordBuffer = createBuffer(this.texCoords);
        }

        //push all buffer data to shaders
        pushData("vPosition", this.pointBuffer, 4);
        pushData("vNormal", this.normalBuffer, 3);
        pushData("vColor", this.colorBuffer, 4);
        pushData("vWeight", this.weightBuffer, 4);

        // Draw the model
        gl.drawArrays(gl.TRIANGLES, 0, this.points.length);

        //set things back for normal rendering
        gl.uniform1i(gl.getUniformLocation(program, "isSkybox"), 0);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
    }

}


function configureCubeMap(imageNegX, imageNegY, imageNegZ, imagePosX, imagePosY, imagePosZ) {
    let cubeMap = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);

    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, imagePosX);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, imageNegX);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, imagePosY);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, imageNegY);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, imagePosZ);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, imageNegZ);

    gl.uniform1i(gl.getUniformLocation(program, "tex0"), 0);
}





