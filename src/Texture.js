
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
        // 平行光正交投影下
        var SHADOW_VSHADER_SOURCE =
            'attribute vec4 a_Position;\n' +
            'uniform mat4 u_MvpMatrixFromLight;\n' +
            'void main() {\n' +
            '  gl_Position = u_MvpMatrixFromLight * a_Position;\n' +
            '}\n';
        // 确定平行光正交投影下该点的z坐标（后续在真正绘制时，比该点z轴靠后的都为阴影部分）
        var SHADOW_FSHADER_SOURCE =
            '#ifdef GL_ES\n' +
            'precision mediump float;\n' +
            '#endif\n' +
            'void main() {\n' +
            '  gl_FragColor = vec4(gl_FragCoord.z, 0.0, 0.0, 0.0);\n' + // Write the z-value in R
            '}\n';

        // Vertex shader program
        let VSHADER_SOURCE = `
            attribute vec4 a_Position;
            attribute vec2 a_TexCoord;
            uniform mat4 u_MvpMatrix;
            uniform mat4 u_MvpMatrixFromLight;
            varying vec4 v_PositionFromLight;
            varying vec2 v_TexCoord;
            varying float v_Dist;
            void main() {
                gl_Position = u_MvpMatrix * a_Position;
                v_TexCoord = a_TexCoord;
                v_Dist = gl_Position.w;
                v_PositionFromLight = u_MvpMatrixFromLight * a_Position;
            }`;

        // Fragment shader program
        let FSHADER_SOURCE = `
            #ifdef GL_ES
            precision mediump float;
            #endif
            uniform sampler2D u_Sampler;
            uniform vec3 u_FogColor;
            uniform vec2 u_FogDist;
            uniform sampler2D u_ShadowMap;
            varying vec2 v_TexCoord;
            varying float v_Dist;
            varying vec4 v_PositionFromLight;
            void main() {
                vec3 shadowCoord = (v_PositionFromLight.xyz/v_PositionFromLight.w)/2.0 + 0.5;
                vec4 rgbaDepth = texture2D(u_ShadowMap, shadowCoord.xy);
                float depth = rgbaDepth.r;
                float visibility = (shadowCoord.z > depth + 0.005) ? 0.7 : 1.0;
                vec4 textureColor = texture2D(u_Sampler, v_TexCoord);
                vec4 color1 = vec4(textureColor.rgb * visibility, textureColor.a);
                float fogFactor = clamp((u_FogDist.y - v_Dist) / (u_FogDist.y - u_FogDist.x), 0.0, 1.0);
                vec3 color2 = mix(u_FogColor, vec3(color1), fogFactor);
                gl_FragColor = vec4(color2, color1.a);
            }`;

        // Initialize shaders
        this.program = createProgram(this.gl, VSHADER_SOURCE, FSHADER_SOURCE);
        if (!this.program) {
            console.log('Failed to create program');
            return;
        }
        this.shadowProgram = createProgram(this.gl, SHADOW_VSHADER_SOURCE, SHADOW_FSHADER_SOURCE);
        if (!this.shadowProgram) {
            console.log("Falied to create shadow program");
            return;
        }
        
        this.gl.enable(this.gl.DEPTH_TEST);
        // program
        // uniform变量
        this.u_MvpMatrix = this.gl.getUniformLocation(this.program, 'u_MvpMatrix');
        this.u_MvpMatrixFromLight = this.gl.getUniformLocation(this.program, 'u_MvpMatrixFromLight');
        this.u_FogColor = this.gl.getUniformLocation(this.program, 'u_FogColor');
        this.u_FogDist = this.gl.getUniformLocation(this.program, 'u_FogDist');
        this.u_ShadowMap = this.gl.getUniformLocation(this.program, 'u_ShadowMap');
        // attribute变量
        this.a_Position = this.gl.getAttribLocation(this.program, 'a_Position');
        this.a_TexCoord = this.gl.getAttribLocation(this.program, 'a_TexCoord');
        
        // shadow program
        this.a_PositionShadow = this.gl.getAttribLocation(this.shadowProgram, 'a_Position');
        this.u_MvpMatrixFromLightShadow = this.gl.getUniformLocation(this.shadowProgram, 'u_MvpMatrixFromLight');
        
        this.gl.useProgram(this.program);
        this.gl.program = this.program;
    }

    initPerspective() {
        // model矩阵
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
        
        // shadow buffer
        this.vertexBufferShadow = this.gl.createBuffer();
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

    shadow() {
        // 切换program
        // this.gl.useProgram(this.shadowProgram);
        // // 绑定position数据
        // this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBufferShadow);
        // this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.entity.vertex), this.gl.STATIC_DRAW);
        // this.gl.vertexAttribPointer(this.a_PositionShadow, 3, this.gl.FLOAT, false, 0, 0);
        // this.gl.enableVertexAttribArray(this.a_PositionShadow);
        // // 绑定平行光正交投影下的mvp矩阵
        // this.mvpMatrixFromLightShadow = Shadow.getMatrix();
        // this.mvpMatrixFromLightShadow.concat(this.g_modelMatrix);
        // this.gl.uniformMatrix4fv(this.u_MvpMatrixFromLightShadow, false, this.mvpMatrixFromLightShadow.elements);
        // Draw
        // this.gl.drawElements(this.gl.TRIANGLE_STRIP, this.entity.index.length, this.gl.UNSIGNED_SHORT, 0);
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

        // fog相关
        this.gl.uniform3fv(this.u_FogColor, new Vector3(fogColor).elements);
        this.gl.uniform2f(this.u_FogDist, fogDist[0], fogDist[1]);

        // shadow相关
        // mvp from light矩阵
        this.mvpMatrixFromLight = Shadow.getMatrix();
        this.mvpMatrixFromLight.concat(this.g_modelMatrix);
        this.gl.uniformMatrix4fv(this.u_MvpMatrixFromLight, false, this.mvpMatrixFromLight.elements);
        // shadow map
        this.gl.uniform1i(this.program.u_ShadowMap, 0)

        // Draw the texture
        this.gl.drawElements(this.gl.TRIANGLE_STRIP, this.entity.index.length, this.gl.UNSIGNED_SHORT, 0);
    }
}

