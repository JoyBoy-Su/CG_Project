"use strict";

class Shadow {
    static init(gl) {
        Shadow.OFFSCREEN_WIDTH = ShadowPara.OFFSCREEN_WIDTH;
        Shadow.OFFSCREEN_HEIGHT = ShadowPara.OFFSCREEN_HEIGHT;
        Shadow.eye = new Vector3(sceneDirectionLight);

        // 帧缓冲区
        var framebuffer, texture, depthBuffer;

        // Define the error handling function
        var error = function () {
            if (framebuffer) gl.deleteFramebuffer(framebuffer);
            if (texture) gl.deleteTexture(texture);
            if (depthBuffer) gl.deleteRenderbuffer(depthBuffer);
            return null;
        }

        // Create a framebuffer object (FBO)
        framebuffer = gl.createFramebuffer();
        if (!framebuffer) {
            console.log('Failed to create frame buffer object');
            return error();
        }

        // Create a texture object and set its size and parameters
        texture = gl.createTexture(); // Create a texture object
        if (!texture) {
            console.log('Failed to create texture object');
            return error();
        }
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, Shadow.OFFSCREEN_WIDTH, Shadow.OFFSCREEN_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

        // Create a renderbuffer object and Set its size and parameters
        depthBuffer = gl.createRenderbuffer(); // Create a renderbuffer object
        if (!depthBuffer) {
            console.log('Failed to create renderbuffer object');
            return error();
        }
        gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, Shadow.OFFSCREEN_WIDTH, Shadow.OFFSCREEN_HEIGHT);

        // Attach the texture and the renderbuffer object to the FBO
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

        // Check if FBO is configured correctly
        var e = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (gl.FRAMEBUFFER_COMPLETE !== e) {
            console.log('Frame buffer object is incomplete: ' + e.toString());
            return error();
        }

        framebuffer.texture = texture; // keep the required object

        // Unbind the buffer object
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);

        Shadow.framebuffer = framebuffer;
    }

    static getMatrix() {
        // 平行光的vp矩阵（正交投影）
        // 该矩阵得到平行光下的片元（二维）与z坐标，根据每个点在平行光正交投影下的z坐标
        // 判断在视点的透视投影坐标系下是否为阴影
        return new Matrix4()
            .ortho(-20.0, 20.0, -20.0, 20.0, -10.0, 200.0)
            .lookAt(Shadow.eye.elements[0], Shadow.eye.elements[1], Shadow.eye.elements[2], 0, 0, 0, 0, 1, 0);
    }
}