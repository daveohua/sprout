var https = require("https");

function setupTtsSocket(io) {
    io.on("connection", function (socket) {
        console.log("client connected", socket.id);

        socket.on("tts:stream", function (payload) {
            var text = typeof payload === "string" ? payload : payload.text;
            var voiceId =
                (typeof payload === "object" && payload.voiceId) ||
                "21m00Tcm4TlvDq8ikWAM";
            var modelId =
                (typeof payload === "object" && payload.modelId) ||
                "eleven_turbo_v2_5";
            var apiKey = process.env.ELEVENLABS_API_KEY;

            if (!text) {
                socket.emit("tts:error", { error: "text is required" });
                return;
            }
            if (!apiKey) {
                socket.emit("tts:error", {
                    error: "ELEVENLABS_API_KEY not set",
                });
                return;
            }

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

            socket.emit("tts:start");

            var apiReq = https.request(options, function (apiRes) {
                if (apiRes.statusCode !== 200) {
                    var body = "";
                    apiRes.on("data", function (chunk) {
                        body += chunk;
                    });
                    apiRes.on("end", function () {
                        socket.emit("tts:error", {
                            error:
                                "Upstream error " +
                                apiRes.statusCode +
                                ": " +
                                body,
                        });
                    });
                    return;
                }

                apiRes.on("data", function (chunk) {
                    socket.emit("tts:chunk", chunk);
                });

                apiRes.on("end", function () {
                    socket.emit("tts:end");
                });

                apiRes.on("error", function (err) {
                    socket.emit("tts:error", { error: err.message });
                });
            });

            apiReq.on("error", function (err) {
                socket.emit("tts:error", { error: err.message });
            });

            apiReq.write(postData);
            apiReq.end();
        });

        socket.on("disconnect", function () {
            console.log("client disconnected", socket.id);
        });
    });
}

module.exports = setupTtsSocket;
