import {
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
} from "youtube-transcript";

export interface CaptionFailure {
  status: number;
  error: string;
  message: string;
}

const OFFLINE_HINT =
  "Videos you've starred or opened before still work.";

/**
 * Turns a caption-download error into a status and a message the learner can
 * act on. The library's errors are told apart by class: their `name` is "Error".
 */
export function describeCaptionError(err: unknown): CaptionFailure {
  // NotAvailable means YouTube listed a caption track but refused to send it.
  // In practice that is Google blocking this network as "automated traffic"
  // (HTTP 429), which is common behind company VPNs and shared IPs.
  if (
    err instanceof YoutubeTranscriptTooManyRequestError ||
    err instanceof YoutubeTranscriptNotAvailableError
  ) {
    return {
      status: 503,
      error: "blocked",
      message:
        "YouTube is refusing to send captions to this network — it may think the traffic is automated (common on a company VPN or shared Wi-Fi). Try another network, or wait a while. " +
        OFFLINE_HINT,
    };
  }
  if (err instanceof YoutubeTranscriptDisabledError) {
    return {
      status: 422,
      error: "no_transcript",
      message: "This video has no captions, so it can't be practised. Try another video.",
    };
  }
  if (err instanceof YoutubeTranscriptVideoUnavailableError) {
    return {
      status: 422,
      error: "video_unavailable",
      message: "This video is unavailable (private, removed or region-locked).",
    };
  }
  if (err instanceof YoutubeTranscriptError) {
    return {
      status: 422,
      error: "no_transcript",
      message: "YouTube didn't return captions for this video. Try another video.",
    };
  }
  return {
    status: 502,
    error: "upstream_error",
    message:
      "Couldn't reach YouTube. Check your connection and try again. " + OFFLINE_HINT,
  };
}
