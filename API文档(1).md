# 报警设备接口文档

## 业务逻辑概述

本系统采用**两步验证机制**，确保用户必须先绑定设备才能使用完整功能：

```
用户登录 → 获取只有userId的token → 只能访问绑定接口 → 绑定设备后获取新token（含deviceId） → 可访问所有用户接口
```

**核心流程：**
1. **第一步（微信登录）**：用户通过微信授权获取初始token，此时token只包含`userId`，不包含`deviceId`
2. **第二步（绑定设备）**：用户使用初始token调用`/user/bind/device`绑定设备，系统返回新token（包含`userId`和`deviceId`）
3. **第三步（正常使用）**：持有包含`deviceId`的token，才能访问`/user/*`下的其他接口

**Token验证机制：**
- 初始token（未绑定设备）：仅含`userId`，允许访问`/user/bind/*`、`/user/getMessage`、`/user/getMainMessage`
- 完整token（已绑定设备）：含`userId`和`deviceId`，允许访问所有接口
- 未携带token或token无效：返回401
- 未绑定设备但访问其他接口：返回403 "请先绑定设备"

---

## 一、登录接口 (SystemController)

### 1. 微信登录/用户注册
- **接口地址**: `POST /system/log`
- **接口说明**: 通过微信登录验证，获取用户身份token（初始token，仅包含userId）。如果是新用户，会自动创建账户。
- **是否需要Token**: 否
- **请求体 (JSON)**:
  | 参数名 | 类型 | 必填 | 说明 |
  |--------|------|------|------|
  | code | String | 是 | 微信小程序登录时获取的code |
- **请求示例**:
```json
{
  "code": "微信code"
}
```
- **成功响应示例**:
```json
{
  "code": 1,
  "msg": "success",
  "data": "eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwiZXhwIjoxNzM2MzY0MDAwfQ.xxxxxx"
}
```
- **返回数据用途**: 返回的token包含用户ID，但不含设备ID，用于下一步绑定设备。**注意：此token只能访问`/user/bind/*`接口，无法访问其他用户接口。**

- **失败响应示例**:
```json
{
  "code": 0,
  "msg": "微信信息错误，登录失败",
  "data": null
}
```

### 2.绑定手机号
- **接口地址**: `POST /user/userBindPhone?number=手机号`
- **接口说明**: 用户填写手机号，保存到个人信息。**无需绑定设备即可访问。**
- **是否需要Token**: 是（无需绑定设备）
- **请求示例**:
```
POST /user/userBindPhone?number=13800138000
```
- **成功响应示例**:
```json
{
  "code": 1,
  "msg": "success",
  "data": null
}
```
- **返回数据用途**: 无返回值，表示绑定成功。

---

## 二、设备绑定接口 (BindDeviceController)

> ⚠️ **重要**：这些接口需要初始token（未绑定设备的token），是用户完成"第二步验证"的唯一途径。

### 1. 绑定设备
- **接口地址**: `POST /user/bind/device`
- **接口说明**: 将报警设备与当前用户绑定。绑定成功后系统会返回新的token（包含deviceId）。
- **请求头**: 
  | 参数名 | 类型 | 必填 | 说明 |
  |--------|------|------|------|
  | Authorization | String | 是 | Bearer Token（初始token） |
- **请求体 (JSON)**:
  | 参数名 | 类型 | 必填 | 说明 |
  |--------|------|------|------|
  | deviceId | String | 是 | 设备ID |
- **请求示例**:
```json
{
  "deviceId": "DEVICE001"
}
```
- **成功响应示例**:
```json
{
  "code": 1,
  "msg": "success",
  "data": "eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwiZGV2aWNlSWQiOiJEVklDRTAwMSJ9.xxxxxx"
}
```
- **返回数据用途**: 返回新的token，包含`userId`和`deviceId`。**获取此token后，用户才真正完成验证，可以使用所有`/user/*`接口。**

- **失败响应示例**:
```json
{
  "code": 0,
  "msg": "该设备已被其他用户绑定",
  "data": null
}
```

### 2. 获取绑定状态
- **接口地址**: `GET /user/bind/status`
- **接口说明**: 查询当前用户的设备绑定状态，用于判断是否已完成设备绑定。
- **请求头**: 
  | 参数名 | 类型 | 必填 | 说明 |
  |--------|------|------|------|
  | Authorization | String | 是 | Bearer Token |
- **响应示例 (已绑定)**:
```json
{
  "code": 1,
  "msg": "success",
  "data": {
    "userName": "测试用户",
    "deviceName": "我的报警器"
  }
}
```
- **返回数据用途**: 返回已绑定的用户名称和设备名称，用于展示绑定状态。

