# 开发日志

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
