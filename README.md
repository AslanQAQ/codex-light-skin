# Codex Light Skin

[English](README.en.md)

临时美化 Windows Codex：自定义背景、浅色配色、清晰的聊天文字、浅灰输入框、半透明侧边栏，以及浅色弹出对话框和菜单面板。只提供“应用”和“撤销”，执行完成后补丁就退出。

**实验性源码版，非 OpenAI 官方产品。没有预览环节，也没有管理窗口、后台守护或开机自启。** 原型曾在 Codex 26.930.3930.0 上实测；此精简版入口目前只通过离线检查，尚未重新接入真实窗口。其他 Codex 版本会拒绝应用。

## 可以美化哪些地方？

| 部分 | 当前提供的样式 |
|---|---|
| **主背景** | 使用本机 PNG，自动铺满聊天主区域；可以调节白色遮罩的强度，让背景变淡。 |
| **聊天文字与对比度** | 使用深灰正文、灰色次要文字和深色输入光标，配合浅色面板；改善浅背景上的白字问题。 |
| **聊天输入框** | 半透明浅灰底、深色文字和淡灰边框，下方操作栏使用接近的浅灰色。 |
| **侧边栏透明效果** | 将背景图与半透明浅色遮罩叠加在侧边栏，保留菜单与项目文字的可读性。 |
| **网页弹出对话框** | 浅色半透明底、深色文字和淡灰边框；覆盖网页中的 dialog、dialog/alertdialog 角色元素。 |
| **菜单与其他面板** | 跟随 Codex 的共享配色变量，使用浅色面板、深色文字和淡紫色强调。 |

可调的是主背景淡化程度（`--overlay`）；文字、输入框、侧边栏及弹出面板目前使用固定浅色方案，没有独立的对比度或透明度滑块。这里的“透明”是网页样式效果，不会改变整个 Windows 窗口的透明度。Windows 原生文件选择器等独立窗口不在补丁范围内；此精简版的真实界面效果仍待实机验收。

## 原项目与致谢

