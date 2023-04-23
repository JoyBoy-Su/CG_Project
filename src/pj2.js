// vertext shader
var VSHADER_SOURCE = `
    attribute vec4 a_Position;\n
    attribute vec4 a_Color;\n
    uniform mat4 u_Matrix;\n
    varying vec4 v_Color;\n
    void main() {\n
        gl_Position = u_Matrix * a_Position;\n
        v_Color = a_Color;\n
    }\n
`;

// fragment shader
var FSHADER_SOURCE = `
    precision mediump float;\n
    uniform float u_Line;\n
    varying vec4 v_Color;\n
    void main() {\n
        if (u_Line > 1.0) {\n
            gl_FragColor = v_Color;\n
        } else {\n
            gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);\n
        }\n
    }\n
`;

var count = 8 * 3;

var mode = 0;           /* 0: can edit; 1: can't */
var border = 1;          /* 0: no border; 1: border */

var angle_step = 45.0;
var scale_step = 0.2;
var scale_lower_limit = 0.2;
var scale_upper_limit = 1.0;
var req_id = -1;

/**
 * mapping: vertices.index -> pos.index 
 * vertices[index] = pos[mapping[index]]
 */
var mapping = [];

function main() {
    var canvas = document.getElementById("webgl");
    /* set canvas width and height */
    canvas.width = canvasSize.maxX;
    canvas.height = canvasSize.maxY;
    /*  */
    mapping = [
        polygon[0][0], polygon[0][2], polygon[0][1], polygon[0][0], polygon[0][2], polygon[0][3],
        polygon[1][0], polygon[1][2], polygon[1][1], polygon[1][0], polygon[1][2], polygon[1][3],
        polygon[2][0], polygon[2][2], polygon[2][1], polygon[2][0], polygon[2][2], polygon[2][3],
        polygon[3][0], polygon[3][2], polygon[3][1], polygon[3][0], polygon[3][2], polygon[3][3],
    ];

    /* webgl */
    var gl = getWebGLContext(canvas);
    initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE);

    /* vertex */
    var vertices = new Float32Array(count * 5);
    initVertexBuffers(gl, vertices);

    /* matrix */
    var matrix = new Matrix4();
    var i_matrix = new Matrix4();
    var u_Matrix = gl.getUniformLocation(gl.program, "u_Matrix");
    var u_Line = gl.getUniformLocation(gl.program, "u_Line");
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    /* model transformation params */
    var angle = 0.0;
    var scale = 1.0;
    
    /* set tick */
    var tick = function() {
        var params = animate(angle, scale);
        angle = params[0];
        scale = params[1];
        _draw(gl, count, vertex_pos, vertex_color, canvas, vertices, angle, scale, matrix, i_matrix, u_Matrix, u_Line);
        req_id = requestAnimationFrame(tick);
    };

    var reset = function() { angle = 1.0; scale = 1.0; }
    var draw = function() { _draw(gl, count, vertex_pos, vertex_color, canvas, vertices, angle, scale, matrix, i_matrix, u_Matrix, u_Line); }

    /* mouse operation */
    canvas.onmousedown = function(event) { canvasMouseDown(event, vertex_pos, i_matrix.elements, canvas); }
    canvas.onmousemove = function(event) { canvasMouseMove(event, draw, i_matrix.elements, canvas); }
    canvas.onmouseup = function(event) { canvasMouseUp(); }

    /* keybord operation */
    document.onkeydown = function(event) { canvasKeyDown(event, tick, reset, draw); }
    // tick();
    draw();
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
function _draw(gl, n, pos, color, canvas, vertices, angle, scale, matrix, i_matrix, u_Matrix, u_Line) {
    /* set position and color (attribute variable) */
    setVertices(pos, color, canvas, vertices);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);   /* data */

    /* set matrix (uniform variable) */
    matrix.setRotate(angle, 0, 0, 1);
    matrix.scale(scale, scale, 1.0);
    i_matrix.setInverseOf(matrix);
    gl.uniformMatrix4fv(u_Matrix, false, matrix.elements);
    /* set line (uniform variable) */
    gl.uniform1f(u_Line, 2.0);
    
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, n);
    
    if (border == 1) {
        /* set line (uniform variable) */
        gl.uniform1f(u_Line, 0.0);
        for (var i = 0; i < n; i++) gl.drawArrays(gl.LINE_LOOP, i * 3, 3);
    }
}

