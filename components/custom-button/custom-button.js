Component({
  options: {
    styleIsolation: "apply-shared",
    multipleSlots: true
  },
  properties: {
    // 按钮文字
    text: {
      type: String,
      value: '确认'
    },
    // 按钮类型：orange（橙色）/ normal（普通灰色）
    type: {
      type: String,
      value: 'normal',
      // 限制可选值，避免错误
      validator: (val) => ['orange', 'normal'].includes(val)
    },
    // 按钮尺寸：normal/large
    size: {
      type: String,
      value: 'normal'
    },
    // 是否禁用
    disabled: {
      type: Boolean,
      value: false
    },
    // 自定义类名（用于扩展样式，比如普通按钮的白色变体）
    customClass: {
      type: String,
      value: ''
    }
  },
  methods: {
    // 按钮点击事件（透传至页面）
    onBtnClick() {
      if (this.properties.disabled) return;
      this.triggerEvent('click');
    }
  }
});