# 开发日志

## 2026-06-13 - 前端性能优化：并行轮询/下拉刷新/加载状态/死代码清理

### 背景
首页轮询串行（7s×N 设备）、无下拉刷新、无加载状态；audio 页每次 setData 整个数组、长按传完整对象；audio.wxml 通过 `data-item="{{item}}"` 暴露整个对象到模板；devicebinding.js 有未调用的死代码；多处 page.json 引用不再使用的 `custom-button` 组件；`wx-audio-manager` 依赖已无代码引用；setting 页 7 次独立的 `wx.getStorageSync` 调用；大量调试 console.log 含 token 信息。

### 改动

| 文件 | 改动 |
|------|------|
| `pages/home/home.js` | `loadAllDevices` 改为 `Promise.allSettled` 并行请求；轮询间隔 7s→15s；添加 `onPullDownRefresh`；添加 `pageLoading` 初始加载状态 |
| `pages/home/home.json` | 添加 `enablePullDownRefresh: true` |
| `pages/home/home.wxml` | 加载状态 spinner UI（`<block wx:else>` 包裹） |
| `pages/home/home.wxss` | loading-spinner 动画 + 关键帧 |
| `pages/audio/audio.js` | `getAllDeviceRecord` 对 `audioList` 做 JSON.stringify 脏比较，无变化不 setData；移除 debug console.log |
| `pages/audio/audio.wxml` | `data-item="{{item}}"` → `data-id="{{item.id}}"` |
| `pages/device-detail/device-detail.js` | 添加 `isLoading` 状态 + 加载时 spinner；移除 debug console.log |
| `pages/device-detail/device-detail.wxml` | 加载状态 spinner；`<block wx:else>` 包裹内容区 |
| `pages/device-detail/device-detail.wxss` | loading-spinner CSS |
| `pages/devicebinding/devicebinding.js` | 移除 `generateTempDevice()` 死代码 + `deviceTemplates` 常量 |
| `pages/setting/setting.js` | `loadLocalSetting` 7 次独立 `wx.getStorageSync` → 单 key `localSettings` 对象存储；`saveSetting` 6 次独立 `wx.setStorageSync` → 单次 `setStorage`；向后兼容旧独立 key |
| `pages/login/login.js` | 移除调试 console.log |
| `app.js` | 移除 `App onShow/onHide` 和 `deviceTokens已存储` console.log |
| `pages/audio/audio.json` | 移除废弃的 `custom-button` 组件引用 |
| `pages/home/home.json` | 同上 |
| `pages/device-detail/device-detail.json` | 同上 |
| `pages/login/login.json` | 同上 |
| `package.json` | 移除未使用的 `wx-audio-manager` 依赖 |
| `miniprogram_npm/wx-audio-manager/` | 删除文件夹 |
| `utils/deviceService.js` | 移除调试 console.log |
| `utils/http.js` | 移除请求日志 console.log（含 token 打印） |
| `utils/mockServer.js` | 移除 Mock Debug console.log |

### 关键决策

- **`Promise.allSettled` 而非 `Promise.all`**：单个设备状态请求失败不阻塞其他设备
- **轮询 15s**：平衡实时性与请求频率
- **脏检查 JSON.stringify**：`JSON.stringify` 比较新旧数组，避免无变化时 setData 触发重渲染
- **`data-id` 替代 `data-item`**：长按处理器通过 `data-id` 索引 `this.data.audioList` 查对象，避免 WXML 序列化完整对象
- **`localSettings` 合并存储**：提供向后兼容，检测旧独立 key 存在时自动迁移

### 边界情况

- 首页 polling 使用 `setInterval` 定时器，`onHide`/`onUnload` 清除并置 `null`
- 首页 `pageLoading` 初始为 `true`，`loadAllDevices` 首次完成后设为 `false`
- 音频脏检查：`JSON.stringify` 比较只在 `getAllDeviceRecord` 成功返回后执行，网络失败时不污染 `audioList`
- 设置合并存储：新用户直接读写 `localSettings`，老用户首次访问走迁移路径后回写

#### 后续追加（2026-06-13 下午）

| 文件 | 改动 |
|------|------|
| `pages/home/home.js` | 删 `onLoad` 中冗余的 `loadUserInfo()` 调用（`onShow` 已覆盖） |
| `pages/home/home.json` | 移除未使用的 `common-card` 声明 |
| `app.json` | 添加 `lazyCodeLoading: requiredComponents`（组件按需注入，提升启动速度） |
| `pages/audio/audio.json` | 移除未使用的 `white-card` 声明 |
| `components/common-card/` | 删除整文件夹（全局无引用，死代码） |

