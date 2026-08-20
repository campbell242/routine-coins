// Getting a file OFF the phone, with no server to send it to.
//
// Android Chrome gives us two routes and the better one depends on what the
// parent wants: sharing hands the file to Drive/mail/chat so it lives
// somewhere other than the phone we're backing up (the whole point), while a
// download just lands in Downloads. Try share first, fall back to download.

export type SaveOutcome = 'shared' | 'downloaded' | 'cancelled' | 'failed';

export async function saveTextFile(name: string, text: string, mime = 'application/json'): Promise<SaveOutcome> {
  const blob = new Blob([text], { type: mime });

  // Share sheet (needs a File and an explicit canShare check — Android
  // supports files, several desktop browsers claim navigator.share but not
  // file payloads).
  try {
    const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
    if (typeof File === 'function' && nav.share && nav.canShare) {
      const file = new File([blob], name, { type: mime });
      if (nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: name });
        return 'shared';
      }
    }
  } catch (err) {
    // AbortError = the parent dismissed the sheet; anything else falls through
    // to the download route rather than failing outright.
    if (err instanceof Error && err.name === 'AbortError') return 'cancelled';
  }

  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoke late: revoking immediately can cancel the download on some
    // Android builds.
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}
