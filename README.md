# Hayduk：开源 Metasploit 图形界面，Armitage 的替代方案

[![CI](https://github.com/jolovicdev/hayduk/actions/workflows/ci.yml/badge.svg)](https://github.com/jolovicdev/hayduk/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/jolovicdev/hayduk?display_name=tag)](https://github.com/jolovicdev/hayduk/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-informational)](LICENSE)

> **关于本仓库**
>
> 本仓库是 [jolovicdev/hayduk](https://github.com/jolovicdev/hayduk) 的 **简体中文汉化版**，
> 汉化直接维护在 `main` 分支。界面文案、本 README 与安全策略均已汉化。
>
> - 英文原版文档：[README.en.md](README.en.md) · [SECURITY.en.md](SECURITY.en.md)
> - 上游原版预编译包：[原作者 Releases](https://github.com/jolovicdev/hayduk/releases)
> - 汉化版获取方式见下方[「获取汉化版」](#获取汉化版)
>
> 汉化只改动界面文案与文档，**不触碰任何攻击逻辑、协议或与 Metasploit 的交互**。

Hayduk 是一款免费、开源的 **Metasploit 图形界面**，面向获得授权的渗透测试。它把 Armitage 的工作流搬进浏览器：绘制主机图谱、浏览模块、管理 Meterpreter 与 shell 会话、导出行动报告。

**下载一个二进制文件，运行它，连上 Metasploit。** 运行发布版二进制不需要安装 Java、Go 或 Node.js，浏览器界面已内置。

Hayduk 通过 `msfrpcd` 连接一个独立的 Metasploit Framework 实例，本身不随附 Metasploit。

**[下载最新版本](https://github.com/jolovicdev/hayduk/releases/latest)** · [快速上手](#快速上手) · [试用 Docker 靶场](#试用-docker-靶场) · [团队模式](#团队模式)

![Hayduk 行动概览：网络拓扑、主机检查器、模块库与实时控制台](docs/screenshot.png)

*界面截图中的行动数据为示意数据。*

## 快速上手

你需要：一个 Hayduk 发布版二进制、一个浏览器、一个正在运行的 Metasploit Framework 实例。若要使用主机、服务、凭据、战利品这类工作区功能，Metasploit 还需连上数据库。

以下步骤假定 Hayduk 与 Metasploit 跑在同一台机器上。如果你想要一套现成的、带数据库和可丢弃靶机的 Metasploit 环境，请用 [Docker 靶场](#试用-docker-靶场)。

### 1. 下载并解压 Hayduk

打开[最新版本](https://github.com/jolovicdev/hayduk/releases/latest)，选择与你的操作系统和处理器架构匹配的压缩包，解压到一个文件夹。Hayduk 没有安装程序，也不需要单独安装界面。

汉化版请见[「获取汉化版」](#获取汉化版)。

### 2. 启动 Metasploit RPC

在运行 Metasploit 的机器上打开终端，执行：

```bash
msfrpcd -P 'yourpassword' -S -f -a 127.0.0.1 -p 55553
```

把 `yourpassword` 换成你自己的密码。保持这个终端开着。该命令把 RPC 绑定在本机 `55553` 端口；`-S` 表示这条本地连接禁用 SSL。

如果你已经在跑 `msfrpcd`，直接沿用它的连接参数即可，不必再起一个实例。

### 3. 运行 Hayduk

在解压出的文件夹里另开一个终端。

**Linux 与 macOS：**

```bash
./hayduk
```

**Windows PowerShell：**

```powershell
.\hayduk.exe
```

Hayduk 会在浏览器里打开界面。如果浏览器没有自动打开，请把终端里打印的完整 URL 复制出来，**务必带上 `?token=...` 部分**。端口是自动分配的。

### 4. 连接

在 **连接 msfrpcd** 对话框中，填入第 2 步的设置：

| 字段 | 值 |
|---|---|
| 主机 | `127.0.0.1` |
| 端口 | `55553` |
| 用户名 | `msf` |
| 密码 | 你在上面设置的密码 |
| 使用 SSL | 不勾选 |

点击 **连接**。冷启动的 Metasploit 实例可能需要大约半分钟才响应，连接进度会显示在对话框里。

使用界面期间请保持 Hayduk 运行。要停止它，在它的终端里按 `Ctrl+C`。

## 你的第一次行动

请只对你有权测试的系统或网络使用本工具。扫描是从所连接的 Metasploit 实例发起的，因此目标必须能被那台机器访问到。

点击模块即可配置它。右键点击主机、会话、表格行和模块树中的模块，可以打开对应的操作菜单。

用行动摘要卡片可以展开主机、服务、会话或凭据。**发现主机**、**扫描服务**、**导出报告**也直接放在网络地图上方。

网络地图会根据画布可用空间自适应主机列的排布。点击**专注**可以放大地图与主机检查器。**排列主机**会用自动布局替换已保存的位置。主机卡片上显示开放服务数量与访问状态；紫色路径标识跳板路由。

1. **选择工作区。** 点击**工作区**标签可在已有的 Metasploit 工作区之间切换，或沿用当前工作区。当前工作区限定了数据库表、拓扑图与导出报告的范围，从而让每个客户的行动数据互相隔离。事件与会话会保留其来源工作区，便于报告归因；**会话**标签页则跨工作区显示所有会话。
2. **发现主机。** 打开 **行动 → 发现主机…**，填入目标主机或 CIDR 范围，选择一个扫描器，点击**配置…**。检查模块选项后点击**启动**。
3. **扫描并检查服务。** 打开 **行动 → 扫描服务…**，针对目标配置一次扫描。启动前先确认选项。打开 **视图 → 拓扑** 查看已发现的主机，或 **视图 → 服务** 检查服务扫描结果。
4. **启动漏洞利用并打开会话。** 在模块树里右键点击某个漏洞利用模块，选择**启动…**；或者打开 **行动 → 查找攻击…**，点击某个匹配项的**启动**按钮，会自动填好目标主机与匹配到的端口。确认模块选项与载荷后点击**启动**。如果有会话上线，在**会话**标签页点击它的行，或右键点击对应主机并选择**与会话 &lt;ID&gt; 交互**，即可在**交互**页打开实时控制台。
5. **导出报告。** 选择 **文件 → 导出报告…**，即可下载一份自包含的 HTML 行动报告。

![Hayduk 演示：在拓扑图上选一台主机，并在它的实时 shell 会话中执行命令](docs/demo.gif)

*演示中的行动数据为示意数据。*

## 功能

| 能力 | 你可以做什么 |
|---|---|
| 网络拓扑 | 探索自适应网段分组、主机服务数量与跳板路由。拖动主机、缩放，或在专注模式下展开地图。 |
| Metasploit 模块 | 浏览模块树、查看可靠性等级、配置选项并选择载荷。 |
| 行动工作流 | 发现主机、扫描服务，并找出与已知服务匹配的漏洞利用候选。 |
| 会话管理 | 与 Meterpreter 和 shell 会话交互、升级 shell、终止会话。 |
| 凭据与战利品 | 查看工作区数据，并在登录流程中使用已恢复的凭据。 |
| 万福玛丽 | 对选中的主机批量发动匹配的漏洞利用模块，带有节奏控制与事件日志。 |
| 报告 | 导出自包含的 HTML 报告，便于复盘与交付客户。 |
| 团队模式 | 在可信网络中与多名操作员共享同一次行动。 |

![Hayduk 图谱专注模式：自适应网段布局、主机状态与已路由网络](docs/topology.png)

*图谱专注模式，行动数据为示意数据。*

## 试用 Docker 靶场

仓库内自带一套可丢弃的 Metasploit 靶场，包含数据库和可选的靶机容器。跑起来之后，就能用演示里的那套流程去打真实目标。

你需要 Git、Docker 和 Docker Compose。请在支持仓库 `.sh` 脚本的 shell 中执行：

```bash
git clone https://github.com/jolovicdev/hayduk.git
cd hayduk
scripts/msf/up.sh --with-vulnbox
```

靶场就绪时，脚本会打印出靶机容器的 IP 地址。启动你下载好的 Hayduk 二进制，用**主机** `127.0.0.1`、**端口** `55553`、**用户名** `msf`、**密码** `testpass123` 连接，**使用 SSL** 不勾选。第一次扫描就用打印出来的靶机 IP。

只想启动 Metasploit 及其数据库，就运行不带 `--with-vulnbox` 的 `scripts/msf/up.sh`。

用完后，在仓库根目录执行下面这条命令。它会删除靶场容器及其数据卷，**包括靶场数据库里的数据**：

```bash
scripts/msf/down.sh
```

## 团队模式

用操作员能访问到的具体网卡地址运行下载好的二进制：

```bash
./hayduk --team --listen 192.168.1.10:8787
```

把 `192.168.1.10` 换成你本机的地址。团队模式要求显式指定一个非回环地址；`0.0.0.0` 这类通配地址会被拒绝。

把终端里打印的带令牌完整 URL 分享出去。每位操作员在浏览器打开它并取一个名字，事件日志会把这些名字标注到对应的操作上。

团队模式共用一个令牌，且是明文 HTTP。操作员名字只是标签，不是经过验证的身份。请把令牌 URL 当作密码对待，并且只在可信网络中使用团队模式。完整的信任模型见[安全策略](SECURITY.md)。

## 故障排查

| 问题 | 检查什么 |
|---|---|
| 浏览器没有打开 | 打开 Hayduk 打印的带令牌完整 URL。也可以用 `./hayduk --no-browser` 启动。 |
| Hayduk 连不上 | 确认 `msfrpcd` 正在运行，且主机、端口、用户名、密码都匹配。 |
| SSL 连接失败 | `msfrpcd` 以 `-S` 运行时要**不勾选**「使用 SSL」；守护进程用了 SSL 时才勾选。 |
| 连接耗时长 | 留意连接对话框。冷启动的 Metasploit 实例可能需要大约半分钟才响应。 |
| 主机或服务缺失 | 检查所选工作区、Metasploit 的数据库连接，以及目标能否从 Metasploit 一侧访问。 |

## 常见问题

### Hayduk 是 Armitage 的替代品吗？

是。Hayduk 沿用了 Armitage 的图形化 Metasploit 工作流，包括网络拓扑、模块启动、万福玛丽和共享行动。它是一个独立实现，采用浏览器界面，并且是单个 Go 二进制。

### Hayduk 包含 Metasploit Framework 吗？

不包含。Hayduk 是面向 Metasploit `msfrpcd` 服务的图形客户端。请使用你已有的 Metasploit 安装，或使用仓库自带的 Docker 靶场。

### 我需要 Go、Node.js、Java 或 Docker 吗？

运行 Hayduk 发布版二进制不需要任何额外的语言运行时。从源码构建需要 Go 与 Node.js。只有在你选择使用自带靶场时才需要 Docker。

### Hayduk 能连接另一台机器上的 Metasploit 吗？

可以。在**主机**里填入那台 Metasploit 机器可达的地址，并匹配它的 RPC 端口、凭据与 SSL 设置。快速上手里那条仅绑定 localhost 的 RPC 命令只接受来自同一台机器的连接。

### Hayduk 是免费开源的吗？

是。Hayduk 以 [MIT 许可证](LICENSE)发布。

## 从源码构建

开发请使用 Go 1.26.1 或更新版本、CI 所用的 Node.js 24、npm 与 Make。在仓库根目录执行：

```bash
make
./bin/hayduk
```

`make` 会安装前端依赖、构建并嵌入界面，然后编译出 `bin/hayduk`。

### 开发

首次构建完成后，在一个终端里运行前端开发服务器：

```bash
cd ui
npm run dev
```

在第二个终端里，于仓库根目录执行：

```bash
make dev
```

打开 Hayduk 打印的 URL。界面改动会通过开发代理热重载。

### 检查

在仓库根目录执行：

```bash
make test          # Go 与前端测试
npm --prefix ui run lint
make               # 类型检查、构建前端、编译二进制
make integration   # 需要 Docker 靶场正在运行
```

协议类型是生成出来的。在具备 `tygo` 的前提下，修改 `internal/protocol/protocol.go` 后运行 `make gen`；`make gen-check` 用于检测生成类型是否漂移。

## 获取汉化版

汉化只改了文案，所以**构建方式与原版完全一致**：

```bash
git clone https://github.com/AnonUsAl/hayduk.git
cd hayduk && make
./bin/hayduk
```

需要 Go 1.26.1+、Node.js、npm 与 Make（见[从源码构建](#从源码构建)）。

汉化版未发布预编译压缩包；想要官方英文预编译包请到[原作者 Releases](https://github.com/jolovicdev/hayduk/releases)。

### 汉化说明

- 汉化直接维护在 `main` 分支，覆盖前端全部界面文案、`index.html` 元信息，以及 Go 侧 CLI 的 flag 说明与错误信息。
- **有意保留英文**的部分：发往 `msfrpcd` 的控制台命令（`use X`、`set RHOSTS`）、终端提示符（`meterpreter 3 > `）、技术标识（`RHOSTS`、`LHOST`、`meterpreter`）与协议/服务名。
- 与上游同步：本仓库 `main` 含汉化提交，因此上游更新后需要合并而不是快进：

  ```bash
  git fetch upstream && git merge upstream/main
  ```

  合并冲突通常集中在 `internal/server/dist/`（构建产物）；重跑 `cd ui && npm run build && cp -r dist ../internal/server/dist` 即可覆盖。

## 致谢与许可

Hayduk 借鉴了 [Armitage](https://github.com/rsmudge/armitage) 所确立的图形化攻击管理工作流，Armitage 由 Raphael Mudge 创建。Hayduk 通过 [go-msf](https://github.com/jolovicdev/go-msf) 连接 Metasploit。

本项目以 [MIT 许可证](LICENSE)发布。随附资源及其许可证见[第三方声明](docs/THIRD-PARTY-NOTICES.md)。