## 2026-05-21 - 登录流程重做：3步→2步 + 首页手机号拦截

### 背景
登录流程冗长（微信登录→填手机号→授权头像昵称），且 `wx.getUserProfile()` 已于 2023 年被微信废弃。用户期望简化登录，同时防止不填手机号就进入首页。

### 方案演进

| 版本 | 方案 | 结果 |
|------|------|------|
| v1 | 静默登录，用户无感 | ❌ 一进 app 就自动登录，没有交互 |
| v2 | `getPhoneNumber` 一键授权（同意后自动拿手机号） | ❌ 无接口权限，无法解密 phoneCode |
| v3（最终） | `wx.login` → 手动填手机号 → 保存后跳首页 | ✅ |
| 头像昵称 | 移到设置页，用 `chooseAvatar` + `input type="nickname"` | ✅ |

### 改动

| 文件 | 改动 |
|------|------|
| `app.js` | 移除 `silentLogin()` 方法 |
| `pages/login/login.js` | 从 244 行→79 行，3 步简化为 2 步（微信登录→手动填手机号），移除废弃的 `getUserProfile()`；`confirmPhone` 加 8s 超时保护 |
| `pages/login/login.wxml` | 精简为两步骤：微信登录按钮 + 手机号输入表单 |
| `pages/login/login.wxss` | 从 215 行→55 行 |
| `pages/setting/setting.js` | 新增个人资料模块：`chooseAvatar` 选头像、`nickname input` 填昵称、手动绑手机号 |
| `pages/setting/setting.wxml` | 顶部新增"个人资料"卡片（头像+昵称+手机号绑定） |
| `pages/setting/setting.wxss` | 新增资料卡样式 |
| `pages/home/home.js` | 已登录无手机号时弹 blocking modal 强制跳转设置页；右上"已登录 ›"可点击进设置页；`loadUserInfo` 服务端空字段用本地缓存兜底；`onShow` 同步本地缓存 `userInfo` 到 `setData` |
| `pages/home/home.wxml` | 登录后右上角显示"已登录 ›"（可点击进设置页） |
| `pages/home/home.wxss` | 新增 phone-banner 横幅样式（保留作为视觉兜底） |
| `utils/mockServer.js` | `mockUserInfo.phone` 改为空字符串，/user/getMainMessage 不返回假手机号 |
| `server/app.js` | `/user/getMainMessage` 不再硬编码 fallback 数据；尝试加过 `/system/phoneLogin` 又移除 |

### 修复的连带 Bug

| # | 问题 | 根因 | 修复 |
|---|------|------|------|
| 1 | 保存手机号后不跳首页 | `app.json` 无 `tabBar`，`wx.switchTab` 静默失败 | 全部改为 `wx.reLaunch` |
| 2 | 头像偶尔丢失 | `loadUserInfo` 用服务端空值 `avatarUrl: ''` 覆盖了本地缓存 | 服务端字段为空时用本地缓存兜底 `res.data.nickName \|\| cached.nickName` |
| 3 | 头像渲染空白 | `onShow` 读了本地缓存没传给 `setData`，首页用初始空对象渲染 | `setData` 中加 `userInfo` |
| 4 | "保存中"一直转 | 请求挂起 `loading` 不释放 | 加 8s `setTimeout` 超时自动解锁 |

### 用户流程

```
打开首页 → 未登录 → 点"登录" → login 页
                              → 点"微信登录" → wx.login → POST /system/log → token
                              → 步骤 2：输入手机号 → 保存 → POST /user/userBindPhone
                              → reLaunch 首页 → onShow 检查有手机号 → 正常使用
                                                    ↕ 无手机号 → blocking modal → 去设置页绑定
```

### 边界情况

- **已登录有手机号用户**：打开直接进首页，不受影响
- **故意跳过手机号**：首页 `onShow` 弹出 blocking modal，只能点"去绑定"
- **请求超时**：8 秒后自动解锁按钮 + Toast 提示
- **头像/昵称**：从 `loadUserInfo` 请求失败不覆盖本地缓存，设置页修改后 `POST /user/getMessage` 持久化到服务端