- **响应示例 (未绑定)**:
```json
{
  "code": 1,
  "msg": "success",
  "data": ""
}
```
- **返回数据用途**: 返回空字符串，表示用户尚未绑定设备，需要引导用户去绑定。

---

## 三、用户接口 (UserController)

> ⚠️ **重要**：以下接口除`/user/getMessage`和`/user/getMainMessage`外，都需要**已完成设备绑定**的token（包含deviceId）。未绑定设备的token访问这些接口会返回403错误。

> ✅ **无需绑定设备即可访问**：`/user/getMessage`、`/user/getMainMessage`

### 1. 获取录音记录
- **接口地址**: `GET /user/getRecord`
- **接口说明**: 获取当前用户绑定的设备产生的所有报警录音文件URL列表。
- **请求头**: 
  | 参数名 | 类型 | 必填 | 说明 |
  |--------|------|------|------|
  | Authorization | String | 是 | Bearer Token（需包含deviceId） |
- **响应示例**:
```json
{
  "code": 1,
  "msg": "success",
  "data": [
    "http://120.46.84.175:8080/audio/aaaaa.mp3",
    "http://120.46.84.175:8080/audio/bbbbb.mp3"
  ]
}
```
- **返回数据用途**: 返回完整的音频文件URL列表，前端可以直接用于播放或下载报警录音。

### 2. 获取位置信息
- **接口地址**: `GET /user/getLocation`
- **接口说明**: 获取当前用户绑定的设备最近一次报警时的GPS经纬度坐标。
- **请求头**: 
  | 参数名 | 类型 | 必填 | 说明 |
  |--------|------|------|------|
  | Authorization | String | 是 | Bearer Token |
- **响应示例**:
```json
{
  "code": 1,
  "msg": "success",
  "data": {
    "gpsLng": "116.397428",
    "gpsLat": "39.90923"
  }
}
```
- **返回数据用途**: 返回设备的GPS坐标，可用于在前端地图上显示设备位置。

### 3. 添加紧急联系人手机号
- **接口地址**: `POST /user/addPhoneNumber`
- **接口说明**: 添加紧急联系人手机号，报警时会自动呼叫这些号码。
- **请求头**: 
  | 参数名 | 类型 | 必填 | 说明 |
  |--------|------|------|------|
  | Authorization | String | 是 | Bearer Token |
- **请求参数**:
  | 参数名 | 类型 | 必填 | 说明 |
  |--------|------|------|------|
  | number | String | 是 | 手机号码 |
  | name | String | 是 | 联系人姓名 |
- **响应示例**:
```json
{
  "code": 1,
  "msg": "success",
  "data": null
}
```
- **返回数据用途**: 无返回值，表示添加成功。后续可通过`/user/showPhoneNumber`查看已添加的号码。

### 4. 删除紧急联系人手机号
- **接口地址**: `DELETE /user/deletePhone`
- **接口说明**: 删除指定的紧急联系人手机号，删除后该号码将不会收到报警呼叫。
- **请求头**: 
  | 参数名 | 类型 | 必填 | 说明 |
  |--------|------|------|------|
  | Authorization | String | 是 | Bearer Token |
- **请求参数**:
  | 参数名 | 类型 | 必填 | 说明 |
  |--------|------|------|------|
  | number | String | 是 | 要删除的手机号码 |
- **成功响应示例**:
```json
{
  "code": 1,
  "msg": "success",
  "data": "已成功删除"
}
```
- **返回数据用途**: 返回操作结果，提示删除成功或失败。

- **失败响应示例**:
```json
{
  "code": 0,
  "msg": "删除失败",
  "data": null
}
```

### 5. 获取所有紧急联系人
- **接口地址**: `GET /user/userGetPhone`
- **接口说明**: 获取当前设备的所有紧急联系人信息（包含姓名和电话），用于展示联系人列表。
- **请求头**: 
  | 参数名 | 类型 | 必填 | 说明 |
  |--------|------|------|------|
  | Authorization | String | 是 | Bearer Token |
- **响应示例**:
```json
{
  "code": 1,
  "msg": "success",
  "data": [
    {
      "name": "张三",
      "phone": "13800138000"
    },
    {
      "name": "李四",
      "phone": "13900139000"
    }
  ]
}
```
- **返回数据用途**: 返回完整的联系人列表，包含姓名和电话号码，前端可直接用于展示。

### 6. 获取手机号列表
- **接口地址**: `GET /user/showPhoneNumber`
- **接口说明**: 获取当前设备的手机号列表（仅号码），用于快速获取联系方式。
- **请求头**: 
  | 参数名 | 类型 | 必填 | 说明 |
  |--------|------|------|------|
  | Authorization | String | 是 | Bearer Token |
