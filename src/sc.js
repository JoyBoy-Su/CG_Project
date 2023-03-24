var range = 10;

// 绘制一个点(x, y)的函数
function drawPoint(cxt, x, y, color) {
    //建立一条新的路径
    cxt.beginPath();
    //设置画笔的颜色
    cxt.strokeStyle = "rgb(" + color[0] + "," +
        +color[1] + "," +
        +color[2] + ")";
    //设置路径起始位置
    cxt.moveTo(x, y);
    //在路径中添加一个节点
    cxt.lineTo(x + 1, y + 1);
    //用画笔颜色绘制路径
    cxt.stroke();
}

// 绘制线段的函数绘制一条从(x1, y1)到(x2, y2)的线段
function drawLine(cxt, x1, y1, x2, y2, color) {
    cxt.beginPath();
    cxt.strokeStyle = "rgba(" + color[0] + "," +
        +color[1] + "," +
        +color[2] + "," +
        +255 + ")";
    //这里线宽取1会有色差，但是类似半透明的效果有利于debug，取2效果较好
    cxt.lineWidth = 1;
    cxt.moveTo(x1, y1);
    cxt.lineTo(x2, y2);
    cxt.stroke();
    // console.log("draw Line done");
}

// 绘制一个圆
function drawCircle(cxt, x, y, r, color) {
    cxt.fillStyle = "rgba(" + color[0] + "," +
        +color[1] + "," +
        +color[2] + "," +
        +255 + ")";
    cxt.beginPath();
    cxt.arc(x, y, r, 0, Math.PI * 2, true);
    cxt.closePath();
    cxt.fill();
    // console.log("draw Circle done");
}

// 绘制一个四边形
function drawQuadrangle(cxt, vertexs, color) {
    // console.log("draw quadrangle")
    // 确定NET
    y_max = Math.max(vertexs[0][1], vertexs[1][1], vertexs[2][1], vertexs[3][1]);
    y_min = Math.min(vertexs[0][1], vertexs[1][1], vertexs[2][1], vertexs[3][1]);
    // console.log("y_max = ", y_max, "y_min = ", y_min);
    let net = new Array(y_max - y_min + 1).fill('');
    for (index in net) {
        net[index] = new Array();
    };
    // console.log("net = ", net);
    let edge1 = {
        y_max: (vertexs[0][1] > vertexs[1][1]) ? (vertexs[0][1]) : (vertexs[1][1]),
        y_min: (vertexs[0][1] < vertexs[1][1]) ? (vertexs[0][1]) : (vertexs[1][1]),
        x: (vertexs[0][1] > vertexs[1][1]) ? (vertexs[1][0]) : (vertexs[0][0]),
        delta: (vertexs[0][0] - vertexs[1][0]) / (vertexs[0][1] - vertexs[1][1])
    };
    let edge2 = {
        y_max: (vertexs[1][1] > vertexs[2][1]) ? (vertexs[1][1]) : (vertexs[2][1]),
        y_min: (vertexs[1][1] < vertexs[2][1]) ? (vertexs[1][1]) : (vertexs[2][1]),
        x: (vertexs[1][1] > vertexs[2][1]) ? (vertexs[2][0]) : (vertexs[1][0]),
        delta: (vertexs[1][0] - vertexs[2][0]) / (vertexs[1][1] - vertexs[2][1])
    };
    let edge3 = {
        y_max: (vertexs[2][1] > vertexs[3][1]) ? (vertexs[2][1]) : (vertexs[3][1]),
        y_min: (vertexs[2][1] < vertexs[3][1]) ? (vertexs[2][1]) : (vertexs[3][1]),
        x: (vertexs[2][1] > vertexs[3][1]) ? (vertexs[3][0]) : (vertexs[2][0]),
        delta: (vertexs[2][0] - vertexs[3][0]) / (vertexs[2][1] - vertexs[3][1])
    };
    let edge4 = {
        y_max: (vertexs[3][1] > vertexs[0][1]) ? (vertexs[3][1]) : (vertexs[0][1]),
        y_min: (vertexs[3][1] < vertexs[0][1]) ? (vertexs[3][1]) : (vertexs[0][1]),
        x: (vertexs[3][1] > vertexs[0][1]) ? (vertexs[0][0]) : (vertexs[3][0]),
        delta: (vertexs[3][0] - vertexs[0][0]) / (vertexs[3][1] - vertexs[0][1])
    }
    // console.log("edge1 = ", edge1);
    // console.log("edge2 = ", edge2);
    // console.log("edge3 = ", edge3);
    // console.log("edge4 = ", edge4);
    if (edge1.y_max !== edge1.y_min) net[edge1.y_min - y_min].push(edge1);
    if (edge2.y_max !== edge2.y_min) net[edge2.y_min - y_min].push(edge2);
    if (edge3.y_max !== edge3.y_min) net[edge3.y_min - y_min].push(edge3);
    if (edge4.y_max !== edge4.y_min) net[edge4.y_min - y_min].push(edge4);
    // 定义AET
    let aet = [];
    for (let scan = y_min; scan <= y_max; scan++) {
        // console.log("scan = ", scan);
        // 删除到达max的活性边并更新活性边
        for (let index = 0; index < aet.length; index++) {
            if (aet[index].y_max === scan) {
                aet.splice(index, 1);
                // console.log("remove");
                index--;
            }
            else aet[index].x += aet[index].delta;
        }
        // 读net加入aet
        for (let index = 0; index < net[scan - y_min].length; index++) {
            // console.log("edge =", net[scan][index]);
            aet.push(net[scan - y_min][index]);
        }
        // console.log("aet = ", aet, "length = ", aet.length);
        // 两两读取aet中的x坐标画线
        aet.sort((a, b) => a.x - b.x);
        for (index = 0; index < aet.length; index += 2) {
            drawLine(cxt, aet[index].x, scan, aet[index + 1].x, scan, color);
        }
    }
    // console.log("draw Quadrangle done");
}

function drawCanvas(cxt, vertex_pos, polygon, vertex_color) {
    // 获取第一个四边形的四个顶点坐标
    vertexs = [
        vertex_pos[polygon[0][0]], vertex_pos[polygon[0][1]],
        vertex_pos[polygon[0][2]], vertex_pos[polygon[0][3]]
    ];
    // console.log(vertexs);
    drawQuadrangle(cxt, vertexs, vertex_color[0]);

    vertexs = [
        vertex_pos[polygon[1][0]], vertex_pos[polygon[1][1]],
        vertex_pos[polygon[1][2]], vertex_pos[polygon[1][3]]
    ];
    // console.log(vertexs);
    drawQuadrangle(cxt, vertexs, vertex_color[1]);

    vertexs = [
        vertex_pos[polygon[2][0]], vertex_pos[polygon[2][1]],
        vertex_pos[polygon[2][2]], vertex_pos[polygon[2][3]]
    ];
    // console.log(vertexs);
    drawQuadrangle(cxt, vertexs, vertex_color[3]);

    vertexs = [
        vertex_pos[polygon[3][0]], vertex_pos[polygon[3][1]],
        vertex_pos[polygon[3][2]], vertex_pos[polygon[3][3]]
    ];
    // console.log(vertexs);
    drawQuadrangle(cxt, vertexs, vertex_color[2]);

    // 绘制9个点
    for (pos in vertex_pos) {
        drawCircle(cxt, vertex_pos[pos][0], vertex_pos[pos][1], range, [255, 0, 0]);
    }
}