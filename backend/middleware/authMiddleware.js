const { verifyToken } = require("../utils/jwt");

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const headerToken =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;
  const queryToken =
    req.query && typeof req.query.token === "string" ? req.query.token : null;
  const token = headerToken || queryToken;

  if (!token) {
    return res.status(401).json({ message: "No autorizado" });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Token inválido" });
  }
}

function adminMiddleware(req, res, next) {
  if (!req.user || req.user.rol !== "ADMIN") {
    return res.status(403).json({ message: "Requiere rol ADMIN" });
  }
  return next();
}

module.exports = { authMiddleware, adminMiddleware };
