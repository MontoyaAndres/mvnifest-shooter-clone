const middy = require("@middy/core");
const ssm = require("@middy/ssm");
const { getUserOperation } = require("./utils/operations");

const { initNeo4j } = require("/opt/nodejs/connection");

const { NODE_ENV } = process.env;

exports.handler = middy(async (event, context) => {
  const {
    NEO4J_CONNECTION_URI,
    NEO4J_CONNECTION_USERNAME,
    NEO4J_CONNECTION_PASSWORD,
  } = context;

  const resolvers = {
    Query: {
      getUser: async (ctx, session) => {
        const {
          arguments: { id },
          identity: {
            claims: { sub },
          },
        } = ctx;
        const userId = id || sub;

        try {
          const user = await getUserOperation(userId, session);

          return user;
        } catch (error) {
          throw new Error(error);
        }
      },
    },
  };

  const typeHandler = resolvers[event.info.parentTypeName];

  if (typeHandler) {
    const resolver = typeHandler[event.info.fieldName];

    const session = initNeo4j(
      NEO4J_CONNECTION_URI,
      NEO4J_CONNECTION_USERNAME,
      NEO4J_CONNECTION_PASSWORD
    );

    if (resolver) {
      return await resolver(event, session);
    }
  }

  throw new Error("Resolver not found.");
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
