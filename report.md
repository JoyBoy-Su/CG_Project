# Report 2

20302010043 苏佳迪

### 项目信息

##### 项目目录

```text
src
|--- config.js	（配置数据）
|--- pj2.js		（扫描转换算法实现）
|--- pj2.html	（页面）
lib
|--- xxx.js		（webgl依赖）
```

##### 开发与运行环境

浏览器：最新版本Google Chrome

##### 运行及使用方法

用浏览器打开`pj2.html`文件即可

### 项目中的亮点

##### 变换后的拖拽

在本次pj中按下T后图形会开始进行旋转 + 缩放的变换，有两种方式停下：按下E或再次按下T。再次按下T后会保持变换的样子，这时候实现在变换后图形上拖拽的思路如下：

1、修改`mousedown()`时确定是否选中顶点的逻辑，需要进行进行下面的坐标变换过程：

```js
/**
* inverse transformation: offsetX, offsetY -> x', y'(pos)
* 1: canvas -> webgl
* 2: inverse transformation
* 3: webgl -> canvas
*/
```

由于点击事件`event.offsetX`和`event.offsetY`是在canvas下的坐标，因此需要进行坐标变换，首先需要转换为webgl坐标，对webgl坐标进行与图形相对应的逆变换得到点击的坐标在未变换时的webgl坐标，将得到的webgl坐标再次复原到canvas，从而与`vertex`的位置进行比较。

2、修改`mousemove()`时修改`vertex`的逻辑，同样需要继续同样的坐标变换过程：

```js
/**
* inverse transformation: offsetX, offsetY -> x', y'(pos)
* 1: canvas -> webgl
* 2: inverse transformation
* 3: webgl -> canvas
*/
```

坐标变换的过程和`mousedown()`时完全相同，完成**变换后的canvas坐标**到**变换前的canvas坐标**，并将变换前的坐标设为`vertex`移动值，完成顶点的移动。

##### 代码封装解耦

对`draw()`函数的封装：

绘制图形的函数声明如下，具有很长的参数表。

```js
function _draw(gl, n, pos, color, canvas, vertices, angle, scale, matrix, i_matrix, u_Matrix, u_Line);
```

由于`draw()`函数在很多地方都要调用，如果不进行封装会导致极其庞大的传参，书写不便。于是在`main()`中通过为`_draw()`函数套一层封装，并定义为变量`draw()`，实现后面方便的传参：

```js
var draw = function() { _draw(gl, count / 4, vertex_pos, vertex_color, canvas, vertices, angle, scale, matrix, i_matrix, u_Matrix, u_Line); }
```

后面需要重新绘制的时候，如`mousemove()`与`keydown()`，它们的参数表只需要一个简单的`draw`函数变量即可。（同样在`keyboard down`的处理函数中，按下E键是需要重置当前的缩放比与旋转角，为了减少代码见的耦合，将`angle = 1.0; scale = 1.0;`的封装为`reset()`函数，这样后续如果需要扩展出平移这种变换操作，也不需要调整`keydown()`的参数表，只需要在`reset()`中加入平移坐标的恢复）

### 项目仍存在的缺陷

##### 判断鼠标按下时是否选中顶点

由于要考虑容差，判断鼠标是否选中顶点时需要经过相对复杂的逻辑如下：

```js
if (offsetX >= x - range && offsetX <= x + range && offsetY >= y - range && offsetY <= y + range) {
    // ...
}
```

且这里需要对九个顶点遍历，相对来说较慢。个人感觉可以设计一种数据结构，不需要循环遍历顶点便可以得到选中的顶点下标。

（注：这个是pj1的遗留问题）