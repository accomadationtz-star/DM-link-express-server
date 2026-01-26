const sanitizeBody = body => {
  if (!body || typeof body !== "object") return body;
  const clone = { ...body };
  if (clone.password) clone.password = "[REDACTED]";
  if (clone.confirmPassword) clone.confirmPassword = "[REDACTED]";
  return clone;
};

const requestLogger = (req, res, next) => {
  const start = Date.now();
  const { method, originalUrl } = req;
  const bodyPreview = sanitizeBody(req.body);
  console.log(
    `[REQ] ${new Date().toISOString()} ${method} ${originalUrl} body=`,
    bodyPreview
  );

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[RES] ${new Date().toISOString()} ${method} ${originalUrl} -> ${res.statusCode} (${duration}ms)`
    );
  });

  next();
};

export default requestLogger;



