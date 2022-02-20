const currentDate = new Date().toJSON();

const getPublicationOperation = async (id, sectionId, subId, session) => {
  try {
    const result = await session.run(
      `
      MATCH (user:USER) - [:OWNS] -> (section:SECTION) - [:CREATES_PUBLICATION] -> (publication:PUBLICATION)
      WHERE user.subId = $subId AND ID(section) = $sectionId AND ID(publication) = $publicationId
      RETURN publication
      `,
      {
        subId,
        sectionId: parseInt(sectionId, 10),
        publicationId: parseInt(id, 10),
      }
    );

    const record = result.records[0];
    const node = record.get(0);

    return {
      ...node.properties,
      id: node.identity.low,
      metadata: JSON.parse(node.properties.metadata),
    };
  } catch (error) {
    throw new Error(error);
  }
};

const listPublicationsOperation = async (sectionId, subId, session) => {
  try {
    const result = await session.run(
      `
      MATCH (user:USER) - [:OWNS] -> (section:SECTION) - [:CREATES_PUBLICATION] -> (publications:PUBLICATION)
      WHERE user.subId = $subId AND ID(section) = $sectionId
      RETURN publications
      ORDER BY publications.createdAt DESC
      `,
      {
        subId,
        sectionId: parseInt(sectionId, 10),
      }
    );

    const records =
      result.records.map((record) => {
        let currentRecord = record.get(0);

        return {
          ...currentRecord.properties,
          id: currentRecord.identity.low,
          metadata: JSON.parse(currentRecord.properties.metadata),
        };
      }) || [];

    return records;
  } catch (error) {
    throw new Error(error);
  }
};

const searchPublicationsOperation = async (
  sectionId,
  value,
  subId,
  session
) => {
  try {
    const result = await session.run(
      `
      MATCH (user:USER) - [:OWNS] -> (section:SECTION)
      WHERE user.subId = $subId AND ID(section) = $sectionId
      CALL db.index.fulltext.queryNodes("publications_Title_SubTitle_Tags", $searchValue)
      YIELD node
      RETURN node
      `,
      {
        subId,
        sectionId: parseInt(sectionId, 10),
        searchValue: value,
      }
    );

    const records =
      result.records.map((record) => {
        let currentRecord = record.get(0);

        return {
          ...currentRecord.properties,
          id: currentRecord.identity.low,
          metadata: JSON.parse(currentRecord.properties.metadata),
        };
      }) || [];

    return records;
  } catch (error) {
    throw new Error(error);
  }
};

const createPublicationOperation = async (input, subId, session) => {
  try {
    const getSection = await session.run(
      `
      MATCH (user:USER) - [:OWNS] -> (section:SECTION)
      WHERE user.subId = $subId AND ID(section) = $sectionId
      RETURN section
      `,
      { subId, sectionId: parseInt(input.sectionId, 10) }
    );

    const sectionRecords = getSection.records;

    if (sectionRecords.length === 0) {
      throw new Error("Section not found.");
    }

    const createPublication = await session.run(
      `
      MATCH (section:SECTION)
      WHERE ID(section) = $sectionId
      CREATE (section) - [:CREATES_PUBLICATION] -> (publication:PUBLICATION {
        title: $publicationTitle,
        ${input.subtitle ? "subtitle: $publicationSubtitle," : ""}
        ${input.tags ? "tags: $publicationTags," : ""}
        description: $publicationDescription,
        image: $publicationImage,
        metadata: $publicationMetadata,
        isCompleted: $publicationIsCompleted,
        createdAt: $publicationCreatedAt,
        updatedAt: $publicationUpdatedAt
      })
      RETURN publication
    `,
      {
        sectionId: parseInt(input.sectionId, 10),
        publicationTitle: input.title,
        publicationSubtitle: input.subtitle,
        publicationTags: input.tags,
        publicationDescription: input.description,
        publicationImage: input.image,
        publicationMetadata: JSON.stringify(input.metadata),
        publicationIsCompleted: input.isCompleted || false,
        publicationCreatedAt: currentDate,
        publicationUpdatedAt: currentDate,
      }
    );

    return createPublication.records;
  } catch (error) {
    throw new Error(error);
  }
};

const updatePublicationOperation = async (input, subId, session) => {
  try {
    const currentPublication = await session.run(
      `
      MATCH (user:USER) - [:OWNS] -> (section:SECTION)
      MATCH (section) - [:CREATES_PUBLICATION] -> (publication:PUBLICATION)
        WHERE user.subId = $subId AND ID(section) = $sectionId AND ID(publication) = $publicationId
      RETURN publication
      `,
      {
        subId,
        sectionId: parseInt(input.sectionId, 10),
        publicationId: parseInt(input.id, 10),
      }
    );

    const publicationRecords = currentPublication.records;

    if (publicationRecords.length === 0) {
      throw new Error("Publication not found.");
    }

    const publication = publicationRecords[0].get(0).properties;

    const updatePublication = await session.run(
      `
      MATCH (user:USER) - [:OWNS] -> (section:SECTION)
      MATCH (section) - [oldR:CREATES_PUBLICATION] -> (prevPublication:PUBLICATION)
        WHERE user.subId = $subId AND ID(section) = $sectionId AND ID(prevPublication) = $publicationId
      DELETE oldR
      CREATE (newPublication:PUBLICATION {
        title: $publicationTitle,
        subtitle: $publicationSubtitle,
        tags: $publicationTags,
        description: $publicationDescription,
        image: $publicationImage,
        metadata: $publicationMetadata,
        isCompleted: $publicationIsCompleted,
        createdAt: $publicationCreatedAt,
        updatedAt: datetime()
      })
      MERGE (section) - [:CREATES_PUBLICATION] -> (newPublication)
      MERGE (newPublication) - [:PREV_PUBLICATION] -> (prevPublication)
        ON CREATE SET prevPublication.updatedAt = datetime()
      `,
      {
        subId,
        sectionId: parseInt(input.sectionId, 10),
        publicationId: parseInt(input.id, 10),
        publicationTitle: input.title || publication.title,
        publicationSubtitle: input.subtitle || publication.subtitle,
        publicationTags: input.tags || publication.tags,
        publicationDescription: input.description || publication.description,
        publicationImage: input.image || publication.image,
        publicationMetadata: input.metadata || publication.metadata,
        publicationIsCompleted: input.isCompleted || publication.isCompleted,
        publicationCreatedAt: publication.createdAt,
      }
    );

    return updatePublication.records;
  } catch (error) {
    throw new Error(error);
  }
};

const deletePublicationOperation = async (input, subId, session) => {
  try {
    const result = await session.run(
      `
      MATCH (user:USER) - [:OWNS] -> (section:SECTION) - [:CREATES_PUBLICATION] -> (publication:PUBLICATION)
      WHERE user.subId = $subId AND ID(section) = $sectionId AND ID(publication) = $publicationId
      SET publication.deletedAt = $publicationDeletedAt
      RETURN publication
      `,
      {
        subId,
        sectionId: parseInt(input.sectionId, 10),
        publicationId: parseInt(input.id, 10),
        publicationDeletedAt: currentDate,
      }
    );

    return result.records;
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = {
  getPublicationOperation,
  listPublicationsOperation,
  searchPublicationsOperation,
  createPublicationOperation,
  updatePublicationOperation,
  deletePublicationOperation,
};
