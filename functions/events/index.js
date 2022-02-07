const middy = require("@middy/core");
const ssm = require("@middy/ssm");
const {
  getEventOperation,
  listEventsOperation,
  searchEventsOperation,
  createEventOperation,
  updateEventOperation,
  deleteEventOperation,
} = require("./utils/operations");

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
      getEvent: async (ctx, session) => {
        const {
          arguments: { id, sectionId },
          identity: {
            claims: { sub },
          },
        } = ctx;

        try {
          const event = await getEventOperation(id, sectionId, sub, session);

          return event;
        } catch (error) {
          throw new Error(error);
        }
      },
      listEvents: async (ctx, session) => {
        const {
          arguments: { sectionId },
          identity: {
            claims: { sub },
          },
        } = ctx;

        try {
          const events = await listEventsOperation(sectionId, sub, session);

          return events;
        } catch (error) {
          throw new Error(error);
        }
      },
      searchEvents: async (ctx, session) => {
        const {
          arguments: { sectionId, value },
          identity: {
            claims: { sub },
          },
        } = ctx;

        try {
          const events = await searchEventsOperation(
            sectionId,
            value,
            sub,
            session
          );

          return events;
        } catch (error) {
          throw new Error(error);
        }
      },
    },
    Mutation: {
      createEvent: async (ctx, session) => {
        const {
          arguments: { input },
          identity: {
            claims: { sub },
          },
        } = ctx;

        try {
          await createEventOperation(input, sub, session);

          return true;
        } catch (error) {
          throw new Error(error);
        }
      },
      updateEvent: async (ctx, session) => {
        const {
          arguments: { input },
          identity: {
            claims: { sub },
          },
        } = ctx;

        try {
          await updateEventOperation(input, sub, session);

          return true;
        } catch (error) {
          throw new Error(error);
        }
      },
      deleteEvent: async (ctx, session) => {
        const {
          arguments: { input },
          identity: {
            claims: { sub },
          },
        } = ctx;

        try {
          await deleteEventOperation(input, sub, session);

          return true;
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
