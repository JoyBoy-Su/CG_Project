// vertext shader
var VSHADER_SOURCE = 
    'attribute vec4 a_Position;\n' +    // attribute variable
    'attribute vec4 a_Color;\n' +    // attribute variable
    'varying vec4 v_Color;\n' +    // varying variable
    'void main() {\n' +
    '  gl_Position = a_Position;\n' +
    '  gl_PointSize = 10.0;\n' +
    '  v_Color = a_Color;\n' +
    '}\n'; 

// fragment shader
var FSHADER_SOURCE = 
    'precision mediump float;\n' + // Precision qualifier
    'varying vec4 v_Color;\n' +    // varying variable
    'void main() {\n' +
    '  gl_FragColor = v_Color;\n' +
    '}\n';

function main() {
    var canvas = document.getElementById("webgl");
    var gl = getWebGLContext(canvas);
    initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE);

    /* vertex */
    var n = vertex_pos.length;
    var vertices = new Float32Array(n * 5);
    setVertices(vertex_pos, vertex_color, canvas, vertices);
    console.log("vertices: ", vertices);

    initVertexBuffers(gl, vertices);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.POINTS, 0, n);
}

function initVertexBuffers(gl, vertices) {
    var buffer = gl.createBuffer();             /* create */

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);     /* bind */
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);   /* data */

    var size = vertices.BYTES_PER_ELEMENT;
    /* attribute position */
    var a_Position = gl.getAttribLocation(gl.program, "a_Position");
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 5 * size, 0);
    gl.enableVertexAttribArray(a_Position);
    /* attribute color */
    var a_Color = gl.getAttribLocation(gl.program, "a_Color");
    gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, 5 * size, 2 * size);
    gl.enableVertexAttribArray(a_Color);
}

function setVertices(pos, color, canvas, vertices) {
    var n = pos.length;
    var rect = canvas.getBoundingClientRect();
    /* pos normalization */
    for (var index in pos) {
        pos[index][0] = ((pos[index][0] - rect.left) - canvas.width / 2) / (canvas.width / 2);
        pos[index][1] = (canvas.height / 2 - (pos[index][1] - rect.top)) / (canvas.height / 2)
    }
    /* color normalization */
    for (var index in color) {
        for (var rgb = 0; rgb < 3; rgb++) {
            color[index][rgb] /= 255;
        }
    }
    /* set vertices */
    for (var index = 0; index < n; index++) {
        vertices[index * 5 + 0] = pos[index][0];
        vertices[index * 5 + 1] = pos[index][1];        
        vertices[index * 5 + 2] = color[index][0];
        vertices[index * 5 + 3] = color[index][1];
        vertices[index * 5 + 4] = color[index][2];
    }
}
