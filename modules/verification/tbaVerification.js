var crypto = require("crypto");

module.exports = (req, res, next) => {
  if (req.body && req.body.message_type == "verification") {
    res.end();
    console.log(
      "TBA verification code: " + req.body.message_data.verification_key
    );
  } else {
    if (
      req.get("X-TBA-HMAC") &&
      crypto.timingSafeEqual(
        Buffer.from(req.get("X-TBA-HMAC"), "hex"),
        crypto
          .createHmac("sha256", process.env.tbaWebhookSecret)
          .update(req.rawBody.toString())
          .digest()
      )
    ) {
      next();
      console.log("Successfully validated TBA webhook.");
    } else {
      res.status(400).send("Error validating TBA request.");
    }
  }
};
