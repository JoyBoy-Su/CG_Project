
"use strict";

class TextureLoader {

    constructor(entity, config) {
        this.entity = entity;
        this.gl = config.gl;
        this.enableLight = config.enableLight;
        this.activeTextureIndex = config.activeTextureIndex;
        this.filename = config.filename;
    }

    init() {
        this.initShaders();

        this.initTextures();

        this.initBuffers();

        this.initPerspective();

        return this;
    }

    initShaders() {
        // Vertex shader program
        let VSHADER_SOURCE = `
            attribute vec4 a_Position;
            attribute vec2 a_TexCoord;
            uniform mat4 u_ModelMatrix;
            uniform mat4 u_MvpMatrix;
            uniform vec4 u_Eye;
            varying vec2 v_TexCoord;
            varying float v_Dist;
            void main() {
                gl_Position = u_MvpMatrix * a_Position;
                v_TexCoord = a_TexCoord;
                v_Dist = gl_Position.w;
            }`;

        // Fragment shader program
        let FSHADER_SOURCE = `
            #ifdef GL_ES
            precision mediump float;
            #endif
            uniform sampler2D u_Sampler;
            uniform vec3 u_FogColor;
            uniform vec2 u_FogDist;
            varying vec2 v_TexCoord;
            varying float v_Dist;
            void main() {
                vec4 textureColor = texture2D(u_Sampler, v_TexCoord);
                float fogFactor = clamp((u_FogDist.y - v_Dist) / (u_FogDist.y - u_FogDist.x), 0.0, 1.0);
                vec3 color = mix(u_FogColor, vec3(textureColor), fogFactor);
                gl_FragColor = vec4(color, textureColor.a);
            }`;

        // Initialize shaders
        this.program = createProgram(this.gl, VSHADER_SOURCE, FSHADER_SOURCE);
        if (!this.program) {
            console.log('Failed to create program');
            return;
        }

        this.gl.useProgram(this.program);
        this.gl.program = this.program;
    }

    initPerspective() {
        this.gl.enable(this.gl.DEPTH_TEST);
        // Get the storage location of u_MvpMatrix
        this.u_ModelMatrix = this.gl.getUniformLocation(this.program, 'u_ModelMatrix');
        this.u_MvpMatrix = this.gl.getUniformLocation(this.gl.program, 'u_MvpMatrix');
        if (!this.u_MvpMatrix) {
            console.log('Failed to get the storage location of u_MvpMatrix');
        }

        // Assign the buffer object to a_Position and enable the assignment
        this.a_Position = this.gl.getAttribLocation(this.gl.program, 'a_Position');
        // Assign the buffer object to a_TexCoord variable and enable the assignment of the buffer object
        this.a_TexCoord = this.gl.getAttribLocation(this.gl.program, 'a_TexCoord');

        // fog
        this.u_Eye = this.gl.getUniformLocation(this.program, 'u_Eye');
        this.u_FogColor = this.gl.getUniformLocation(this.program, 'u_FogColor');
        this.u_FogDist = this.gl.getUniformLocation(this.program, 'u_FogDist');

        this.g_modelMatrix = new Matrix4();
        this.g_modelMatrix.translate(this.entity.translate[0], this.entity.translate[1], this.entity.translate[2]);
        this.g_modelMatrix.scale(this.entity.scale[0], this.entity.scale[1], this.entity.scale[2]);

    }

    initBuffers() {
        // Write the vertex coordinates to the buffer object
        this.vertexBuffer = this.gl.createBuffer();

        // Write the vertex texture coordinates to the buffer object
        this.vertexTexCoordBuffer = this.gl.createBuffer();

        // Write the indices to the buffer object
        this.vertexIndexBuffer = this.gl.createBuffer();
    }

    initTextures() {
        // Create a texture object
        this.texture = this.gl.createTexture();

        // Get the storage location of u_Sampler
        this.u_Sampler = this.gl.getUniformLocation(this.gl.program, 'u_Sampler');
        if (!this.u_Sampler) {
            console.log('Failed to get the storage location of u_Sampler');
            return;
        }

        // Load texture image
        this.textureImage = new Image();
        this.textureImage.src = this.entity.texImagePath;
        this.textureImage.onload = () => {
            this.handleTextureLoad();
        };
    }

    handleTextureLoad() {
        this.gl.useProgram(this.program);
        this.gl.activeTexture(this.gl[`TEXTURE${this.activeTextureIndex}`]);
        // Flip the image's y axis
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, 1);

        // Bind the texture object to the target
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);

        // Set the texture parameters
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        // Set the texture image
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB, this.gl.RGB, this.gl.UNSIGNED_BYTE, this.textureImage);

        // Set the texture unit 0 to the sampler
        this.gl.uniform1i(this.u_Sampler, this.activeTextureIndex);
    }

    render() {
        this.gl.useProgram(this.program);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.entity.vertex), this.gl.STATIC_DRAW);

        this.gl.vertexAttribPointer(this.a_Position, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.a_Position);


        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexTexCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.entity.texCoord), this.gl.STATIC_DRAW);

        this.gl.vertexAttribPointer(this.a_TexCoord, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.a_TexCoord);

        this.gl.activeTexture(this.gl[`TEXTURE${this.activeTextureIndex}`]);


        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.entity.index), this.gl.STATIC_DRAW);


        // Set the eye point and the viewing volume
        this.mvpMatrix = Camera.getMatrix();
        this.mvpMatrix.concat(this.g_modelMatrix);

        // Pass the model view projection matrix to u_MvpMatrix
        this.gl.uniformMatrix4fv(this.u_MvpMatrix, false, this.mvpMatrix.elements);
        this.gl.uniformMatrix4fv(this.u_ModelMatrix, false, this.g_modelMatrix.elements);

        // fog
        // set eye
        var eyes = Camera.eye.elements;
        this.gl.uniform4f(this.u_Eye, eyes[0], eyes[1], eyes[2], 1.0);
        // set fog color and dist
        this.gl.uniform3fv(this.u_FogColor, new Vector3(fogColor).elements);
        this.gl.uniform2f(this.u_FogDist, fogDist[0], fogDist[1]);

        // Draw the texture
        this.gl.drawElements(this.gl.TRIANGLE_STRIP, this.entity.index.length, this.gl.UNSIGNED_SHORT, 0);
    }
}

