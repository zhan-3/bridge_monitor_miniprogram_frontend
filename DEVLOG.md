# 开发日志

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