### 影响范围
纯前端改动 + Mock 服务端微调。后端 API 接口未变（`/system/log` + `/user/userBindPhone` + `/user/getMessage` + `/user/getMainMessage`）。

---

## 2026-05-21 - 重做一键登录：静默登录改为微信授权弹窗

### 背景
上午改的静默登录让用户一打开小程序就自动登录了，没有授权交互。用户期望的是点击"微信一键登录"按钮→微信底部弹出授权窗口→同意后拿到手机号完成登录。

### 改动方向
去掉 `app.js` 的自动静默登录，改为 `login` 页的 `<button open-type="getPhoneNumber">` 主动授权流程。Mock 新增 `POST /system/phoneLogin` 接口，接收 `{ code, phoneCode }`，返回 `{ token, phone }`。

### 改动

| 文件 | 改动 |
|------|------|
| `app.js` | 移除 `silentLogin()` 方法、`import http`、`onLaunch` 中无需 token 时的静默登录调用 |
| `pages/login/login.js` | 从静默登录中转页改为 `handlePhoneLogin`：提前调 `wx.login()` 准备 session → 用户点按钮 → `POST /system/phoneLogin` → 存 token/phone → 跳首页 |
| `pages/login/login.wxml` | 改为"微信一键登录"按钮（`open-type="getPhoneNumber"`）+ 用户协议尾注 |
| `pages/login/login.wxss` | 一键登录按钮样式（大白圆角按钮+阴影） |
| `pages/home/home.js` | 恢复 `goLogin` 指向 login 页（之前改为 setting 页）；移除 1.5s 延迟重试（不再需要） |
| `server/app.js` | 新增 `POST /system/phoneLogin` 接口；修复 `/user/getMainMessage` 不再硬编码 fallback 数据 |

### 完整一键登录流程

```
用户打开小程序 → login 页
                 → 点"微信一键登录"按钮
                 → 微信底部弹出授权窗口（显示手机号）
                 → 用户点"同意"
                 → POST /system/phoneLogin { code, phoneCode }
                 → 返回 { token, phone: "138xxxx" }
                 → 跳转首页，已登录
```

### 影响范围
- **Mock 服务端**：新增接口，需重启生效
- **正式后端**：需要实现等价的 `POST /system/phoneLogin` 接口，服务端调微信 `phonenumber.getPhoneNumber` 解密 `phoneCode`

---

### 背景
登录页 3 步流程冗长（微信登录 → 填手机号 → 授权头像昵称），且 `wx.getUserProfile()` 已于 2023 年被微信废弃，返回的昵称头像全部是伪造的默认值。

### 改动

| 文件 | 改动 |
|------|------|
| `app.js` | 新增 `silentLogin()`，`onLaunch` 无存储 token 时自动 `wx.login` → `POST /system/log`，用户无感 |
| `pages/login/login.js` | 从 244 行→75 行，删除 3 步流程、废除的 `getUserProfile`、手机号弹窗。降级为自动登录中转页 |
| `pages/login/login.wxml` | 从 3 步按钮+弹窗→logo+加载动画+失败重试 |
| `pages/login/login.wxss` | 从 215 行→55 行，删除步骤指示条和弹窗样式 |
| `pages/setting/setting.js` | 新增用户资料模块：`chooseAvatar` 选头像、`nickname input` 填昵称、手动绑手机号、自动调 `POST /user/getMessage` 保存 |
| `pages/setting/setting.wxml` | 顶部新增"个人资料"卡片，含头像点击选择、昵称编辑、手机号绑定入口+弹窗 |
| `pages/setting/setting.wxss` | 新增资料卡样式 |
| `pages/home/home.js` | 新增 1.5s 延迟重试（对付异步静默登录时序）；"登录"按钮改指向设置页 |

### 用户流程变化

```
之前: 打开→首页(未登录)→登录页(点3次)→首页
现在: 打开→静默登录→首页(已登录)
                         ↕ 失败才显示登录页
      个人资料→设置页修改头像/昵称/绑定手机号
```

### 边界情况

- **已登录用户**（storage 有 token）：一切照旧，不受影响
- **静默登录失败**（网络/后端异常）：login 页显示错误文案 + 重试按钮
- **首页时序竞争**：`onShow` 执行时静默登录可能还没完成，加 1.5s 延迟重试兜底
- **设备绑定**：仍需要 `loginToken`（初始 token），保留 `setStorage('loginToken')` 调用

