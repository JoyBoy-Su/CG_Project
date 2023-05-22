"use strict";

var pointLight = 0;

class ObjectLoader {
    constructor(entity, config) {
        this.gl = config.gl;
        this.entity = entity;
        this.last = 0;
        this.angle = 0;
    }

    init() {

        this.initShaders();

        this.initPerspective();

        this.g_objDoc = null;      // The information of OBJ file
        this.g_drawingInfo = null; // The information for drawing 3D model


        // Prepare empty buffer objects for vertex coordinates, colors, and normals
        this.initBuffers();
        if (!this.buffers) {
            console.log('Failed to set the vertex information');
            return;
        }

        // Start reading the OBJ file
        this.readOBJFile(`${this.entity.objFilePath}`, this.buffers, 1, true);

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
        attribute vec4 a_Color;
        attribute vec4 a_Normal;
        uniform mat4 u_MvpMatrix;
        uniform mat4 u_ModelMatrix;
        uniform mat4 u_NormalMatrix;
        uniform vec3 u_Color;
        uniform vec3 u_LightDirection;
        uniform vec3 u_AmbientLight;
        uniform vec3 u_LightPosition;
        uniform vec3 u_PointLightColor;
        uniform mat4 u_MvpMatrixFromLight;
        varying vec4 v_PositionFromLight;
        varying vec4 v_Color;
        varying float v_Dist;
        void main() {
            gl_Position = u_MvpMatrix * a_Position;

            vec4 normal1 = u_NormalMatrix * a_Normal;
            vec3 normal = normalize(normal1.xyz);
            vec4 vertexPostion = u_ModelMatrix * a_Position;
            vec3 pointLightDirection = normalize(u_LightPosition - vec3(vertexPostion));

            float nDotL1 = max(dot(u_LightDirection, normal), 0.0);
            vec3 u_DiffuseLight = vec3(1.0, 1.0, 1.0);
            float nDotL2 = max(dot(pointLightDirection, normal), 0.0);
            vec3 diffuse = u_DiffuseLight * u_Color * nDotL1 + u_PointLightColor * u_Color * nDotL2;
            vec3 ambient = u_AmbientLight * u_Color;

            v_Color = vec4(diffuse + ambient, a_Color.a);
            v_Dist = gl_Position.w;
            v_PositionFromLight = u_MvpMatrixFromLight * a_Position;
        }`;

        // Fragment shader program
        let FSHADER_SOURCE = `
        #ifdef GL_ES
        precision mediump float;
        #endif
        uniform vec3 u_FogColor;
        uniform vec2 u_FogDist;
        uniform sampler2D u_ShadowMap;
        varying vec4 v_Color;
        varying float v_Dist;
        varying vec4 v_PositionFromLight;
        void main() {
            vec3 shadowCoord = (v_PositionFromLight.xyz/v_PositionFromLight.w)/2.0 + 0.5;
            vec4 rgbaDepth = texture2D(u_ShadowMap, shadowCoord.xy);
            float depth = rgbaDepth.r;
            float visibility = (shadowCoord.z > depth + 0.005) ? 0.7 : 1.0;
            float fogFactor = clamp((u_FogDist.y - v_Dist) / (u_FogDist.y - u_FogDist.x), 0.0, 1.0);
            vec3 color1 = mix(u_FogColor, vec3(v_Color), fogFactor);
            vec4 color2 = vec4(color1, v_Color.a);
            gl_FragColor = vec4(color2.rgb * visibility, color2.a);
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
        // attribute变量
        this.a_Position = this.gl.getAttribLocation(this.program, 'a_Position');
        this.a_Color = this.gl.getAttribLocation(this.program, 'a_Color');
        this.a_Normal = this.gl.getAttribLocation(this.program, 'a_Normal');
        // uniform变量
        this.u_MvpMatrix = this.gl.getUniformLocation(this.program, 'u_MvpMatrix');
        this.u_NormalMatrix = this.gl.getUniformLocation(this.program, 'u_NormalMatrix');
        this.u_ModelMatrix = this.gl.getUniformLocation(this.program, 'u_ModelMatrix');
        this.u_MvpMatrixFromLight = this.gl.getUniformLocation(this.program, 'u_MvpMatrixFromLight');
        this.u_ShadowMap = this.gl.getUniformLocation(this.program, 'u_ShadowMap');
        this.u_FogColor = this.gl.getUniformLocation(this.program, 'u_FogColor');
        this.u_FogDist = this.gl.getUniformLocation(this.program, 'u_FogDist');
        this.u_LightDirection = this.gl.getUniformLocation(this.program, 'u_LightDirection');
        this.u_AmbientLight = this.gl.getUniformLocation(this.program, 'u_AmbientLight');
        this.u_LightPosition = this.gl.getUniformLocation(this.program, 'u_LightPosition');
        this.u_PointLightColor = this.gl.getUniformLocation(this.program, 'u_PointLightColor');
        this.u_Color = this.gl.getUniformLocation(this.program, 'u_Color');

        // shadow program
        this.a_PositionShadow = this.gl.getAttribLocation(this.shadowProgram, 'a_Position');
        this.u_MvpMatrixFromLightShadow = this.gl.getUniformLocation(this.shadowProgram, 'u_MvpMatrixFromLight');

        this.gl.useProgram(this.program);
        this.gl.program = this.program;
    }

    initPerspective() {
        this.g_modelMatrix = new Matrix4();
        this.g_normalMatrix = new Matrix4();
        for (let t of this.entity.transform) {
            this.g_modelMatrix[t.type].apply(this.g_modelMatrix, t.content);
        }
    }

    initBuffers() {
        // Create a buffer object, assign it to attribute variables, and enable the assignment
        this.buffers = {
            vertexBuffer: this.gl.createBuffer(),
            normalBuffer: this.gl.createBuffer(),
            colorBuffer: this.gl.createBuffer(),
            indexBuffer: this.gl.createBuffer()
        };
    }

    readOBJFile(fileName, model, scale, reverse) {
        let request = new XMLHttpRequest();

        request.onreadystatechange = () => {
            if (request.readyState === 4 && (request.status == 200 || request.status == 0)) {
                this._onReadOBJFile(request.responseText, fileName, model, scale, reverse);
            }
        };
        request.open('GET', fileName, true);
        request.send();
    }

    _onReadOBJFile(fileString, fileName, o, scale, reverse) {
        let objDoc = new OBJDoc(fileName);  // Create a OBJDoc object
        let result = objDoc.parse(fileString, scale, reverse); // Parse the file
        if (!result) {
            this.g_objDoc = null;
            this.g_drawingInfo = null;
            console.log("OBJ file parsing error.");
            return;
        }
        this.g_objDoc = objDoc;
    }

    shadow(timestamp) {
        // 切换program
        // this.gl.useProgram(this.shadowProgram);
        // // 初始化
        // if (this.g_objDoc != null && this.g_objDoc.isMTLComplete()) {
        //     this.onReadComplete();
        // }
        // if (!this.g_drawingInfo) return;

        // if (this.hasOwnProperty('nextFrame')) {
        //     this.nextFrame(timestamp);
        //     this.initPerspective();
        // }
        // // 动画
        // this.animate(timestamp);
        // // 绑定平行光正交投影下的mvp矩阵
        // this.mvpMatrixFromLightShadow = Shadow.getMatrix();
        // this.mvpMatrixFromLightShadow.concat(this.g_modelMatrix);
        // this.gl.uniformMatrix4fv(this.u_MvpMatrixFromLightShadow, false, this.mvpMatrixFromLightShadow.elements);
        // // 绘制
        // this.gl.drawElements(this.gl.TRIANGLES, this.g_drawingInfo.indices.length, this.gl.UNSIGNED_SHORT, 0);
    }

    render(timestamp) {
        this.gl.useProgram(this.program);
        this.gl.program = this.program;

        if (this.g_objDoc != null && this.g_objDoc.isMTLComplete()) {
            this.onReadComplete();
        }
        if (!this.g_drawingInfo) return;

        if (this.hasOwnProperty('nextFrame')) {
            this.nextFrame(timestamp);
            this.initPerspective();
        }

        this.animate(timestamp);

        let lightDirection = new Vector3(sceneDirectionLight);
        lightDirection.normalize();
        this.gl.uniform3fv(this.u_LightDirection, lightDirection.elements);
        this.gl.uniform3fv(this.u_AmbientLight, new Vector3(sceneAmbientLight).elements);
        this.gl.uniform3fv(this.u_LightPosition, Camera.eye.elements);
        this.gl.uniform3fv(this.u_PointLightColor, new Vector3(scenePointLightColor.map(x => x * pointLight)).elements);
        this.gl.uniform3fv(this.u_Color, new Vector3(this.entity.color).elements);

        this.g_normalMatrix.setInverseOf(this.g_modelMatrix);
        this.g_normalMatrix.transpose();
        this.gl.uniformMatrix4fv(this.u_NormalMatrix, false, this.g_normalMatrix.elements);
        this.gl.uniformMatrix4fv(this.u_ModelMatrix, false, this.g_modelMatrix.elements);

        let g_mvpMatrix = Camera.getMatrix();
        g_mvpMatrix.concat(this.g_modelMatrix);

        this.gl.uniformMatrix4fv(this.u_MvpMatrix, false, g_mvpMatrix.elements);
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

        // Draw
        this.gl.drawElements(this.gl.TRIANGLES, this.g_drawingInfo.indices.length, this.gl.UNSIGNED_SHORT, 0);
    }

    onReadComplete() {
        // Acquire the vertex coordinates and colors from OBJ file
        this.g_drawingInfo = this.g_objDoc.getDrawingInfo();

        // Write date into the buffer object
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.g_drawingInfo.vertices, this.gl.STATIC_DRAW);

        this.gl.vertexAttribPointer(this.a_Position, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.a_Position);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.normalBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.g_drawingInfo.normals, this.gl.STATIC_DRAW);

        this.gl.vertexAttribPointer(this.a_Normal, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.a_Normal);


        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.colorBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.g_drawingInfo.colors, this.gl.STATIC_DRAW);

        this.gl.vertexAttribPointer(this.a_Color, 4, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.a_Color);

        // Write the indices to the buffer object
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.indexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, this.g_drawingInfo.indices, this.gl.STATIC_DRAW);
    }

    animate(timestamp) {
        if (this.entity.objFilePath.indexOf('bird') > 0) {
            let elapsed = timestamp - this.last;
            this.last = timestamp;
            this.g_modelMatrix = new Matrix4();
            this.g_normalMatrix = new Matrix4();
            // rotate
            this.angle = (this.angle + elapsed * ROTATE_VELOCITY / 1000.0) % 360;
            this.g_modelMatrix.rotate(this.angle, 0, 1, 0);
            // translate
            this.g_modelMatrix.translate(0, Math.sin(this.angle * Math.PI / 360) * HEIGHT_VELOCITY, 0);
            for (let t of this.entity.transform) {
                this.g_modelMatrix[t.type].apply(this.g_modelMatrix, t.content);
            }
        }
    }

}
