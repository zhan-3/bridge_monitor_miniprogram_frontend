Component({
  properties: {
    // 卡片标题
    title: {
      type: String,
      value: ''
    },
    // 卡片标签
    tag: {
      type: String,
      value: ''
    },
    // 卡片底部文字
    footerText: {
      type: String,
      value: ''
    }
  },
  methods: {
    // 卡片点击事件（透传）
    onCardClick() {
      this.triggerEvent('click');
    }
  }
});