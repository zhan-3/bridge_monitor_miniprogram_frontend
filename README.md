# 智能报警小程序

微信小程序，用于智能烟雾/燃气报警设备的管理与监控。

## 功能特性

### 认证模块
- 微信一键登录（静默授权）
- 手机号验证（3步流程：微信登录 → 授权头像昵称 → 授权手机号）
- Token 本地存储，自动续期

### 设备管理
- 设备绑定/解绑
- 设备详情查看（地图 + 信息卡片）
- 设备名称编辑
- 设备位置设置（地图选点）

### 地图功能
- 设备位置展示（带标注）
- 一键导航到设备位置
- 设备状态可视化（正常/报警/离线）

### 录音管理
- 查看报警录音列表
- 按时间/设备筛选
- 播放/下载录音

### 联系人管理
- 紧急联系人列表
- 左滑删除联系人
- 新增联系人

### 设置页面
- 设备信息查看（名称/SN/状态）
- 设备位置设置
- 录音设置（自动录音/质量/保存天数）
- 硬件报警设置（推送/铃声/断连提醒）

## 项目结构

```
├── pages/
│   ├── home/           # 首页（设备列表）
│   ├── device-detail/  # 设备详情
│   ├── devicebinding/  # 设备绑定
│   ├── setting/        # 设置页面
│   ├── audio/          # 录音列表
│   └── login/          # 登录页面
├── images/             # 图片资源
├── components/         # 自定义组件
├── APIDOC.md          # API 接口文档
└── README.md
```

## 页面路由

| 页面 | 路径 | 参数 |
|------|------|------|
| 首页 | `/pages/home/home` | - |
| 设备详情 | `/pages/device-detail/device-detail` | `id` - 设备ID |
| 设备绑定 | `/pages/devicebinding/devicebinding` | - |
| 设置 | `/pages/setting/setting` | `id` - 设备ID（可选） |
| 录音列表 | `/pages/audio/audio` | - |
| 登录 | `/pages/login/login` | - |

## 主题色

- **主色调**: `#FF7A00`（橙色）
- **导航栏**: 橙色背景 + 白色文字
- **按钮**: 橙色渐变

## 数据存储

使用 `wx.setStorageSync` 本地存储：

| Key | 说明 |
|-----|------|
| `devices` | 设备列表 |
| `token` | 用户 Token |
| `userInfo` | 用户信息 |
| `autoRecord` | 自动录音开关 |
| `recordQualityIndex` | 录音质量索引 |
| `recordSaveDayIndex` | 保存天数索引 |
| `alarmPush` | 报警推送开关 |
| `alarmSound` | 报警铃声开关 |
| `disconnectWarn` | 断连提醒开关 |

## 设备数据结构

```javascript
{
  id: '1',
  name: '智能烟雾报警器 A1',
  sn: 'SA100-2024-A7B3C9D1',
  latitude: 39.9042,
  longitude: 116.4074,
  address: '北京市朝阳区建国路88号',
  status: 'normal',  // 'normal' | 'alarm' | 'offline'
  statusText: '正常',
  contacts: [
    { id: 'c1', name: '张三', phone: '13812345678' }
  ]
}
```

## API 接口

详见 [APIDOC.md](./APIDOC.md)

Base URL: `http://120.46.84.175:8080`

### 核心接口

| 模块 | 接口 | 方法 | 说明 |
|------|------|------|------|
| 认证 | `/system/wxLogin` | POST | 微信登录 |
| 认证 | `/system/verifyPhone` | POST | 验证手机号 |
| 设备 | `/device/list` | GET | 获取设备列表 |
| 设备 | `/device/detail/{id}` | GET | 获取设备详情 |
| 设备 | `/device/bind` | POST | 绑定设备 |
| 设备 | `/device/unbind/{id}` | DELETE | 解绑设备 |
| 位置 | `/device/updateLocation` | POST | 更新设备位置 |
| 录音 | `/audio/list` | GET | 获取录音列表 |
| 录音 | `/audio/detail/{id}` | GET | 获取录音详情 |
| 设置 | `/setting/list` | GET | 获取设置列表 |
| 设置 | `/setting/update` | POST | 更新设置 |

## 开发说明

### 组件依赖
- `white-card`: 白色卡片组件
- `custom-button`: 自定义按钮组件
- `step-indicator`: 步骤指示器组件

### 图片资源
- `/images/marker-emergency.png`: 地图标注图标
- `/images/导航.png`: 导航图标
- `/images/录音开启.png`: 录音图标
- `/images/设置.png`: 设置图标
- `/images/avatar.png`: 默认头像

### 注意事项

1. **设备名称修改**：在设置页面修改后会自动保存并同步到设备详情页
2. **设备位置**：绑定时不自动设置位置，需到设备详情→设置中手动选择
3. **联系人**：支持左滑删除，删除按钮为红色
4. **Storage 同步**：设备数据通过 `wx.setStorageSync('devices')` 同步

## 版本信息

- 小程序版本: v1.0
- 更新日期: 2025-03-22
- 微信基础库: 3.13.1