// rotate
var last = Date.now();
var scale_op = 0;   /* 0: decrease; 1: increase */
function animate(angle, scale) {
    var now = Date.now();
    var elapsed = now - last;
    last = now;
    // angle
    angle = angle + (elapsed * angle_step) / 1000.0;
    // scale
    if (scale_op == 0) {
        // decrease
        var _scale = scale - (elapsed * scale_step) / 1000.0;
        scale = (_scale >= scale_lower_limit) ? _scale : scale_lower_limit;
        if (scale == scale_lower_limit) scale_op = 1;
    } else {
        // increase
        var _scale = scale + (elapsed * scale_step) / 1000.0;
        scale = (_scale <= scale_upper_limit) ? _scale : scale_upper_limit;
        if (scale == scale_upper_limit) scale_op = 0;
    }
    return [angle % 360, scale];
}

var move_index = -1;
var move = false;
var range = 10;
// mouse down
function canvasMouseDown(event, pos, matrix, canvas) {
    /* edit */
    if (mode != 0) return;
    /**
     * inverse transformation: offsetX, offsetY -> x', y'(pos)
     * 1: canvas -> webgl
     * 2: inverse transformation
     * 3: webgl -> canvas
     */
    /* webgl coord */
    var w_x = ((event.offsetX/* - rect.left*/) - canvas.width / 2) / (canvas.width / 2);
    var w_y = (canvas.height / 2 - (event.offsetY/* - rect.top*/)) / (canvas.height / 2);
    /* webgl coord after inverse transformation */
    var x = matrix[0] * w_x + matrix[4] * w_y;
    var y = matrix[1] * w_x + matrix[5] * w_y;
    /* canvas coord */
    x = (x + 1) * (canvas.width / 2);
    y = (1 - y) * (canvas.height / 2);
    // check index
    for (var i = 0; i < pos.length; i++) {
        vertex = pos[i];
        if ((x >= vertex[0] - range) && (x <= vertex[0] + range)
        && (y >= vertex[1] - range) && (y <= vertex[1] + range)) {
            move_index = i;
            move = true;
            break;
        }
    }
}

// mouse move
function canvasMouseMove(event, draw, matrix, canvas) {
    if (mode != 0) return;
    /* inverse transformation */
    /* webgl coord */
    var w_x = ((event.offsetX/* - rect.left*/) - canvas.width / 2) / (canvas.width / 2);
    var w_y = (canvas.height / 2 - (event.offsetY/* - rect.top*/)) / (canvas.height / 2);
    /* webgl coord after inverse transformation */
    var x = matrix[0] * w_x + matrix[4] * w_y;
    var y = matrix[1] * w_x + matrix[5] * w_y;
    /* canvas coord */
    x = (x + 1) * (canvas.width / 2);
    y = (1 - y) * (canvas.height / 2);
    // move and draw
    if (move === true && move_index >= 0) {
        vertex = vertex_pos[move_index];
        vertex[0] = x;
        vertex[1] = y;
        // clear
        draw();
    }
}

// mouse up
function canvasMouseUp() {
    if (mode != 0) return;
    // cancel
    move = false;
    move_index = -1;
}

// keyboard down
function canvasKeyDown(event, tick, reset, draw) {
    var code = event.keyCode;                   /* B: 66; E: 69; T: 84 */
    switch (code) {
        case 66:                                /* B */
            border ^= 1;
            draw();
            break;
        case 69:                                /* E */
            mode = 0;                           /* set mode */
            if (req_id != -1) {                 /* cancel req */
                cancelAnimationFrame(req_id);
                req_id = -1;
            }
            reset();                            /* reset angle and scale */
            draw();                             /* draw */
            break;
        case 84:                                /* T */
            mode ^= 1;                          /* switch mode */
            if (mode == 1) {
                /* start timing */
                last = Date.now();
                // start transformation
                tick();
            } else {
                /* cancel tick */
                cancelAnimationFrame(req_id);
                req_id = -1;
            }
            break;
        default:
            console.log("function to be realized...");
            break;
    }
}
