Component({
  options: {
    styleIsolation: "apply-shared",
    multipleSlots: true // 强制开启多插槽（关键）
  },
  properties: {
    title: { type: String, value: '' },
    footerText: { type: String, value: '' },
    footerSlot: { type: Boolean, value: false },
    customClass: { type: String, value: '' },
    // 新增：控制右侧插槽是否显示（显式配置，避免隐式判断）
    showRightContent: { type: Boolean, value: false }
  },
  methods: {}
});