### 影响范围
纯前端改动。后端 API 零改动，无新增接口。

---

## 2026-05-20 - Token 覆写 Bug 修复

### 问题
登录后点进设备详情页再绑定新设备，Mock 返回"请先绑定手机号"。根因是 `switchDevice()` 把 storage 里的登录 token 覆写成了设备 token，`bindDevice()` 拿到的 token 后端查不到用户。

### 改动

| 文件 | 改动 |
|------|------|
| `pages/login/login.js:83-84` | `doBaseLogin` 成功后额外保存 `loginToken` 到 storage（不受 switchDevice 影响） |
| `app.js:11` | `globalData` 新增 `loginToken` 字段 |
| `app.js:59,66` | `onLaunch` 从 storage 恢复 `loginToken` |
| `pages/devicebinding/devicebinding.js:185` | `getStorage('token')` → `getStorage('loginToken') \|\| getStorage('token')` |

### 影响范围
纯前端改动，后端无感知。不影响其他流程（其他接口要么用自定义 Authorization 头带设备 token，要么原本就该用登录 token）。

---

## 2026-05-20 - Mock 联系人 Fallback Bug 修复

### 问题
非第一个设备的联系人删除后提示成功，但重新进入页面后联系人又出现。根因是 Mock 的 `GET /user/userGetPhone` 在设备无联系人时 fallback 返回了第一个设备的联系人数据，导致删除操作实际上删的是空数组，而重新加载时又从 fallback 拿到了未删除的数据。

### 改动

| 文件 | 改动 |
|------|------|
| `server/app.js:284` | 去掉 `DB.contacts.values().next().value` fallback，设备无联系人时直接返回 `[]` |

---

## 2026-05-20 - 联系人姓名不持久化修复

### 问题
添加联系人时填了姓名，首次新增能正常显示，但重新进入页面后姓名消失只剩电话。

### 根因
两处都有问题：
1. **Mock `addPhoneNumber`**（`server/app.js:292`）：只读了 `number` 参数，没有读 `name`，存的数据只有 `{电话: "xxx"}`
2. **前端 `loadDeviceContacts`**（`utils/deviceService.js:85`）：`name` 硬编码为 `''`，不从返回数据中读取

### 改动

| 文件 | 改动 |
|------|------|
| `server/app.js:292,296` | 读取 `name` 参数，存入 `{电话: number, 名称: name}` |
| `utils/deviceService.js:82,85` | 从返回数据中读取 `item['名称'] \|\| item.name`，而不是硬编码空字符串 |

### 暂缓之计 — 本地姓名缓存
真实后端不返 `名称`，前端加了一层本地缓存：添加联系人时把 phone→name 映射存入 `contactNameCache`，加载时后端没返就从缓存补。

| 文件 | 改动 |
|------|------|
| `utils/deviceService.js:3,87-92` | 导入 `getStorage`，加载联系人时查 `contactNameCache` 补姓名 |
| `pages/device-detail/device-detail.js:2,147-149` | 导入 `setStorage`，添加联系人时更新 `contactNameCache` |

### 待办
- [ ] 确认真实后端是否返回联系人姓名字段，如不返需后端加 `名称` 字段

---

## 2026-04-26 - 本次会话（完整记录）

### 会话周期（按时间线）

| # | 时间段 | 焦点 |
|---|--------|------|
| 1 | 02:38-03:05 | 登录流程整改 + 扫码绑定流程设计 |
| 2 | 05:47-06:20 | 扫码自动绑定完善 + redirect 跳转逻辑 |
| 3 | 08:11-08:13 | 绑定设备请求传参方式修复 |
| 4 | 09:27-09:30 | 联系人数据格式对齐 + mock 后端改造 |
| 5 | 10:07-10:28 | Mock 图片静态服务 |
| 6 | 11:01 | 设置页位置选择 bug |

---

### 改动记录

#### 1. 登录流程 — 移除强制设备绑定检查（会话#1）
- **文件**: `pages/login/login.js`
- **问题**: 第34-47行在用户授权后检查 `/user/bind/status`，未绑定设备则强制停留在 step 3 引导绑定页
- **分析**: 绑定报警设备不是登录的必要条件，用户应可以直接进入首页
- **修复**: 用户完成信息授权后直接进入首页，绑定改为可选（通过首页或个人中心引导）

