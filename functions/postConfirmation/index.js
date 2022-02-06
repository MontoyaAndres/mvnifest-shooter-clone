const middy = require("@middy/core");
const ssm = require("@middy/ssm");

const { initNeo4j } = require("/opt/nodejs/connection");

const { NODE_ENV } = process.env;

exports.handler = middy(async (event, context) => {
  const {
    request: { userAttributes },
  } = event;

  try {
    const session = initNeo4j(
      context.NEO4J_CONNECTION_URI,
      context.NEO4J_CONNECTION_USERNAME,
      context.NEO4J_CONNECTION_PASSWORD
    );

    await session.run(
      `
      CREATE (:USER {email: $email, subId: $subId})
      `,
      {
        subId: userAttributes.sub,
        email: userAttributes.email,
      }
    );

    return event;
  } catch (error) {
    throw new Error(error);
  }
}).use(
  ssm({
    cacheExpiry: 5 * 60 * 1000, // 5 mins
    fetchData: {
      NEO4J_CONNECTION_URI: `/${NODE_ENV}/mvnifest-shooter/neo4j_connection_uri`,
      NEO4J_CONNECTION_USERNAME: `/${NODE_ENV}/mvnifest-shooter/neo4j_username`,
      NEO4J_CONNECTION_PASSWORD: `/${NODE_ENV}/mvnifest-shooter/neo4j_password`,
    },
    setToContext: true,
  })
);
