# 智能报警小程序 API 接口文档

> 版本: v1.0  
> 更新日期: 2025-03-21  
> Base URL: `http://120.46.84.175:8080`


**响应参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| code | int | 状态码 |
| msg | string | 消息 |
| data | string | Token 字符串 |

**响应示例:**
```json
{
  "code": 1,
  "msg": "success",
  "data": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4eHh4eHh4eHgifQ.xxx"
}
```

---

### 2.2 验证手机号

**接口地址:** `POST /system/verifyPhone`

**功能说明:** 通过微信授权获取用户手机号

**请求参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | string | 是 | 微信手机号授权凭证 |

**响应参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| code | int | 状态码 |
| msg | string | 消息 |
| data | object | 用户信息 |
| └ phoneNumber | string | 手机号 |

**响应示例:**
```json
{
  "code": 1,
  "msg": "success",
  "data": {
    "phoneNumber": "13812345678"
  }
}
```

---

## 三、设备管理模块

### 3.1 获取设备列表

**接口地址:** `GET /device/list`

**功能说明:** 获取当前用户绑定的所有设备列表

**请求参数:** 无

**响应参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| code | int | 状态码 |
| msg | string | 消息 |
| data | array | 设备列表 |
| └ id | string | 设备ID |
| └ name | string | 设备名称 |
| └ sn | string | 设备序列号 |
| └ owner | string | 机主姓名 |
| └ latitude | double | 纬度 |
| └ longitude | double | 经度 |
| └ address | string | 设备地址 |
| └ status | string | 设备状态 (normal/alarm/offline) |
| └ statusText | string | 状态文本 (正常/报警/离线) |
| └ contacts | array | 紧急联系人列表 |
| └ createTime | string | 绑定时间 |

**响应示例:**

{
}

---

### 3.2 获取设备详情

**接口地址:** `GET /device/detail/{id}`

**功能说明:** 获取指定设备的详细信息

**路径参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 设备ID |

**响应参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| code | int | 状态码 |
| msg | string | 消息 |
| data | object | 设备详情（同设备列表单项结构） |

**响应示例:**
```json
{
  "code": 1,
  "msg": "success",
  "data": {
    "id": "1",
    "name": "智能烟雾报警器 A1",
    "sn": "SA100-2024-A7B3C9D1",
    "owner": "张明辉",
    "latitude": 39.9042,
    "longitude": 116.4074,
    "address": "北京市朝阳区建国路88号",
    "status": "normal",
    "statusText": "正常",
    "contacts": [
      { "id": "c1", "name": "张明辉", "phone": "13812345678" }
    ],
    "createTime": "2025-03-01 10:00:00"
  }
}
```

---

### 3.3 扫码绑定设备

**接口地址:** `POST /device/bind/scan`

**功能说明:** 通过扫描设备二维码绑定设备

**请求参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sn | string | 是 | 设备序列号（二维码内容） |

**请求示例:**
```json
{
  "sn": "SA100-2024-A7B3C9D1"
}
```

**响应参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| code | int | 状态码 |
| msg | string | 消息 |
| data | object | 绑定的设备信息 |

**响应示例:**
```json
{
  "code": 1,
  "msg": "绑定成功",
  "data": {
    "id": "1001",
    "name": "智能烟雾报警器 A1",
    "sn": "SA100-2024-A7B3C9D1",
    "status": "normal",
    "statusText": "正常"
  }
}
```

---

### 3.4 手动输入绑定设备

**接口地址:** `POST /device/bind/manual`

**功能说明:** 通过输入设备SN码绑定设备

**请求参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sn | string | 是 | 设备序列号 |

**请求示例:**
```json
{
  "sn": "SA100-2024-A7B3C9D1"
}
```

**响应参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| code | int | 状态码 |
| msg | string | 消息 |
| data | object | 绑定的设备信息 |

**响应示例:**
```json
{
  "code": 1,
  "msg": "绑定成功",
  "data": {
    "id": "1001",
    "name": "智能烟雾报警器 A1",
    "sn": "SA100-2024-A7B3C9D1",
    "status": "normal",
    "statusText": "正常"
  }
}
```

---

### 3.5 解除设备绑定

**接口地址:** `POST /device/unbind`

**功能说明:** 解除与指定设备的绑定关系

**请求参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| deviceId | string | 是 | 设备ID |

**请求示例:**
```json
{
  "deviceId": "1"
}
```

**响应参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| code | int | 状态码 |
| msg | string | 消息 |