#### 2. 扫码自动绑定流程（会话#1-#2）
- **涉及文件**: `app.js`、`pages/devicebinding/devicebinding.js`、`pages/login/login.js`
- **完整链路**:
  ```
  扫码 → devicebinding.js onLoad → 未登录 → 跳转 login?redirect=...
       → 登录完成 → 跳回 devicebinding?sn=xxx → autoBindDevice(sn) → 首页
  ```
- **app.js**: `onLaunch` 新增全局 `options.scene` 参数处理，存入 `globalData.pendingSN`
- **devicebinding.js**: 跳转登录时携带 sn 参数，回到绑定页后自动触发绑定
- **login.js**: redirect 跳转仅在**整个登录流程彻底完成后**（confirmPhone 后）执行

#### 3. 修复绑定设备传参方式（会话#3）
- **文件**: `pages/devicebinding/devicebinding.js`
- **问题**: `http.post(\`/user/bind/device?deviceSn=\${encodeURIComponent(sn)}\`, {}, {...})` 把 `deviceSn` 放在 URL query 上，但后端从请求体 body 解析，参数传不过去
- **修复**: 改为 `http.post('/user/bind/device', { deviceSn: sn }, {...})`
- **同样问题**: `userDeviceLogin` 接口同步修复

#### 4. 修复联系人数据解析（会话#4）
- **文件**: `utils/deviceService.js`
- **问题**: 后端返回 `{电话: "xxx"}`，但代码解析的是 `item['名称']` 和 `item['手机号']`
- **修复**: 改解析逻辑匹配实际返回格式

#### 5. 重写 Mock 后端（会话#4）
- **文件**: `server/app.js`
- **改动**:
  - initData 中联系人格式从 `{名称: '张三', 手机号: '138'}` 改为 `{电话: '15053957932'}`
  - `/user/addPhoneNumber`、`/user/deletePhone` 接口同步更新
  - 修复 `/user/bind/userDeviceLogin` 中 `deviceSn` 未定义 bug
  - 添加 `/images` 静态资源映射，解决中文图标路径 500 问题
  - 新增 `GET /user/getInstallLocation` 安装位置接口

#### 6. 修复设置页位置选择（会话#6）
- **文件**: `pages/setting/setting.js`、`app.json`
- **改动**:
  - 添加权限检查 (`wx.getSetting` + `wx.authorize`)
  - 选完后立即保存到 `/device/updateLocation`
  - 传入当前设备坐标作为初始点
  - `app.json`: `requiredPrivateInfos` 添加 `chooseLocation` 声明

---

### API接口清单

| 接口 | 方法 | 状态 |
|------|------|------|
| /system/log | POST | ✅ |
| /user/getMainMessage | GET | ✅ |
| /user/getMessage | POST | ✅ |
| /user/bind/status | GET | ✅ |
| /user/bind/device | POST | ✅ |
| /user/bind/userDeviceLogin | POST | ✅ |
| /user/userBindPhone | POST | ✅ |
| /user/getLocation | GET | ✅ |
| /user/getInstallLocation | GET | ✅ (新增) |
| /user/userGetPhone | GET | ✅ |
| /user/addPhoneNumber | POST | ✅ |
| /user/deletePhone | DELETE | ✅ |
| /user/getRecord | GET | ✅ |
| /device/updateLocation | POST | ✅ (新增) |
| /setting/list | GET | ✅ |
| /setting/update | POST | ✅ |

---

## 2026-04-18 - Git 隐私信息排查

### 背景
第一次提交后担心 git 历史包含敏感信息，进行排查。

### 发现的问题

| 隐私信息 | 位置 | 严重程度 |
|---------|------|----------|
| 微信 AppID | `project.config.json` | 🔴 高危 |

已提交的首次 commit 中包含完整的小程序 AppID，需清理。

---

## 2026-04-12 - 无后端前端调试

### 目标
在无后端情况下模拟后端数据，单独测试前端bug

---

### 改动记录

#### 1. 创建Mock服务器
- **文件**: `utils/mockServer.js`
- **说明**: 本地Mock数据服务，模拟后端API返回
- **功能**: 自动日志记录、场景切换(normal/alarm/offline/error/empty)

#### 2. 创建Express后端
- **文件**: `server/app.js`
- **说明**: Node.js完整后端服务
- **依赖**: `server/package.json` (express, cors)
- **端口**: 8080

#### 3. 集成Mock到http.js
- **文件**: `utils/http.js`
- **改动**: 添加Mock请求拦截，对应MockConfig.enabled

