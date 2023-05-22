"use strict";

class Shadow {
    static getMatrix() {
        // 平行光的vp矩阵（正交投影）
        // 该矩阵得到平行光下的片元（二维）与z坐标，根据每个点在平行光正交投影下的z坐标
        // 判断在视点的透视投影坐标系下是否为阴影
        return new Matrix4()
            .ortho(-20.0, 20.0, -20.0, 20.0, -10.0, 200.0)
            .lookAt(Shadow.eye.elements[0], Shadow.eye.elements[1], Shadow.eye.elements[2], 0, 0, 0, 0, 1, 0);
    }
}