**响应示例:**
```json
{
  "code": 1,
  "msg": "解除绑定成功"
}
```

---

### 3.6 修改设备信息

**接口地址:** `PUT /device/update`

**功能说明:** 修改设备名称等基本信息

**请求参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| deviceId | string | 是 | 设备ID |
| name | string | 否 | 新设备名称 |

**请求示例:**
```json
{
  "deviceId": "1",
  "name": "客厅烟雾报警器"
}
```

**响应参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| code | int | 状态码 |
| msg | string | 消息 |

**响应示例:**
```json
{
  "code": 1,
  "msg": "修改成功"
}
```

---

### 3.7 添加紧急联系人

**接口地址:** `POST /device/contact/add`

**功能说明:** 为指定设备添加紧急联系人

**请求参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| deviceId | string | 是 | 设备ID |
| name | string | 是 | 联系人姓名 |
| phone | string | 是 | 联系人手机号 |

**请求示例:**
```json
{
  "deviceId": "1",
  "name": "王五",
  "phone": "13800138000"
}
```

**响应参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| code | int | 状态码 |
| msg | string | 消息 |
| data | object | 新增的联系人信息 |
| └ id | string | 联系人ID |
| └ name | string | 联系人姓名 |
| └ phone | string | 联系人手机号 |

**响应示例:**
```json
{
  "code": 1,
  "msg": "添加成功",
  "data": {
    "id": "c100",
    "name": "王五",
    "phone": "13800138000"
  }
}
```

---

### 3.8 删除紧急联系人

**接口地址:** `POST /device/contact/delete`

**功能说明:** 删除指定设备的紧急联系人

**请求参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| deviceId | string | 是 | 设备ID |
| contactId | string | 是 | 联系人ID |

**请求示例:**
```json
{
  "deviceId": "1",
  "contactId": "c1"
}
```

**响应参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| code | int | 状态码 |
| msg | string | 消息 |

**响应示例:**
```json
{
  "code": 1,
  "msg": "删除成功"
}
```

---

### 3.9 修改紧急联系人

**接口地址:** `PUT /device/contact/update`

**功能说明:** 修改指定设备的紧急联系人信息

**请求参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| deviceId | string | 是 | 设备ID |
| contactId | string | 是 | 联系人ID |
| name | string | 否 | 新联系人姓名 |
| phone | string | 否 | 新联系人手机号 |

**请求示例:**
```json
{
  "deviceId": "1",
  "contactId": "c1",
  "name": "张三改",
  "phone": "13900139000"
}
```

**响应参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| code | int | 状态码 |
| msg | string | 消息 |

**响应示例:**
```json
{
  "code": 1,
  "msg": "修改成功"
}
```

---

## 四、报警位置模块

### 4.1 获取报警位置

**接口地址:** `GET /user/getLocation`

**功能说明:** 获取最新报警设备的位置信息

**请求参数:** 无

**响应参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| code | int | 状态码 |
| msg | string | 消息 |
| data | object | 报警位置信息 |
| └ gps_lng / lng | double | 经度 |
| └ gps_lat / lat | double | 纬度 |
| └ address | string | 地址 |
| └ alarmType | string | 报警类型 |
| └ alarmTime | string | 报警时间 |
| └ deviceName / name | string | 设备名称 |
| └ alarmStatus | string | 报警状态 (alarm/normal/offline) |

**响应示例:**
```json
{
  "code": 1,
  "msg": "success",
  "data": {
    "gps_lng": 116.4074,
    "gps_lat": 39.9042,
    "address": "北京市朝阳区建国路88号",
    "alarmType": "落梁",
    "alarmTime": "2025-03-21 10:30:00",
    "deviceName": "智能烟雾报警器 A1",
    "alarmStatus": "alarm"
  }
}
```

---

### 4.2 获取设备位置列表

**接口地址:** `GET /user/getLocations`

**功能说明:** 获取当前用户所有设备的最新位置信息

**请求参数:** 无

**响应参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| code | int | 状态码 |
| msg | string | 消息 |
| data | array | 设备位置列表 |
| └ deviceId | string | 设备ID |
| └ deviceName | string | 设备名称 |
| └ status | string | 设备状态 |
| └ latitude | double | 纬度 |
| └ longitude | double | 经度 |
| └ address | string | 地址 |

