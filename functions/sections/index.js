const middy = require("@middy/core");
const ssm = require("@middy/ssm");
const {
  getSectionOperation,
  listSectionsOperation,
  createSectionOperation,
  updateSectionOperation,
  deleteSectionOperation,
  getUserOnSection,
  listPublicationsOnSection,
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
      getSection: async (ctx, session) => {
        const {
          arguments: { id },
          identity: {
            claims: { sub },
          },
        } = ctx;

        try {
          const section = await getSectionOperation(id, sub, session);

          return section;
        } catch (error) {
          throw new Error(error);
        }
      },
      listSections: async (ctx, session) => {
        const {
          identity: {
            claims: { sub },
          },
        } = ctx;

        try {
          const sections = await listSectionsOperation(sub, session);

          return sections;
        } catch (error) {
          throw new Error(error);
        }
      },
    },
    Mutation: {
      createSection: async (ctx, session) => {
        const {
          arguments: { input },
          identity: {
            claims: { sub },
          },
        } = ctx;

        try {
          await createSectionOperation(input, sub, session);

          return true;
        } catch (error) {
          throw new Error(error);
        }
      },
      updateSection: async (ctx, session) => {
        const {
          arguments: { input },
          identity: {
            claims: { sub },
          },
        } = ctx;

        try {
          await updateSectionOperation(input, sub, session);

          return true;
        } catch (error) {
          throw new Error(error);
        }
      },
      deleteSection: async (ctx, session) => {
        const {
          arguments: { input },
          identity: {
            claims: { sub },
          },
        } = ctx;

        try {
          await deleteSectionOperation(input, sub, session);

          return true;
        } catch (error) {
          throw new Error(error);
        }
      },
    },
    Section: {
      user: async (ctx, session) => {
        const { source } = ctx;

        try {
          const user = await getUserOnSection(source, session);

          return user;
        } catch (error) {
          throw new Error(error);
        }
      },
      publications: async (ctx, session) => {
        const { source } = ctx;

        try {
          const publications = await listPublicationsOnSection(source, session);

          return publications;
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
