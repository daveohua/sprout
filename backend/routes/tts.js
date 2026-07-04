var express = require("express");
var router = express.Router();
var https = require("https");

/* POST text-to-speech (full MP3 response) */
router.post("/", async function (req, res, next) {
    try {
        var text = req.body.text;
        var voiceId = req.body.voiceId || "21m00Tcm4TlvDq8ikWAM";
        var modelId = req.body.modelId || "eleven_turbo_v2_5";
        var apiKey = process.env.ELEVENLABS_API_KEY;

        if (!text) return res.status(400).json({ error: "text is required" });
        if (!apiKey)
            return res
                .status(500)
                .json({ error: "ELEVENLABS_API_KEY not set" });

        var postData = JSON.stringify({
            text: text,
            model_id: modelId,
            output_format: "mp3_44100_128",
        });

        var options = {
            hostname: "api.elevenlabs.io",
            path: "/v1/text-to-speech/" + voiceId + "/stream",
            method: "POST",
            headers: {
                Accept: "audio/mpeg",
                "Content-Type": "application/json",
                "xi-api-key": apiKey,
                "Content-Length": Buffer.byteLength(postData),
            },
        };

        var apiReq = https.request(options, function (apiRes) {
            res.set("Content-Type", "audio/mpeg");
            apiRes.pipe(res);
        });

        apiReq.on("error", function (err) {
            console.error("ElevenLabs HTTP error:", err.message);
            res.status(502).json({ error: "Upstream TTS request failed" });
        });

        apiReq.write(postData);
        apiReq.end();
    } catch (err) {
        next(err);
    }
});

module.exports = router;