#### 4. 修改env.js指向本地
- **文件**: `utils/env.js`
- **改动**: 开发版使用localhost:8080

#### 5. app.js初始化Mock设备
- **文件**: `app.js`
- **改动**: 启动时自动初始化模拟设备数据

#### 6. 修复后端token验证
- **文件**: `server/app.js`
- **问题**: device token无法通过/user/bind/status验证
- **修复**: getUserToken/getAuthToken函数支持device_token_前缀

#### 7. 修复/user/bind/status接口
- **文件**: `server/app.js`
- **问题**: 必须user token才能访问
- **修复**: 简化验证，有token即可访问

#### 8. 修复登录后跳转
- **文件**: `pages/login/login.js`
- **问题**: 授权头像昵称后停留在当前页
- **修复**: 授权成功后直接跳转首页

#### 9. 修复音频URL
- **文件**: `server/app.js`
- **问题**: soundjay.com URL失效(404)
- **修复**: 使用本地音频 http://localhost:8080/audio/test1.mp3

#### 10. 修复地图marker图标
- **文件**: `utils/deviceService.js`
- **问题**: marker-emergency.png不存在
- **修复**: 改用map.png

#### 11. 优化录音页面性能
- **文件**: `pages/audio/audio.js`
- **问题**: 
  - ID用Date.now()每次刷新都变→UI闪烁
  - 7秒轮询太频繁
  - 每次setData整个数组
- **修复**:
  - 改用递增ID生成器(_audioIdGen)
  - 轮询改为15秒
  - 添加JSON.stringify比较后只更新
  - collectIds添加JSON.parse安全解析
  - 添加sortTime时间戳用于正确排序

---

### API接口清单

| 接口 | 方法 | 状态 |
|------|------|------|
| /system/log | POST | ✅ |
| /user/getMainMessage | GET | ✅ |
| /user/getMessage | POST | ✅ |
| /user/bind/status | GET | ✅ |
| /user/bind/device | POST | ✅ |
| /user/userBindPhone | POST | ✅ |
| /user/getLocation | GET | ✅ |
| /user/userGetPhone | GET | ✅ |
| /user/addPhoneNumber | POST | ✅ |
| /user/deletePhone | DELETE | ✅ |
| /user/getRecord | GET | ✅ |
| /setting/list | GET | ✅ |
| /setting/update | POST | ✅ |

### 调试接口

| 接口 | 方法 | 说明 |
|------|------|------|
| /logs | GET | 请求日志 |
| /debug/reset | POST | 重置场景 |
| /debug/clear | POST | 清空日志 |

---

### 启动方式

```bash
cd server
npm start
```

---

### 待处理
- [ ] 音频播放可能有格式兼容问题(ogg vs mp3)

---

## 2026-04-06

### Bug 修复（本次会话）

#### 🔴 高优先级

| # | 文件 | 问题 | 修复 |
|---|------|------|------|
| 1 | `pages/device-detail/device-detail.js` | 缺少 `getStorage` 导入，打开详情页即崩溃（ReferenceError） | 添加 `import { getStorage } from '../../utils/storage'` |
| 2 | `utils/http.js` | 401 触发后只清空 storage，未重置内存中的 `app.globalData`，重登录后旧设备 token 残留 | 在 modal 确认回调中额外重置所有 globalData 字段 |
| 3 | `pages/device-detail/device-detail.js` | 设备对象 `id` 硬编码为 `'1'`，多设备场景下设备身份错乱 | 改为 `this.data.currentSn` |

#### 🟡 中优先级

| # | 文件 | 问题 | 修复 |
|---|------|------|------|
| 4 | `pages/home/home.js` | `onHide`/`onUnload` 清除定时器后未置 `null`，导致旧引用残留 | 加 `this.pollTimer = null` |
| 5 | `pages/home/home.js` | `loadAllDevices` 无并发保护，轮询重叠时多个请求并发写 `devices` | 用 `isLoadingDevices` 标志 + `try/finally` 包裹 |

---

### 代码优化（本次会话）

#### 新增工具文件

| 文件 | 内容 |
|------|------|
| `utils/constants.js` | `DEVICE_STATUS_MAP`（设备状态映射）、`DEVICE_TYPE_MAP`（SN前缀映射），统一维护 |
| `utils/validators.js` | `isValidPhone()`（手机号验证）、`isValidSN()`（SN码格式验证），正则集中管理 |
| `utils/deviceService.js` | `loadDeviceData()`、`loadDeviceContacts()`、`buildMarkers()`，抽取设备数据加载公共逻辑 |

