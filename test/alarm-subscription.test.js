const test = require('node:test')
const assert = require('node:assert/strict')
const {
  ALARM_SUBSCRIPTION_TEMPLATE_ID,
  requestAlarmSubscription
} = require('../utils/alarmSubscription')

test('requests the configured alarm template and returns the user decision', async () => {
  let requestedTemplateIds
  const wxApi = {
    requestSubscribeMessage(options) {
      requestedTemplateIds = options.tmplIds
      options.success({ [ALARM_SUBSCRIPTION_TEMPLATE_ID]: 'accept' })
    }
  }

  assert.equal(await requestAlarmSubscription(wxApi), 'accept')
  assert.deepEqual(requestedTemplateIds, [ALARM_SUBSCRIPTION_TEMPLATE_ID])
})
