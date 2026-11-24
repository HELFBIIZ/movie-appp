# The Last Train

An original SceneChain animated lesson created for this repository. The script,
canvas artwork and bilingual captions are original project content, released
under CC0-1.0. The narration is synthetic English speech generated locally with
Windows SAPI (Microsoft Zira Desktop). No movie footage, dialogue, remote streams
or extracted subtitles are included.

This is explicitly a learning sample, not dialogue from the movie on the watch page.
`last-train.webm` is a 38-second VP8/Opus video. VTT timestamps are generated from
the duration of the actual narration buffers, with six-second scene slots.
`timings.json` records those timings. EN and MN describe the same story.

To regenerate on Windows with the voice installed:
`node scripts/create-learning-sample.mjs`.
The generated video and VTT files are committed; generation is not needed to run,
build or deploy the site. User-selected local videos are never uploaded.
