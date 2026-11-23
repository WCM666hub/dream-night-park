# Dream Night Park / 梦幻夜游乐园

一个使用 Three.js 程序化生成的万圣夜 / 梦幻童话双主题微型游乐园。所有模型、贴图、粒子、灯光和动画均由代码实时生成，没有外部图片或 CDN 依赖。

## 直接体验

在线试玩：https://wcm666hub.github.io/dream-night-park/

下载后双击打开 `index.html` 或 `halloween-night-park.html` 即可。这两个文件都是完整的单文件版本，离线可用。建议使用支持 WebGL 的现代桌面浏览器。

- 右上角按钮：在「童话夜」和「万圣夜」之间切换
- 鼠标拖拽：旋转视角
- 滚轮：缩放
- 点击天空：放烟花
- 点击过山车轨道或列车，或按 `R`：进入第一人称过山车
- `Esc`：退出过山车

主题选择会自动保存在浏览器本地。

## 目录

```text
index.html                 GitHub Pages 网站首页
halloween-night-park.html  可离线分享的单文件网页
index.template.html         HTML 外壳（顶部主题按钮）
build.mjs                   esbuild 构建脚本
src/main.js                 场景完整源码
src/chunks/                 早期分段源码备份
package.json               依赖与项目配置
package-lock.json          锁定依赖版本
THIRD_PARTY_NOTICES.md      第三方依赖许可声明
insert-part.mjs            早期构建辅助脚本
```

## 重新构建

首次使用源码构建时安装锁定的依赖：

```bash
npm ci
npm run build
```

依赖安装后，再次构建只需：

```bash
npm run build
```

构建会同时重新生成 `index.html` 和 `halloween-night-park.html`。`node_modules/` 不提交到仓库。

## GitHub Pages 部署

在仓库的 Settings → Pages 中选择 Deploy from a branch，分支选 `main`，目录选 `/ (root)` 并保存。部署完成后即可通过 GitHub Pages 地址直接体验。
