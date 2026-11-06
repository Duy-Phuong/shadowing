import { describe, expect, test } from "vitest";
import {
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
} from "youtube-transcript";
import { describeCaptionError } from "./captionErrors";

const ID = "dQw4w9WgXcQ";

describe("describeCaptionError", () => {
  test("a refused caption download points at the network, not the video", () => {
    for (const err of [
      new YoutubeTranscriptNotAvailableError(ID),
      new YoutubeTranscriptTooManyRequestError(),
    ]) {
      const f = describeCaptionError(err);
      expect(f.status).toBe(503);
      expect(f.error).toBe("blocked");
      expect(f.message).toMatch(/another network/);
    }
  });

  test("a video without captions says so", () => {
    expect(describeCaptionError(new YoutubeTranscriptDisabledError(ID))).toMatchObject({
      status: 422,
      error: "no_transcript",
    });
  });

  test("an unavailable video says so", () => {
    expect(describeCaptionError(new YoutubeTranscriptVideoUnavailableError(ID)).error).toBe(
      "video_unavailable",
    );
  });

  test("other library errors fall back to a generic caption message", () => {
    const err = new YoutubeTranscriptNotAvailableLanguageError("en", ["fr"], ID);
    expect(describeCaptionError(err)).toMatchObject({ status: 422, error: "no_transcript" });
  });

  test("anything else is treated as a connection problem", () => {
    expect(describeCaptionError(new TypeError("fetch failed"))).toMatchObject({
      status: 502,
      error: "upstream_error",
    });
  });
});
