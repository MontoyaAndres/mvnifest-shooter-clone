const neo4j = require("neo4j-driver");

let currentSession;

const initNeo4j = (uri, username, password) => {
  if (currentSession) return currentSession;

  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  const session = driver.session();

  currentSession = session;

  return currentSession;
};

module.exports = {
  initNeo4j,
};
