let warmedStream: MediaStream | null = null

/** Prime the mic with auto-gain so quiet speech is picked up reliably. */
export async function warmUpMicrophone(): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) return

  try {
    if (warmedStream) {
      warmedStream.getTracks().forEach((track) => track.stop())
      warmedStream = null
    }

    warmedStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })
  } catch {
    // Speech recognition will still prompt for permission
  }
}

export function releaseMicrophone(): void {
  if (!warmedStream) return
  warmedStream.getTracks().forEach((track) => track.stop())
  warmedStream = null
}
