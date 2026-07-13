/** Request mic permission once, then release so Web Speech can use the device. */
export async function warmUpMicrophone(): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) return

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })
    stream.getTracks().forEach((track) => track.stop())
  } catch {
    // Speech recognition will prompt for permission on its own
  }
}

export function releaseMicrophone(): void {
  // No persistent stream — kept for callers that invoke on stop
}
