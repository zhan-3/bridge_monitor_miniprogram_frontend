const ALARM_SUBSCRIPTION_TEMPLATE_ID = '651q0Em13xCf2nDtDVHF-pZbBYL7Ebhxj8-MHrGaiE4'

function requestAlarmSubscription(wxApi) {
  return new Promise((resolve, reject) => {
    wxApi.requestSubscribeMessage({
      tmplIds: [ALARM_SUBSCRIPTION_TEMPLATE_ID],
      success: result => resolve(result[ALARM_SUBSCRIPTION_TEMPLATE_ID]),
      fail: reject
    })
  })
}

module.exports = {
  ALARM_SUBSCRIPTION_TEMPLATE_ID,
  requestAlarmSubscription
}
