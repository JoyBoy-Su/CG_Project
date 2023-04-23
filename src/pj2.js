// vertext shader
var VSHADER_SOURCE = 
    'attribute vec4 a_Position;\n' +    // attribute variable
    'attribute vec4 a_Color;\n' +       // attribute variable
    'varying vec4 v_Color;\n' +         // varying variable
    'uniform mat4 u_Matrix;\n' +       // attribute variable
    'void main() {\n' +
    '  gl_Position = u_Matrix * a_Position;\n' +
    '  v_Color = a_Color;\n' +
    '}\n'; 

// fragment shader
var FSHADER_SOURCE = 
    'precision mediump float;\n' + // Precision qualifier
    'varying vec4 v_Color;\n' +    // varying variable
    'void main() {\n' +
    '  gl_FragColor = v_Color;\n' +
    '}\n';

var count = 8 * 3;
var angle_step = 45.0;
// var scale_step = 0.2;
// var scale_lower_limit = 0.2;
// var scale_upper_limit = 1.0;

function main() {
    var canvas = document.getElementById("webgl");
    /* set canvas width and height */
    canvas.width = canvasSize.maxX;
    canvas.height = canvasSize.maxY;

    /* webgl */
    var gl = getWebGLContext(canvas);
    initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE);

    /* vertex */
    var vertices = new Float32Array(count * 5);
    initVertexBuffers(gl, vertices);
    /* matrix */
    var matrix = new Matrix4();
    var u_Matrix = gl.getUniformLocation(gl.program, "u_Matrix");
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    /* model transformation params */
    var angle = 0.0;
    var scale = 1.0;
    
    /* mouse operation */
    canvas.onmousedown = function(event) { canvasMouseDown(event, vertex_pos); }
    canvas.onmousemove = function(event) { canvasMouseMove(event, gl, count, vertex_pos, vertex_color, canvas, vertices); }
    canvas.onmouseup = function(event) { canvasMouseUp(); }

    /* set tick */
    var tick = function() {
        var params = animate(angle);
        angle = params[0];
        // scale = params[1];
        draw(gl, count, vertex_pos, vertex_color, canvas, vertices, angle, scale, matrix, u_Matrix);
        requestAnimationFrame(tick);
    };
    tick();
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

/**
 * mapping: vertices.index -> pos.index 
 * vertices[index] = pos[mapping[index]]
 * triangle mapping:
 * 1-th triangle
 * vertices[0]  = pos[4]
 * vertices[1]  = pos[1]
 * vertices[2]  = pos[0]
 * 2-th triangle
 * vertices[3]  = pos[4]
 * vertices[4]  = pos[0]
 * vertices[5]  = pos[3]
 * 3-th triangle
 * vertices[6]  = pos[4]
 * vertices[7]  = pos[3]
 * vertices[8]  = pos[7]
 * 4-th triangle
 * vertices[9]  = pos[4]
 * vertices[10] = pos[7]
 * vertices[11] = pos[8]
 * 5-th triangle
 * vertices[12] = pos[4]
 * vertices[13] = pos[8]
 * vertices[14] = pos[5]
 * 6-th triangle
 * vertices[15] = pos[4]
 * vertices[16] = pos[5]
 * vertices[17] = pos[1]
 * 7-th triangle
 * vertices[18] = pos[3]
 * vertices[19] = pos[6]
 * vertices[20] = pos[7]
 * 8-th triangle
 * vertices[21] = pos[1]
 * vertices[22] = pos[2]
 * vertices[23] = pos[5]
 */
var mapping = [
    4, 1, 0, 4, 0, 3,
    4, 3, 7, 4, 7, 8,
    4, 8, 5, 4, 5, 1,
    3, 6, 7, 1, 2, 5,
];
function setVertices(pos, color, canvas, vertices) {
    // var rect = canvas.getBoundingClientRect();
    /* set vertices */
    for (var index = 0; index < count; index++) {
        vertices[index * 5 + 0] = ((pos[mapping[index]][0]/* - rect.left*/) - canvas.width / 2) / (canvas.width / 2);
        vertices[index * 5 + 1] = (canvas.height / 2 - (pos[mapping[index]][1]/* - rect.top*/)) / (canvas.height / 2);
        vertices[index * 5 + 2] = color[mapping[index]][0] / 255;
        vertices[index * 5 + 3] = color[mapping[index]][1] / 255;
        vertices[index * 5 + 4] = color[mapping[index]][2] / 255;
    }
}

/* draw canvas */
function draw(gl, n, pos, color, canvas, vertices, angle, scale, matrix, u_Matrix) {
    /* set position and color (attribute variable) */
    setVertices(pos, color, canvas, vertices);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);   /* data */

    /* set matrix (uniform variable) */
    matrix.setRotate(angle, 0, 0, 1);
    matrix.scale(scale, scale, 1.0);
    gl.uniformMatrix4fv(u_Matrix, false, matrix.elements);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, n);
}

var move_index = -1;
var move = false;
var range = 10;
// mouse down
function canvasMouseDown(event, pos) {
    // check index
    for (var i = 0; i < pos.length; i++) {
        vertex = pos[i];
        if ((event.offsetX >= vertex[0] - range) && (event.offsetX <= vertex[0] + range)
        && (event.offsetY >= vertex[1] - range) && (event.offsetY <= vertex[1] + range)) {
            move_index = i;
            move = true;
            break;
        }
    }
}

// mouse move
function canvasMouseMove(event, gl, n, pos, color, canvas, vertices) {
    // move and draw
    if (move === true && move_index >= 0) {
        vertex = vertex_pos[move_index];
        vertex[0] = event.offsetX;
        vertex[1] = event.offsetY;
        // clear
        draw(gl, n, pos, color, canvas, vertices);
    }
}

// mouse up
function canvasMouseUp() {
    // cancle
    move = false;
    move_index = -1;
}

// rotate
var last = Date.now();
function animate(angle, scale) {
    var now = Date.now();
    var elapsed = now - last;
    last = now;
    // angle
    angle = angle + (elapsed * angle_step) / 1000.0;
    // scale
    // if (scale - 0.2 <= 0.01) {
    //     // scale == 0.2
    //     scale = scale + (elapsed * scale_step);
    // } else {
    //     // scale > 0.2
    //     scale = scale - (elapsed * scale_step);
    // }
    return [angle % 360, scale];
}
