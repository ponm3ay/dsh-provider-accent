# dsh-provider-accent

> 切换模型时，把「**供应商**」高亮成对比度紫色 —— 模型菜单与 `/model` 弹窗里的供应商分组标题
> 不再是一行灰扑扑的小字，一眼看清自己在挑哪家。

## 它改了什么

DSH 官方模型选择器（`@deepseek-ai/dsh-client-ui-model-selection`）把模型按供应商分组，
每个供应商是一行 **sticky 分组标题**（`MenuGroup`），颜色取自 `--dsw-alias-label-tertiary`
（三级标签色，很淡）。本插件只重绘这一行：

| 项目 | 官方 | 本插件 |
|---|---|---|
| 颜色（暗色主题） | `--dsw-alias-label-tertiary` | `#a78bfa`（violet-400） |
| 颜色（亮色主题） | 同上 | `#7c3aed`（violet-600） |
| 字重 | 500 | 600 |

字号、内距、背景（含吸顶时那层 94% 填充）、其它任何 DOM 与官方 class **都不碰**。

覆盖两个面：

1. **输入框的模型菜单**（点输入框右下角模型名展开的那个）；
2. **`/model` 命令弹窗**（`/<command> options` 那个 listbox）。

**不碰**：命令面板（`/`）自己的分组标题 —— 它们的行不是 `menuitemradio`、listbox 也不叫 `/model`，
保持官方三级灰。

## 怎么定位的（锚点来自 app.asar 里读的官方源码，不猜）

```text
composer 模型菜单（ModelSelect，portal 到 body 的 MenuSurface）
  <div role="menu" aria-label="模型">
    <section role="group" data-menu-group>            ← MenuGroup
      <span data-menu-group-start>
      <div data-menu-group-heading>  zai </div>        ← 供应商标题（目标）
      <button role="menuitemradio" …> MiMo-V2.6-Flash </button>   ← 模型行
    </section>

/model 命令弹窗（ui-commands 的 PopupSelectView）
  <div role="listbox" aria-label="/model 选项">       ← 前缀 /model，与语言无关
    <section role="group" data-menu-group>
      <div data-menu-group-heading> … </div>           ← 供应商标题（目标）
      <div role="option" …> … </div>
```

于是两条选择器（对哈希化的 CSS module 类名零依赖）：

```css
section[data-menu-group]:has(> [role="menuitemradio"]) > [data-menu-group-heading]
[role="listbox"][aria-label^="/model"] section[data-menu-group] > [data-menu-group-heading]
```

特异性 (0,3,1) 高于官方的 `.heading` (0,1,0)，不需 `!important`。

**为什么不用 `--dsw-alias-label-tertiary` 做令牌覆盖**：那个令牌全 App 都在用，改它会把别处一起染紫。
供应商标题没有专属令牌，所以按「组件级 CSS」处理。

## 安装 / 卸载

```powershell
# 1) 取得源码（任选一个位置；直接放 $DSH_HOME\plugins\ 也行）
gh repo clone ponm3ay/dsh-provider-accent "$env:DSH_HOME\plugins\dsh-provider-accent"

# 2) 挂进 profile：package.json 的 dependencies 加
#      "dsh-provider-accent": "link:<上面的绝对路径>"
#    并在 dsh.profile.bundles 数组里加 "dsh-provider-accent"
# 3) cd $env:DSH_HOME\profiles\<profile> ; pnpm install
# 4) 刷新 DSH 页面即生效（bundle 型免重启）
```

也可以用 DSH 的插件管理面板装（`plugin_manager` 工具 /
GUI「设置 → 插件」）：`install_bundle` + `link:` 路径同样走 bundles 挂载。

手工路线（二选一，**不要都挂**，重复 id 会被 client-modules 表拒）：

- **bundle**：`dsh.profile.bundles` 加 `dsh-provider-accent`；
- **patch 行**：`cordis.patch.yml` 末尾加
  `- insert: [{ id: provider-accent, name: dsh-provider-accent }]`。

## 生效与自检

- **宿主半边**：加完即进 cordis 树（HMR 重组，无需重启）。查：
  `cordis_inspect_query(host/Config, listConfigs, {name:"dsh-provider-accent"})` → 应出现 `patchId: provider-accent`。
- **客户端半边**：产物编进 `window.__DSH_BOOT__`，**刷新一次页面**（Ctrl+R）后生效。
- **肉眼**：点开模型菜单 → 供应商标题（如 `zai` / `docode` / `gpt`）应为紫色加粗。
- **devtools**：`__dshProviderAccent.apply()` 可手动补插样式表；
  `__dshProviderAccent.colors` 是当前两个紫色，`__dshProviderAccent.selectors` 是两条锚点。

## 自定义每个 provider 的颜色

插件默认使用上表中的两套紫色。打开 DSH 开发者控制台后，可以按 provider 标题配置亮色和暗色：

```js
__dshProviderAccent.setProviderColor("deepseek", {
  light: "#b42318",
  dark: "#ff8a80",
})

// 一次替换整张 provider 配色表；键名不区分大小写
__dshProviderAccent.setColors({
  deepseek: { light: "#b42318", dark: "#ff8a80" },
  zai: { light: "#0369a1", dark: "#7dd3fc" },
  xiaomi: { light: "#c2410c", dark: "#fdba74" },
})

__dshProviderAccent.getColors() // 查看当前配置
__dshProviderAccent.resetColors() // 清空自定义色，恢复默认紫色
```

颜色接受 `#rgb` / `#rrggbb` / `rgb(...)` / `rgba(...)`。只给一套时，另一套会回退到默认紫色。配置只保存在浏览器 `localStorage` 的 `dsh-provider-accent.colors`，不写 DSH 设置，不进模型上下文。

标题文本就是匹配键；例如标题显示为 `DeepSeek` 时可用 `deepseek`。也可以用显示名别名作为键。菜单是动态挂载的，配置后重新打开菜单即可看到颜色。

开发者控制台也保留 `__dshProviderAccent.apply()`、`refresh()`、`colors` 和 `selectors` 供排查。

## 从源码改默认配色

如果要改所有未配置 provider 的默认色，修改 `src/client.js` 顶部的 `LIGHT_COLOR` / `DARK_COLOR` / `HEADING_WEIGHT`，然后：

```powershell
node build-client.mjs     # 重新生成 lib/client.js（产物 = 源码套 loader 壳）
```

改完刷新页面即可（客户端产物按 URL 记，必要时重启 DSH）。

## 结构

| 文件 | 角色 |
|---|---|
| `lib/index.js` | 宿主半边：零逻辑，只做「让这个包成为 cordis 一行」+ 静态核对客户端产物 |
| `src/client.js` | 客户端源码：组件级 `<style>`、逐 provider 配色 API、明暗两套紫 |
| `lib/client.js` | 构建产物（`build-client.mjs` 生成，勿手改） |
| `cordis.patch.yml` | bundle 层：`insert` 一行 `id: provider-accent` |
| `verify/client-test.mjs` | 离线黑盒自测（stub `window.__ModuleLoader__` + `document`，21 项） |
| `AGENTS.md` | 维护说明：锚点契约、踩过的坑、验收手法 |

## 纪律

不写设置、不进模型上下文、不监听会话事件、不碰官方 DOM 与 class；任何一步找不到锚点，
菜单就保持官方配色 —— 本插件结构上不会让菜单点不开或报错。

## 许可

[MIT](LICENSE) © 2026 ponm3ay