#### utils/storage.js

- **删除未使用的异步方法**：移除 `asyncSetStorage`、`asyncGetStorage`、`asyncRemoveStorage`、`asyncClearStorage`（项目中全部使用同步方法，四个异步方法从未被调用）

#### pages/login

- **实时手机号格式验证**：`onPhoneInput` 改为边输入边校验（使用 `validators.js`），新增 `phoneError` 数据字段
- **WXML 错误提示**：输入框边框变红 + 显示错误文案 + 确认按钮在格式错误时禁用
- **关闭弹窗时清除错误状态**：`hidePhoneModal` 重置 `phoneError: false`
- **使用统一验证函数**：`confirmPhone` 改用 `isValidPhone()`，不再硬编码长度判断

#### pages/devicebinding

- **实时 SN 码格式验证**：`onInputSN` 增加格式校验（大写字母+数字，1-20位），新增 `snError` 数据字段
- **WXML 错误提示**：输入框边框变红 + 显示错误文案 + 确认按钮在格式错误时禁用
- **`confirmBind` 双重校验**：提交前再次验证，防止绕过前端校验

#### pages/home

- **用户信息迁移至 `onLoad`**：`loadUserInfo()` 从 `onShow` 移至 `onLoad`，避免每次切换 Tab 都重新请求（节省流量，减少闪烁）
- **setData 变化检测**：`loadAllDevices` 中只有数据真正变化时才调用 `setData`，减少无意义渲染
- **引入 `DEVICE_STATUS_MAP` 常量**：替换方法内的重复对象字面量
- **空状态 UI 优化**：「暂未绑定设备」升级为图标 + 主文案 + 引导文字的三层结构

#### pages/device-detail

- **移除 `setTimeout(100ms)` 延迟**：`onLoad` 中直接调用 `loadDeviceFromAPI()`，消除不必要的白屏延迟
- **使用 `deviceService`**：`loadDeviceFromAPI` 改为调用 `loadDeviceData`、`loadDeviceContacts`、`buildMarkers`，减少约 60 行重复代码
- **`goSetting()` 空值保护**：跳转前检查 `device.id` 是否存在，避免设备未加载完时崩溃
- **移除调试 `console.log`**：清理 `onLoad` 中的 6 条调试日志
- **空状态 UI 优化**：「暂无紧急联系人」升级为图标 + 文案结构

#### pages/setting

- **使用 `deviceService`**：`loadDevice()` 改为调用 `loadDeviceData` + `buildMarkers`，移除重复的 API 调用代码（约 40 行）

---

### 扫码绑定流程（新功能）

**实现目标**：扫描带 SN 码的小程序码 → 未登录自动跳到登录页 → 登录完成后回到绑定页自动填写 SN → 确认绑定

**涉及文件**：`app.js`、`pages/devicebinding/devicebinding.js`、`pages/login/login.js`

**核心机制**：`app.globalData.pendingSN` 作为跨页面 SN 暂存

| 步骤 | 逻辑 |
|------|------|
| 扫码进入 `devicebinding` | 解析 `options.scene` / `options.sn`，存入 `globalData.pendingSN` |
| 未登录时 | `checkLoginStatus` 跳转 login 页，SN 已保存在内存中 |
| 登录完成后 `goBindDevice()` | 读取 `pendingSN`，携带 `?sn=XXX` 跳回绑定页 |
| 绑定成功 | 清除 `globalData.pendingSN` |

---

### 项目结构变化

```
utils/
├── constants.js    ← 新增：设备状态/类型常量
├── validators.js   ← 新增：手机号/SN格式验证
├── deviceService.js← 新增：设备数据加载公共服务
├── http.js         ← 修改：401处理补充globalData重置
├── storage.js      ← 修改：删除4个未使用的异步方法
└── ...

pages/
├── login/          ← 修改：实时手机号验证
├── devicebinding/  ← 修改：SN格式实时校验
├── home/           ← 修改：userInfo缓存、setData去重、空状态UI
├── device-detail/  ← 修改：去延迟、用deviceService、导航保护、空状态UI
└── setting/        ← 修改：用deviceService

app.js              ← 修改：globalData添加pendingSN字段
```
