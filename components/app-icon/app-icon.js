Component({
  options: {
    styleIsolation: 'apply-shared'
  },
  properties: {
    name: { type: String, value: '' },
    size: { type: Number, value: 24 },
    label: { type: String, value: '' },
    muted: { type: Boolean, value: false }
  }
});
