const currentDate = new Date().toJSON();

const getSectionOperation = async (id, subId, session) => {
  try {
    const result = await session.run(
      `
      MATCH (user:USER) - [:OWNS] -> (section:SECTION)
      WHERE user.subId = $subId AND ID(section) = $sectionId
      RETURN section
      `,
      { subId, sectionId: parseInt(id, 10) }
    );

    const record = result.records[0];
    const node = record.get(0);

    return {
      ...node.properties,
      id: node.identity.low,
    };
  } catch (error) {
    throw new Error(error);
  }
};

const listSectionsOperation = async (subId, session) => {
  try {
    const result = await session.run(
      `
      MATCH (user:USER) - [:OWNS] -> (sections:SECTION)
      WHERE user.subId = $subId
      RETURN sections
      ORDER BY sections.createdAt
      `,
      { subId }
    );

    // TODO: FIX THIS

    const records =
      result.records
        .map((record) => record.get(0))
        .map((record) => ({ ...record.properties, id: record.identity.low })) ||
      [];

    console.log(records);

    return records;
  } catch (error) {
    throw new Error(error);
  }
};

const createSectionOperation = async (input, subId, session) => {
  try {
    const result = await session.run(
      `
      MATCH (user:USER)
      WHERE user.subId = $subId
      CREATE (user) - [:OWNS] -> (section:SECTION {name: $sectionName, createdAt: $createdAt, updatedAt: $updatedAt})
      RETURN section
      `,
      {
        subId,
        sectionName: input.name,
        createdAt: currentDate,
        updatedAt: currentDate,
      }
    );

    return result.records;
  } catch (error) {
    throw new Error(error);
  }
};

const updateSectionOperation = async (input, subId, session) => {
  try {
    const result = await session.run(
      `
      MATCH (user:USER) - [:OWNS] -> (section:SECTION)
      WHERE user.subId = $subId AND ID(section) = $sectionId
      SET section.name = $sectionName, section.updatedAt = $updatedAt
      RETURN section
      `,
      {
        subId,
        sectionId: parseInt(input.id, 10),
        sectionName: input.name,
        updatedAt: currentDate,
      }
    );

    return result.records;
  } catch (error) {
    throw new Error(error);
  }
};

const deleteSectionOperation = async (input, subId, session) => {
  try {
    const listPublicationsFromSection = await session.run(
      `
      MATCH (user:USER)
      MATCH (section:SECTION) - [:CREATED] -> (publications:PUBLICATION)
      WHERE user.subId = $subId AND ID(section) = $sectionId
      RETURN publications
      `,
      { subId, sectionId: parseInt(input.id, 10) }
    );

    if (listPublicationsFromSection?.records?.length > 0) {
      throw new Error("Your section has publications.");
    }

    const result = await session.run(
      `
      MATCH (section:SECTION)
      WHERE ID(section) = $sectionId
      DETACH DELETE section
      `,
      {
        sectionId: parseInt(input.id, 10),
      }
    );

    return result.records;
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = {
  getSectionOperation,
  listSectionsOperation,
  createSectionOperation,
  updateSectionOperation,
  deleteSectionOperation,
};