- **响应示例**:
```json
{
  "code": 1,
  "msg": "success",
  "data": [
    "13800138000",
    "13900139000"
  ]
}
```
- **返回数据用途**: 返回手机号数组，用于需要快速获取号码列表的场景（如批量发送通知）。

### 7. 保存用户头像和昵称
- **接口地址**: `POST /user/getMessage`
- **接口说明**: 保存或更新用户的头像URL、昵称信息，同时可以添加紧急联系人手机号。**无需绑定设备即可访问。**
- **请求头**: 
  | 参数名 | 类型 | 必填 | 说明 |
  |--------|------|------|------|
  | Authorization | String | 是 | Bearer Token（无需绑定设备） |
- **请求体 (JSON)**:
  | 参数名 | 类型 | 必填 | 说明 |
  |--------|------|------|------|
  | avatarUrl | String | 否 | 头像URL地址 |
  | nickName | String | 否 | 用户昵称 |
  | phone | String | 否 | 紧急联系人手机号 |
- **请求示例**:
```json
{
  "avatarUrl": "http://example.com/avatar.jpg",
  "nickName": "测试用户",
  "phone": "13800138000"
}
```
- **响应示例**:
```json
{
  "code": 1,
  "msg": "success",
  "data": "获取成功"
}
```
- **返回数据用途**: 返回操作结果提示。后续可通过`/user/getMainMessage`获取保存的信息。

### 8. 获取用户主要信息
- **接口地址**: `GET /user/getMainMessage`
- **接口说明**: 获取当前用户的昵称、头像URL和手机号。**无需绑定设备即可访问。**
- **请求头**: 
  | 参数名 | 类型 | 必填 | 说明 |
  |--------|------|------|------|
  | Authorization | String | 是 | Bearer Token（无需绑定设备） |
- **响应示例**:
```json
{
  "code": 1,
  "msg": "success",
  "data": {
    "nickName": "测试用户",
    "avatarUrl": "http://example.com/avatar.jpg",
    "phone": "13800138000"
  }
}
```
- **返回数据用途**: 返回用户的个人资料信息，包含昵称、头像和手机号。

---

## 四、系统接口 (SystemController)

> ⚠️ **注意**：以下接口供设备端调用，不需要用户Token，采用设备身份验证。

### 1. 上报警情数据
- **接口地址**: `POST /system/putRecordAndLocation`
- **接口说明**: 设备上报警情数据，包括报警ID、设备ID、GPS位置、报警时间和录音文件。服务器接收后会触发呼叫紧急联系人。
- **是否需要Token**: 否（设备端直连）
- **请求体 (JSON)**:
  | 参数名 | 类型 | 必填 | 说明 |
  |--------|------|------|------|
  | alarmId | Integer | 否 | 报警记录ID |
  | deviceId | String | 是 | 设备唯一标识 |
  | gpsLng | String/Decimal | 是 | GPS经度 |
  | gpsLat | String/Decimal | 是 | GPS纬度 |
  | alarmTime | String | 是 | 报警时间，格式：yyyy-MM-dd HH:mm:ss |
  | amr64Base | String | 是 | AMR格式音频的Base64编码 |
- **请求示例**:
```json
{
  "alarmId": 1,
  "deviceId": "DEVICE001",
  "gpsLng": "116.397428",
  "gpsLat": "39.90923",
  "alarmTime": "2026-03-24 10:30:00",
  "amr64Base": "xxx...xxx"
}
```
- **响应示例**:
```json
{
  "code": 1,
  "msg": "success",
  "data": [
    "13800138000",
    "13900139000"
  ]
}
```
- **返回数据用途**: 返回被呼叫的紧急联系人手机号列表，用于设备端记录或展示呼叫结果。

---

## 五、响应码说明

| code | msg | 说明 |
|------|-----|------|
| 1 | success | 请求成功 |
| 0 | 错误信息 | 请求失败 |
| 401 | - | Token无效或未提供 |
| 403 | - | 无权限（未绑定设备时访问用户接口） |

---

## 六、HTTP状态码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 401 | 未提供有效token |
| 403 | 已提供token但无权限（未绑定设备） |

---

## 七、错误信息示例

```json
{
  "code": 401,
  "message": "请提供有效的token"
}
```

```json
{
  "code": 403,
  "message": "请先绑定设备"
}
```

```json
{
  "code": 0,
  "msg": "Token无效或已过期",
  "data": null
}
```

```json
{
  "code": 0,
  "msg": "参数不能为空",
  "data": null
}
```