**响应示例:**
```json
{
  "code": 1,
  "msg": "success",
  "data": [
    {
      "deviceId": "1",
      "deviceName": "智能烟雾报警器 A1",
      "status": "alarm",
      "latitude": 39.9042,
      "longitude": 116.4074,
      "address": "北京市朝阳区建国路88号"
    },
    {
      "deviceId": "2",
      "deviceName": "智能燃气探测器 G2",
      "status": "normal",
      "latitude": 39.9088,
      "longitude": 116.3975,
      "address": "北京市东城区王府井大街138号"
    }
  ]
}
```

---

## 五、录音管理模块

### 5.1 获取录音列表

**接口地址:** `GET /user/getRecord`

**功能说明:** 获取设备录音文件列表

**请求参数:** 无

**响应参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| code | int | 状态码 |
| msg | string | 消息 |
| data | array | 录音文件URL数组 |

**响应示例:**
```json
{
  "code": 1,
  "msg": "success",
  "data": [
    "https://cdn.example.com/record/20250321103000.mp3",
    "https://cdn.example.com/record/20250321102500.mp3",
    "https://cdn.example.com/record/20250321102000.mp3"
  ]
}
```

---

### 5.2 获取录音详情列表

**接口地址:** `GET /user/getRecord/list`

**功能说明:** 获取录音详细信息列表（包含时间、状态等）

**请求参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| deviceId | string | 否 | 设备ID（不传则获取全部） |
| page | int | 否 | 页码（默认1） |
| pageSize | int | 否 | 每页数量（默认20） |

**响应参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| code | int | 状态码 |
| msg | string | 消息 |
| data | object | 分页数据 |
| └ list | array | 录音列表 |
| └ total | int | 总数 |
| └ page | int | 当前页 |
| └ pageSize | int | 每页数量 |

**list 录音项:**
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 录音ID |
| url | string | 录音文件URL |
| name | string | 录音名称 |
| date | string | 录音日期 |
| time | string | 录音时间 |
| duration | string | 录音时长 |
| status | string | 录音状态 (normal/emergency) |
| deviceId | string | 关联设备ID |

**响应示例:**
```json
{
  "code": 1,
  "msg": "success",
  "data": {
    "list": [
      {
        "id": "audio_1",
        "url": "https://cdn.example.com/record/20250321103000.mp3",
        "name": "现场录音_20250321",
        "date": "2025-03-21",
        "time": "10:30:00",
        "duration": "01:30",
        "status": "emergency",
        "deviceId": "1"
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 20
  }
}
```

---

### 5.3 删除录音

**接口地址:** `POST /record/delete`

**功能说明:** 删除指定录音

**请求参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| recordId | string | 是 | 录音ID |

**请求示例:**
```json
{
  "recordId": "audio_1"
}
```

**响应参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| code | int | 状态码 |
| msg | string | 消息 |

**响应示例:**
```json
{
  "code": 1,
  "msg": "删除成功"
}
```

---

### 5.4 收藏/取消收藏录音

**接口地址:** `POST /record/collect`

**功能说明:** 收藏或取消收藏指定录音

**请求参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| recordId | string | 是 | 录音ID |
| collect | boolean | 是 | 是否收藏 (true/false) |

**请求示例:**
```json
{
  "recordId": "audio_1",
  "collect": true
}
```

**响应参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| code | int | 状态码 |
| msg | string | 消息 |

**响应示例:**
```json
{
  "code": 1,
  "msg": "收藏成功"
}
```

---

### 5.5 上传录音

**接口地址:** `POST /record/upload`

**功能说明:** 上传现场录音文件

**请求参数:** (FormData)
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | file | 是 | 录音文件 |
| deviceId | string | 是 | 设备ID |
| duration | int | 否 | 录音时长（秒） |

**响应参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| code | int | 状态码 |
| msg | string | 消息 |
| data | object | 上传结果 |
| └ recordId | string | 录音ID |
| └ url | string | 录音文件URL |

**响应示例:**
```json
{
  "code": 1,
  "msg": "上传成功",
  "data": {
    "recordId": "audio_1001",
    "url": "https://cdn.example.com/record/20250321103000.mp3"
  }
}
```


---
## 附录

### A. 设备状态
| 状态值 | 说明 |
|--------|------|
| alarm | 报警中 |
| normal | 正常 |
| offline | 离线 |

### B. 报警类型说明
| 类型值 | 说明 |
|--------|------|
| 落梁 | 桥梁落梁报警 |
| 烟雾 | 烟雾报警 |
| 燃气 | 燃气泄漏 |
| 门磁 | 门磁报警 |
| 水浸 | 水浸报警 |
| 其他 | 其他报警类型 |

