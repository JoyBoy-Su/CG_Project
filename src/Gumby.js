"use strict";

class Gumby {

    static init() {
        var cnt = ObjectList.length;
        Gumby.transform = ObjectList[cnt - 1].transform;
        Gumby.axis = [0, 1, 0];
        Gumby.modelMatrix = new Matrix4();
        for (let t of Gumby.transform) {
            Gumby.modelMatrix[t.type].apply(Gumby.modelMatrix, t.content);
        }
        Gumby.inverseMatrix = new Matrix4();
        Gumby.inverseMatrix.setInverseOf(Gumby.modelMatrix);
    }

    static getMatrix(angle) {
        // 先逆变换回绕(0, 1, 0)转 inverse；绕(0, 1, 0)旋转angle rotate，再做一次变换model
        return new Matrix4().set(Gumby.modelMatrix)
            .rotate(angle, Gumby.axis[0], Gumby.axis[1], Gumby.axis[2])
            .concat(Gumby.inverseMatrix);
    }

}