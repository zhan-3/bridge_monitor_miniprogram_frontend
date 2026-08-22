async function loadDeviceDetailsConcurrently({
  deviceId,
  authToken,
  loadDeviceData,
  loadDeviceContacts,
  buildMarkers
}) {
  const [device, contacts] = await Promise.all([
    loadDeviceData(deviceId, authToken),
    loadDeviceContacts(authToken, deviceId)
  ]);

  const completeDevice = { ...device, contacts };
  return {
    device: completeDevice,
    markers: buildMarkers(completeDevice)
  };
}

module.exports = { loadDeviceDetailsConcurrently };