原项目：[**Codex Dream Skin — Fei-Away/Codex-Dream-Skin**](https://github.com/Fei-Away/Codex-Dream-Skin)。感谢原作者 Fei-Away 及社区提供的 Codex 换肤思路。

本项目起因是使用 Dream Skin 时遇到 Windows 版本兼容问题，因此独立实现了一个小型临时背景与配色工具。**它不是 Dream Skin 的 fork，也不是原作者发布的官方修复版**；不修改其引擎，不包含原项目引擎或社区主题素材。

如果原项目更新后已适配你的 Codex 版本，可以结束本补丁流程，按原项目说明切回。依赖和素材说明见 [第三方说明](THIRD-PARTY-NOTICES.md)。

## 先弄清楚：哪些要开，哪些要关？

| 项目 | 操作要求 |
|---|---|
| **官方 Codex** | 准备前先完整退出；按下面第 3 步手动打开一次后，**保持这个窗口打开**，才能应用、使用和撤销补丁。直接从日常快捷方式打开的窗口不能用于本补丁。 |
| **Codex Dream Skin** | **退出它的托盘程序及皮肤引擎**。不用启动它，不用在它里面选主题、应用背景或导入主题包；可以保留安装文件。 |
| **以前的 Codex Light Skin 管理窗口** | 关闭，不与本版同时使用。本版没有管理窗口。 |
| **Windows 桌面壁纸** | 不用提前更换。Codex 背景与桌面壁纸是两回事。 |
| **Wallpaper Engine、透明任务栏软件** | 不参与本补丁，保持平常使用状态即可。本项目不修改它们，也不要求安装或卸载它们。 |
| **背景图片** | 在电脑上准备一张实际的 PNG 文件，应用时填写它的完整路径；不用提前在任何软件里应用。 |
| **PowerShell 命令窗口** | 必须从 Windows 单独打开，**不要使用 Codex 内的终端**。命令执行期间保持打开；执行结束、出现结果并回到提示符后可以关闭。 |

如果 Dream Skin 已改变了你原来的 Codex 配色，先用它的官方恢复功能恢复，再退出它。本补丁的“撤销”只撤销自己的样式，不能代替 Dream Skin 的恢复功能。

## 开始前

需要：

- Windows Microsoft Store 版 Codex，当前仅接受版本 **26.930.3930.0**。
- Node.js **22.19.0 或更新版本**，以及可用的 npm。项目不包含 Node，也不会自动安装或修改 PATH。
- 一张你有权使用的 **PNG**：不超过 **8 MiB**，长、宽各不超过 **8192** 像素，总像素不超过 **3200 万**。不支持动态壁纸、ZIP、JPG、theme.css 或 theme.json；把文件改名为 .png 不算格式转换。

源码 ZIP 不是双击安装程序。解压到你选择的文件夹，例如 D:\tools\codex-light-skin。后面的“项目文件夹”是**能看到 package.json、README.md 和 src 文件夹的那一层**。

### 需要接受的本机调试风险

下面第 3 步会手动打开 Codex 的 **127.0.0.1:9437 调试入口**。它没有密码，同一电脑上的其他程序可能读取或控制这个 Codex 窗口。仅限本机连接也不等于有认证保护。

补丁不会替你启动、重启或关闭 Codex，不复制原有登录资料。单独的 local-profile 资料目录可能需要你自己重新登录。结束使用时要**完整退出该 Codex**，确认入口关闭，再从平常的官方入口打开。

不接受这个风险就不要执行第 3 步和应用命令。更多边界见 [SECURITY.md](SECURITY.md)。

## 使用步骤

### 1. 在 Windows 单独打开 PowerShell

在 Windows 开始菜单打开 PowerShell，再切换到解压后的项目文件夹。下面路径只是示例，与你的位置不同时请替换：

~~~powershell
Set-Location -LiteralPath 'D:\tools\codex-light-skin'
~~~

后面所有命令都在这个文件夹里执行。**这个命令窗口应能在你退出 Codex 后继续存在。**

### 2. 首次使用时准备依赖

~~~powershell
npm ci --ignore-scripts --cache .cache/npm
~~~

成功结束后再继续。这一步需要联网，只安装项目依赖到项目里的 node_modules，指定缓存也在项目内；不安装全局软件。同一份项目依赖没有变化时，后续不用重复执行。

若提示找不到 node 或 npm，先停止：需要准备兼容的 Node/npm，或使用已有便携版的完整路径，不能跳过依赖步骤。

### 3. 保存输入，完整退出 Codex，再手动打开一个窗口

先保存未发送的输入；退出 Dream Skin 和旧管理工具；从 **Codex 菜单完整退出**。关闭主窗口、缩到托盘、关闭命令窗口，都不一定等于完整退出。

在上面那个独立 PowerShell 中，**整段复制执行一次**：

~~~powershell
& {
    $ErrorActionPreference = 'Stop'
    $patchRoot = (Get-Location).Path
    if (-not (Test-Path -LiteralPath (Join-Path $patchRoot 'src\patch.mjs')) -or
        -not (Test-Path -LiteralPath (Join-Path $patchRoot 'release.manifest.json'))) {
        throw '位置不对：请先进入解压后的项目文件夹'
    }
    $codexPackage = Get-AppxPackage -Name OpenAI.Codex |
        Sort-Object Version -Descending | Select-Object -First 1
    if (-not $codexPackage) { throw '未发现官方 Microsoft Store Codex' }
    if (Get-Process -Name ChatGPT -ErrorAction SilentlyContinue) {
        throw 'Codex 尚未完全退出；先停止，不要重复打开窗口'
    }
    if (Get-NetTCPConnection -State Listen -LocalPort 9437 -ErrorAction SilentlyContinue) {
        throw '9437 已被占用；先停止，不要重复打开窗口'
    }
    $codexExe = Join-Path $codexPackage.InstallLocation 'app\ChatGPT.exe'
    Start-Process -FilePath $codexExe -WindowStyle Normal -ArgumentList @(
        '--remote-debugging-address=127.0.0.1',
        '--remote-debugging-port=9437',
        ('--user-data-dir="' + (Join-Path $patchRoot 'local-profile') + '"')
    )
}
~~~

这一步手动打开的仍是**官方 Codex**，独立资料保存在项目下的 local-profile。首次需要登录时由你自己完成。

**保持它打开，不要再点平常的 Codex 快捷方式，也不要重复执行本步骤。** 如果提示未退出或端口被占用，停在这里处理，不要反复尝试启动。

### 4. 打开普通聊天，应用自己的 PNG

在刚打开的 Codex 中打开一个普通聊天，确认聊天区和输入框可见。回到原来的 PowerShell，执行：

~~~powershell
node src/patch.mjs apply 'D:\Pictures\your-background.png' --acknowledge-local-debugging
~~~

**把 D:\Pictures\your-background.png 换成你自己的图片完整路径，保留两边的单引号。** 该参数表示你已阅读并接受上面的本机调试风险。

等待结果：

- 出现 "ok": true 且提示“临时样式已应用”，说明程序检查通过；还需你观察文字、输入框及实际显示是否正常。
- 出现 "ok": false 或报错，不算成功，按下面的常见情况处理。
- 一次命令最多 45 秒；超时结果需要你观察界面确认。

完成并回到提示符后，**可以关闭 PowerShell**；**Codex 要保持打开**。没有需要常驻运行的“补丁软件”。

背景太花、字不清楚时，可以用同一张图片重新应用并加大淡化值，例如：

~~~powershell
node src/patch.mjs apply 'D:\Pictures\your-background.png' --acknowledge-local-debugging --overlay 0.2
~~~

默认值为 0.12，可选 0–0.9。数值越大，白色遮罩越强、图片越淡；这不是显示器亮度或对比度设置。

### 5. 只撤销样式：保持 Codex 打开，执行 remove

如果 PowerShell 已关闭，重新在 Windows 打开一个，并回到同一个项目文件夹：

~~~powershell
node src/patch.mjs remove
~~~

它只移除本补丁自己的临时样式，**不会关闭 Codex，也不会关闭调试入口**。如果 Codex 已完整退出，临时样式已经消失，不必为了撤销再开一次试用窗口。

### 6. 结束使用：完整退出，再从平常的入口打开

保存输入，从 Codex 菜单完整退出。随后可在 PowerShell 中检查入口是否关闭：

~~~powershell
Get-NetTCPConnection -State Listen -LocalPort 9437 -ErrorAction SilentlyContinue
~~~

**没有输出**表示本次检查未发现该端口监听；如果命令本身报错，不能据此判定已经关闭。仍有监听时不要重复打开，先确认刚才的 Codex 已完整退出。

确认关闭后，用平常的官方 Codex 快捷方式重新打开，回到原生外观。补丁不会随电脑开机、Codex 重启或重新打开而自动运行。

## 常见情况

| 遇到的情况 | 怎么办 |
|---|---|
| 网页“一键换肤”或 Dream Skin 导入成功，但这里没变化 | 本补丁不使用那套换肤流程。退出 Dream Skin，准备本机 PNG，再按第 3、4 步操作；不用提前应用网站主题。 |
| 只有主题 ZIP、theme.css、theme.json | 本版不导入主题包。请自行从有权使用的素材中准备 PNG；本项目没有附带背景图片。 |
| 提示没有已验证的调试窗口／未找到本机入口 | 日常快捷方式打开的 Codex 不够。核对第 3 步是否成功，以及它打开的窗口是否还在；不要一边保留日常窗口一边重复准备。 |
| 提示多个窗口／未找到聊天区和输入框 | 在准备好的 Codex 中保留一个主聊天窗口，打开普通聊天。小组件窗口不能用来应用补丁。 |
| 提示版本未验证 | 停止使用这版补丁，等待适配；不要删除或绕过版本检查。 |
| 找不到 src/patch.mjs 或依赖 | 确认 PowerShell 位于包含 package.json 的项目文件夹，第 2 步成功结束；不要在 ZIP 内直接运行。 |
| PNG 读不到、太大、格式不对或无法解码 | 检查完整路径、引号、真实 PNG 格式和大小；必要时先用图片工具转换或缩小，不能只改扩展名。界面加载检查最多 3 秒，失败时还没有改变样式。 |
| 应用后切换聊天、重载或重启 | 切换聊天可能继续保留样式；整页重载、完整退出或重启会丢失临时样式。确实丢失时才手动重新应用；现有准备窗口还在时不用重做第 3 步。 |
| 应用后移动或删除原图片 | 当前已载入的样式不持续读取原文件；下一次应用仍需要有效 PNG 路径。 |
| 布局检查失败／超时／命令中途被关掉 | 布局检查失败时会撤回本次样式；重复应用失败不保证保留上一次补丁。超时或中断则不能确认结果：观察界面，能连接时执行 remove，否则完整退出准备好的 Codex。 |
| 关了命令窗口，Codex 还在；任务管理器有多个进程 | 关闭 PowerShell 不会关闭 Codex。Codex 本身使用多个进程，数量不等于多个主窗口。保存内容后正常完整退出；不要反复运行准备命令或批量强制结束进程。 |
| 我想重新使用 Dream Skin | 先结束本补丁流程并确认入口关闭，再按 Dream Skin 当时的官方说明重新启用；本版不保证修复或兼容它的主题引擎。 |

**准备窗口已成功打开后，即使应用失败或没有显示背景，调试入口也可能仍开着。** 不继续使用时，按第 6 步完整退出并检查入口。

退出或操作失败时，保留 local-profile 和原有资料，不要通过删除登录数据来“恢复”。

## 工作边界

- 补丁只接入用户手动准备的本机窗口；会短暂运行身份核对所需的只读命令，完成后退出。
- 核对官方包、进程身份、本机入口和可见容器尺寸，不读取聊天正文、Cookie、Token、账户存储或 Codex 配置。
- 不修改 app.asar、exe、dll、原生配置、代理、环境变量、注册表或快捷方式，不迁移官方 Codex。
- 只添加自己的临时样式表及标记，不更改聊天区的显示、尺寸或定位规则。页面尺寸检查不能替代实际视觉及输入测试。
- 先限时检查图片能否加载；图片无效或检查期间切换页面时拒绝修改。遇到不明确的窗口拒绝猜测；没有自动再次应用、重启、预览或开机流程。

## 开发与打包

普通使用者不需要运行本节命令。

~~~powershell
npm test
npm run check
npm run pack
~~~

打包仅复制 release.manifest.json 的 16 个文件。不会收集 local-profile、node_modules、缓存、截图、背景图、旧会话或备份。dist 中的源码 ZIP 不包含依赖，接收者按第 2 步准备。

测试使用内存页面替身及未确认操作的拒绝路径，不连接实际 Codex。真实应用、退出恢复和升级适配需要另行验收。

## 素材与许可证

代码采用 [MIT](LICENSE)。请自行提供有权使用的背景；发布项目不包含主题网站的角色图片、原主题包或个人截图。

设计方向受到 [Codex Dream Skin](https://github.com/Fei-Away/Codex-Dream-Skin) 启发；本项目独立实现，不捆绑其引擎或社区主题。依赖 Undici 为 MIT，见 [第三方说明](THIRD-PARTY-NOTICES.md)。
