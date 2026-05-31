const toBool = (value) => String(value || "").toLowerCase() === "true";

function isNeo4jUsersEnabled() {
  return toBool(process.env.NEO4J_USERS_ENABLED);
}

function isNeo4jMediaEnabled() {
  return toBool(process.env.NEO4J_MEDIA_ENABLED);
}

function isNeo4jAdminEnabled() {
  return toBool(process.env.NEO4J_ADMIN_ENABLED);
}

function isNeo4jUploadsEnabled() {
  return toBool(process.env.NEO4J_UPLOADS_ENABLED);
}

module.exports = {
  isNeo4jUsersEnabled,
  isNeo4jMediaEnabled,
  isNeo4jAdminEnabled,
  isNeo4jUploadsEnabled,
};
