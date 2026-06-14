Component({
  options: {
    multipleSlots: true,
    styleIsolation: "apply-shared"
  },

  properties: {
    visible: { type: Boolean, value: false },
    title: { type: String, value: '' },
    showClose: { type: Boolean, value: true },
    confirmText: { type: String, value: '确定' },
    cancelText: { type: String, value: '取消' },
    confirmDisabled: { type: Boolean, value: false },
    hideFooter: { type: Boolean, value: false },
    loading: { type: Boolean, value: false }
  },

  methods: {
    onMaskTap() {
      this.triggerEvent('close')
    },
    onCancel() {
      this.triggerEvent('cancel')
    },
    onConfirm() {
      if (this.properties.confirmDisabled || this.properties.loading) return
      this.triggerEvent('confirm')
    }
  }
})
